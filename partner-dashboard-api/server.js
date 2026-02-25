require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();

/* ===============================
    🔒 BASIC HARDENING
================================ */
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// UUID v5 untuk consistent request ID (optional, tapi bagus untuk tracing)
const { v5: uuidv5 } = require('uuid');
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const normalize = (val) =>
  String(val ?? '')
    .trim()
    .toUpperCase();


/* =====================================================
    🔐 SYSTEM-TO-SYSTEM AUTH MIDDLEWARE
===================================================== */
function systemAuthMiddleware(req, res, next) {
  const token = req.headers['x-system-token'];
  if (token && token === process.env.SYSTEM_TOKEN) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized system access' });
  }
}

function validateClientFilter(req, res, next) {
  const selectedClient = req.query.client;
  if (selectedClient) {
    const allowedClients = db.clients.map((c) => c.name);
    const requested = selectedClient.split(',').map((c) => c.trim());
    const invalid = requested.filter((c) => !allowedClients.includes(c));
    if (invalid.length > 0) return res.status(400).json({ message: 'Invalid client filter' });
  }
  next();
}

/* =====================================================
    📊 DASHBOARD ROUTES (PROTECTED)
===================================================== */

// 1️⃣ Endpoint Utama Dashboard (Full Ticket Table)
app.get('/api/dashboard', systemAuthMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT user_name, request_no,
             SUBSTRING(user_summary, 1, 8000) AS user_summary,
             request_status, request_time,
             ISNULL(completed_time, 0) AS completed_time
      FROM HD_REQUEST`;

    let combinedData = await db.queryAllServers('helpdesk', query);

    combinedData = combinedData.map(row => ({
      ...row,
      uuid: uuidv5(normalize(row.request_no), NAMESPACE)
    }));

    combinedData.sort((a, b) => Number(b.request_time) - Number(a.request_time));

    res.json(combinedData);

  } catch (err) {
    res.status(500).json({
      message: 'Data Retrieval Failed',
      error: err.message
    });
  }
});

app.get('/api/dashboard/detail/:uuid', systemAuthMiddleware, async (req, res) => {
  try {
    const { uuid } = req.params;

    console.log("===== DEBUG START =====");
    console.log("Incoming UUID:", uuid);

    const query = `
      SELECT user_name, request_no,
             SUBSTRING(user_summary, 1, 8000) AS user_summary,
             request_status, request_time,
             ISNULL(completed_time, 0) AS completed_time
      FROM HD_REQUEST`;

    let combinedData = await db.queryAllServers('helpdesk', query);

    console.log("Total Records:", combinedData.length);

    if (combinedData.length > 0) {
      const sampleUuid = uuidv5(
        normalize(combinedData[0].request_no),
        NAMESPACE
      );

      console.log("First request_no:", combinedData[0].request_no);
      console.log("Generated UUID for first row:", sampleUuid);
    }

    console.log("===== DEBUG END =====");

    const ticket = combinedData.find(row =>
      uuidv5(normalize(row.request_no), NAMESPACE) === uuid
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// 2️⃣ Endpoint Hirarki Projek
app.get('/api/dashboard/hierarchy', systemAuthMiddleware, (req, res) => {
  res.json(db.projects);
});

// 3️⃣ Summary (KPI)
app.get('/api/dashboard/summary', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    const selectedClient = req.query.client;
    const query = `SELECT request_status, request_time, completed_time FROM HD_REQUEST`;
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);
    const now = Math.floor(Date.now() / 1000);
    const summary = results.reduce(
      (acc, curr) => {
        const status = Number(curr.request_status ?? 0);
        let reqTime = Number(curr.request_time ?? 0);
        let compTime = Number(curr.completed_time ?? 0);
        if (reqTime > 9999999999) reqTime = Math.floor(reqTime / 1000);
        if (compTime > 9999999999) compTime = Math.floor(compTime / 1000);
        const endTime = compTime > 0 ? compTime : now;
        const daysElapsed = Math.floor((endTime - reqTime) / 86400);
        if (status === 0) acc.openTotal++;
        if (status === 1) acc.pendingTotal++;
        if (status === 2) acc.solvedTotal++;
        if (status !== 2 && daysElapsed > 7) acc.lapsedTotal++;
        return acc;
      },
      { openTotal: 0, pendingTotal: 0, solvedTotal: 0, lapsedTotal: 0 },
    );
    summary.masa_update = new Date().toLocaleTimeString();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Summary Error', error: err.message });
  }
});

// 4️⃣ Total Assets (FIXED: UNION TCO & TCO3)
app.get('/api/assets/total', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';
    const queryStr = `
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql + CASE WHEN @sql <> '' THEN ' UNION ALL ' ELSE '' END + 
      'SELECT COUNT(object_root_idn) as count FROM ' + QUOTENAME(name) + '.dbo.TS_OBJECT_ROOT'
      FROM sys.databases WHERE name IN ('TCO', 'TCO3');
      IF @sql <> '' EXEC sp_executesql @sql;
      ELSE SELECT 0 as count;`;
    const results = await db.querySpecificServers('tco', queryStr, selectedClient);
    const totalAssets = results.reduce((sum, row) => sum + (row.count || 0), 0);
    res.json({ totalAssets });
  } catch (err) {
    res.status(500).json({ message: 'Asset fetch failed', error: err.message });
  }
});

// 5️⃣ Clients List
app.get('/api/dashboard/clients', systemAuthMiddleware, (req, res) => {
  res.json(
    db.clients.map((c) => ({
      id: c.name,
      label: c.type === 'project' ? `Project: ${c.name}` : `Client: ${c.name}`,
    })),
  );
});

// 6️⃣ Top Faulty Assets (FIXED: UNION TCO & TCO3)
app.get('/api/assets/top-faults', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    const selectedClient = req.query.client;
    const dbH = process.env.DB_NAME_HELPDESK;
    const query = `
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql = @sql + CASE WHEN @sql <> '' THEN ' UNION ALL ' ELSE '' END + 
        'SELECT b.model, a.request_no FROM [${dbH}].[dbo].[HD_REQUEST] a INNER JOIN ' + QUOTENAME(name) + '.[dbo].[TS_OBJECT_ROOT] b ON LTRIM(RTRIM(a.user_sn)) = LTRIM(RTRIM(b.object_root_idn)) WHERE b.model NOT LIKE ''%VMware%'''
        FROM sys.databases WHERE name IN ('TCO', 'TCO3');
        IF @sql <> '' BEGIN
          SET @sql = 'WITH RawFaults AS (' + @sql + '), FaultCounts AS (SELECT ISNULL(model, ''UNKNOWN'') AS name, COUNT(request_no) AS fault_count FROM RawFaults GROUP BY model), TotalCount AS (SELECT SUM(fault_count) as grand_total FROM FaultCounts) SELECT TOP 5 f.name, f.fault_count, CAST((f.fault_count * 100.0 / NULLIF(t.grand_total, 0)) AS INT) AS rate FROM FaultCounts f, TotalCount t ORDER BY f.fault_count DESC';
          EXEC sp_executesql @sql;
        END`;
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7️⃣ Brand Aging Analysis (Logic asal dngn Dynamic Union)
app.get('/api/assets/brand-aging', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    let selectedClient = req.query.client || '';
    selectedClient = selectedClient.replace('Project: ', '').trim();
    const query = `
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql + CASE WHEN @sql <> '' THEN ' UNION ALL ' ELSE '' END + 
      'SELECT CASE 
                WHEN UPPER(a.MadeCompany) LIKE ''%HP%'' OR UPPER(a.MadeCompany) LIKE ''%HEWLETT%'' OR UPPER(a.MadeCompany) LIKE ''%COMPAQ%'' THEN ''HP''
                WHEN UPPER(a.MadeCompany) LIKE ''%DELL%'' THEN ''DELL''
                WHEN UPPER(a.MadeCompany) LIKE ''%LENOVO%'' OR UPPER(a.MadeCompany) LIKE ''%THINKPAD%'' THEN ''LENOVO''
                WHEN UPPER(a.MadeCompany) LIKE ''%ASUS%'' THEN ''ASUS''
                WHEN UPPER(a.MadeCompany) LIKE ''%ACER%'' OR UPPER(a.MadeCompany) LIKE ''%PREDATOR%'' THEN ''ACER''
                WHEN UPPER(a.MadeCompany) LIKE ''%APPLE%'' OR UPPER(a.MadeCompany) LIKE ''%MACBOOK%'' THEN ''APPLE''
                WHEN UPPER(a.MadeCompany) LIKE ''%MSI%'' THEN ''MSI''
                WHEN UPPER(a.MadeCompany) LIKE ''%RAZER%'' THEN ''RAZER''
                WHEN UPPER(a.MadeCompany) LIKE ''%GIGABYTE%'' OR UPPER(a.MadeCompany) LIKE ''%AORUS%'' THEN ''GIGABYTE''
                WHEN UPPER(a.MadeCompany) LIKE ''%SAMSUNG%'' THEN ''SAMSUNG''
                WHEN UPPER(a.MadeCompany) LIKE ''%MICROSOFT%'' OR UPPER(a.MadeCompany) LIKE ''%SURFACE%'' THEN ''MICROSOFT''
                WHEN UPPER(a.MadeCompany) LIKE ''%HUAWEI%'' OR UPPER(a.MadeCompany) LIKE ''%MATEBOOK%'' THEN ''HUAWEI''
          ELSE ''OTHERS'' 
       END AS name, ISNULL(DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()), 3) AS Age FROM ' + QUOTENAME(name) + '.dbo.TS_OBJECT_ROOT a LEFT JOIN ' + QUOTENAME(name) + '.dbo.ts_client_info tci ON a.Object_root_idn = tci.Object_root_idn LEFT JOIN (SELECT Object_Root_Idn, MAX(Object_Value_Idn) as MaxValId FROM ' + QUOTENAME(name) + '.dbo.TSHI_OBJECT_CURRENT WHERE Object_Field_Idn = 14 GROUP BY Object_Root_Idn) cf ON a.Object_Root_Idn = cf.Object_Root_Idn LEFT JOIN ' + QUOTENAME(name) + '.dbo.TSHI_OBJECT_VALUE v ON cf.MaxValId = v.Object_Value_Idn WHERE a.MadeCompany NOT LIKE ''%VMware%'''
      FROM sys.databases WHERE name IN ('TCO', 'TCO3');
      IF @sql <> '' EXEC sp_executesql @sql;`;
    const rawResults = await db.querySpecificServers('tco', query, selectedClient);
    const brandMap = {};
    rawResults.forEach((curr) => {
      const bName = curr.name;
      if (!brandMap[bName]) brandMap[bName] = { name: bName, total: 0, n: 0, s: 0, ag: 0, c: 0 };
      brandMap[bName].total += 1;
      if (curr.Age < 1) brandMap[bName].n += 1;
      else if (curr.Age <= 2) brandMap[bName].s += 1;
      else if (curr.Age === 3) brandMap[bName].ag += 1;
      else brandMap[bName].c += 1;
    });
    const finalResults = Object.values(brandMap)
      .filter((b) => b.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((b) => ({
        name: b.name, total: b.total,
        new: Math.round((b.n * 100) / b.total),
        standard: Math.round((b.s * 100) / b.total),
        aging: Math.round((b.ag * 100) / b.total),
        critical: Math.round((b.c * 100) / b.total),
      }));
    res.json(finalResults);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8️⃣ Asset Summary (DAH FIX: Dynamic Sector Mapping dari .env)
app.get('/api/assets/summary', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';
    
    // 1. Ambil senarai sektor dari .env
    const glcList = (process.env.SECTOR_GLC || '').split(',').map(s => s.trim());
    const fsiList = (process.env.SECTOR_FSI || '').split(',').map(s => s.trim());
    const govList = (process.env.SECTOR_GOV || '').split(',').map(s => s.trim());
    const eduList = (process.env.SECTOR_EDU || '').split(',').map(s => s.trim());

    // 2. Query Union TCO & TCO3
    const query = `
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql + CASE WHEN @sql <> '' THEN ' UNION ALL ' ELSE '' END + 
      'SELECT COUNT(*) AS totalAsset, COUNT(CASE WHEN MachineType = ''Desktop'' THEN 1 END) AS desktop, COUNT(CASE WHEN MachineType = ''Laptop'' THEN 1 END) AS laptop, COUNT(CASE WHEN MachineType = ''Server'' THEN 1 END) AS server, COUNT(CASE WHEN (MachineType NOT IN (''Desktop'',''Laptop'',''Server'') OR MachineType IS NULL) THEN 1 END) AS others FROM ' + QUOTENAME(name) + '.dbo.TS_OBJECT_ROOT a LEFT JOIN ' + QUOTENAME(name) + '.dbo.ts_client_info tci ON a.Object_root_idn = tci.Object_root_idn'
      FROM sys.databases WHERE name IN ('TCO', 'TCO3');
      IF @sql <> '' EXEC sp_executesql @sql;`;

    const results = await db.querySpecificServers('tco', query, selectedClient);

    // 3. Gabungkan data mengikut Sektor secara Dinamik
    const combined = results.reduce(
      (acc, curr) => {
        const total = curr.totalAsset || 0;
        acc.totalAsset += total;
        acc.desktop += curr.desktop || 0;
        acc.laptop += curr.laptop || 0;
        acc.server += curr.server || 0;
        acc.others += curr.others || 0;

        // ✅ Check serverId dngn list sektor dlm .env
        const sId = curr.serverId; 
        if (glcList.includes(sId)) acc.glc += total;
        else if (fsiList.includes(sId)) acc.fsi += total;
        else if (govList.includes(sId)) acc.gov += total;
        else if (eduList.includes(sId)) acc.edu += total;

        return acc;
      },
      { totalAsset: 0, desktop: 0, laptop: 0, server: 0, others: 0, glc: 0, fsi: 0, gov: 0, edu: 0 },
    );
    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));