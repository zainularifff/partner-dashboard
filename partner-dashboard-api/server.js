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

// UUID v5 untuk consistent request ID
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
    📊 DASHBOARD ROUTES (ASAL - TIADA PERUBAHAN)
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

    combinedData = combinedData.map((row) => ({
      ...row,
      uuid: uuidv5(normalize(row.request_no), NAMESPACE),
    }));

    combinedData.sort((a, b) => Number(b.request_time) - Number(a.request_time));

    res.json(combinedData);
  } catch (err) {
    res.status(500).json({
      message: 'Data Retrieval Failed',
      error: err.message,
    });
  }
});

app.get('/api/dashboard/detail/:uuid', systemAuthMiddleware, async (req, res) => {
  try {
    const { uuid } = req.params;
    const query = `
      SELECT user_name, request_no,
             SUBSTRING(user_summary, 1, 8000) AS user_summary,
             request_status, request_time,
             ISNULL(completed_time, 0) AS completed_time
      FROM HD_REQUEST`;

    let combinedData = await db.queryAllServers('helpdesk', query);

    const ticket = combinedData.find(
      (row) => uuidv5(normalize(row.request_no), NAMESPACE) === uuid,
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
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

// 4️⃣ Total Assets
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

// 6️⃣ Top Faulty Assets
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

// 7️⃣ Brand Aging Analysis
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
        name: b.name,
        total: b.total,
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

// 8️⃣ Incident Trend Analysis
app.get('/api/incidents/trend', async (req, res) => {
  try {
    const { type, client, year, month } = req.query;
    let conditions = [];
    switch (type) {
      case 'open':
        conditions.push('request_status = 0');
        break;
      case 'pending':
        conditions.push('request_status IN (1, 10, 11, 12, 13)');
        break;
      case 'solved':
        conditions.push('request_status = 2');
        break;
      case 'lapsed':
        conditions.push(
          "request_status NOT IN (2, 14) AND DATEDIFF(DAY, DATEADD(SECOND, request_time, '1970-01-01'), GETDATE()) > 7",
        );
        break;
      default:
        conditions.push('1=1');
    }
    let dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'yyyy')";
    const isAllYear = !year || year === 'All' || year === 'All Year';
    if (!isAllYear) {
      conditions.push(`YEAR(DATEADD(SECOND, request_time, '1970-01-01')) = ${year}`);
      dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'MMM')";
      if (month && month !== 'All') {
        conditions.push(`MONTH(DATEADD(SECOND, request_time, '1970-01-01')) = ${month}`);
        dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'dd MMM')";
      }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT ${dateSelect} AS date, COUNT(*) AS count, 
             MIN(DATEADD(SECOND, request_time, '1970-01-01')) as sort_key
      FROM HD_REQUEST 
      ${whereClause}
      GROUP BY ${dateSelect} 
      ORDER BY sort_key ASC`;
    const rawResults = await db.querySpecificServers('helpdesk', query, client || '');
    const aggregated = rawResults.reduce((acc, curr) => {
      const label = curr.date;
      if (!acc[label]) {
        acc[label] = { date: label, count: 0, sortTime: new Date(curr.sort_key).getTime() };
      }
      acc[label].count += Number(curr.count || 0);
      return acc;
    }, {});
    const finalTrend = Object.values(aggregated).sort((a, b) => a.sortTime - b.sortTime);
    res.json(finalTrend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9️⃣ Years Filter
app.get('/api/incidents/years', async (req, res) => {
  try {
    const query = `SELECT DISTINCT YEAR(DATEADD(SECOND, request_time, '1970-01-01')) AS year FROM HD_REQUEST ORDER BY year DESC`;
    const results = await db.queryAllServers('helpdesk', query);
    const uniqueYears = [...new Set(results.map((r) => r.year.toString()))];
    res.json(uniqueYears);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔟 Asset Summary
app.get('/api/assets/summary', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';
    
    // 1. Ambil list sektor dari .env
    const glcList = (process.env.SECTOR_GLC || '').toUpperCase().split(',').map(s => s.trim());
    const fsiList = (process.env.SECTOR_FSI || '').toUpperCase().split(',').map(s => s.trim());
    const govList = (process.env.SECTOR_GOV || '').toUpperCase().split(',').map(s => s.trim());
    const eduList = (process.env.SECTOR_EDU || '').toUpperCase().split(',').map(s => s.trim());

    // 2. Query Mentah: Tarik status MachineType sahaja dari semua server
    const query = `
      SELECT 
        a.MadeCompany,
        ISNULL(c.MachineType, 'DEVICES') AS Machine_Type
      FROM TS_OBJECT_ROOT a 
      LEFT JOIN ts_client_info c ON a.Object_root_idn = c.Object_root_idn`;

    // 🚀 Tarik dari SEMUA server dulu (TCO & TCO3)
    const allResults = await db.queryAllServers('tco', query);
    
    console.log(`📡 [DEBUG] Memproses ${allResults.length} data mentah dari semua database.`);

    // 3. Logik Penapisan Manual (Sama mcm individual-details)
    const combined = allResults.reduce(
      (acc, curr) => {
        // Tapis berdasarkan client filter kalau ada
        if (selectedClient) {
            const requested = selectedClient.split(',').map(c => c.trim().toUpperCase());
            const isMatch = requested.includes(curr.serverId?.toUpperCase()) || 
                            requested.includes(curr.projectName?.toUpperCase());
            if (!isMatch) return acc; 
        }

        // Kira jumlah keseluruhan
        acc.totalAsset++;

        // Kira Machine Type
        const type = (curr.Machine_Type || '').toUpperCase();
        if (type.includes('DESKTOP')) acc.desktop++;
        else if (type.includes('LAPTOP') || type.includes('NOTEBOOK')) acc.laptop++;
        else if (type.includes('SERVER')) acc.server++;
        else acc.others++;

        // Kira Sektor (Mapping berdasarkan serverId atau projectName)
        const sId = (curr.serverId || '').toUpperCase();
        const pName = (curr.projectName || '').toUpperCase();

        if (glcList.includes(sId) || glcList.includes(pName)) acc.glc++;
        else if (fsiList.includes(sId) || fsiList.includes(pName)) acc.fsi++;
        else if (govList.includes(sId) || govList.includes(pName)) acc.gov++;
        else if (eduList.includes(sId) || eduList.includes(pName)) acc.edu++;
        
        return acc;
      },
      { totalAsset: 0, desktop: 0, laptop: 0, server: 0, others: 0, glc: 0, fsi: 0, gov: 0, edu: 0 }
    );

    console.log(`✅ Summary berjaya dijana: ${combined.totalAsset} Assets.`);
    res.json(combined);

  } catch (err) {
    console.error('❌ Summary Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 1️⃣1️⃣ Brand Hierarchy (Versi Baru)
app.get('/api/assets/brand-hierarchy-new', async (req, res) => {
  try {
    const brand = req.query.brand || 'ASUS';
    
    const query = `
      DECLARE @sql NVARCHAR(MAX) = '';

      -- Cari dlm semua database yang ada dlm senarai IN ('TCO', 'TCO3')
      SELECT @sql = @sql + CASE WHEN @sql <> '' THEN ' UNION ALL ' ELSE '' END + 
      'SELECT 
          c.MachineType AS machineType,
          a.MadeCompany AS modelName,
          CASE 
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
          END AS brandGroup,
          ISNULL(DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()), 3) AS Age
       FROM ' + QUOTENAME(name) + '.dbo.TS_OBJECT_ROOT a
       JOIN ' + QUOTENAME(name) + '.dbo.TS_CLIENT_INFO c ON a.Object_Root_Idn = c.Object_Root_Idn
       LEFT JOIN (
          SELECT Object_Root_Idn, MAX(Object_Value_Idn) as MaxValId 
          FROM ' + QUOTENAME(name) + '.dbo.TSHI_OBJECT_CURRENT 
          WHERE Object_Field_Idn = 14 
          GROUP BY Object_Root_Idn
       ) cf ON a.Object_Root_Idn = cf.Object_Root_Idn
       LEFT JOIN ' + QUOTENAME(name) + '.dbo.TSHI_OBJECT_VALUE v ON cf.MaxValId = v.Object_Value_Idn
       WHERE UPPER(a.MadeCompany) LIKE UPPER(''%${brand}%'')'
      FROM sys.databases 
      WHERE name IN ('TCO', 'TCO3'); -- Tarik dua-dua database dlm satu query

      IF @sql <> '' EXEC sp_executesql @sql;
    `;

    // db.querySpecificServers akan suntik projectName & serverId secara automatik
    const results = await db.querySpecificServers('tco', query, '');
    res.json(results);
  } catch (err) {
    console.error('❌ [API ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 1️⃣2️⃣ Individual Asset Details (Versi Full Fix)
app.get('/api/assets/individual-details', async (req, res) => {
  try {
    const { project, type, brand } = req.query;

    console.log(`🔍 API CALL: Project=${project}, Brand=${brand}, Type=${type}`);

    // 1. SQL Query - Kita ambil semua data brand dlu, tapi kita tapis dngn brandGroup dlm Node.js
    const query = `
      SELECT 
          a.ComputerName,
          a.Object_Client_Name AS [Owner_Name],
          b.Object_Full_Name AS [Location_Department],
          ISNULL(c.MachineType, 'DEVICES') AS [Machine_Type],
          a.IP, a.RAM, a.CPU AS [Full_CPU_Name],
          a.MadeCompany AS [Manufacturer],
          DATEDIFF(day, a.ConnectionTime, GETDATE()) AS [Agent_Age_Days],
          CASE 
              WHEN DATEDIFF(day, a.ConnectionTime, GETDATE()) <= 90 THEN 'Active' 
              ELSE 'Inactive' 
          END AS [Agent_Status]
      FROM TS_OBJECT_ROOT a
      LEFT JOIN ts_object_relation b ON a.Object_rel_idn = b.Object_rel_idn
      LEFT JOIN ts_client_info c ON c.Object_root_idn = a.Object_root_idn
    `;

    const allResults = await db.queryAllServers('tco', query);

    // 2. 🛠️ STRICT FILTERING (Checking Level 3)
    const filtered = allResults.filter(item => {
      
      // ✅ A. Checking Brand (Sangat Penting!)
      // Kita guna logik yang sama mcm Brand Aging Analysis kau
      const manufacturer = item.Manufacturer ? item.Manufacturer.toUpperCase() : '';
      let currentBrandGroup = 'OTHERS';

      if (manufacturer.includes('ASUS')) currentBrandGroup = 'ASUS';
      else if (manufacturer.includes('HP') || manufacturer.includes('HEWLETT')) currentBrandGroup = 'HP';
      else if (manufacturer.includes('DELL')) currentBrandGroup = 'DELL';
      else if (manufacturer.includes('LENOVO')) currentBrandGroup = 'LENOVO';
      else if (manufacturer.includes('ACER')) currentBrandGroup = 'ACER';

      const matchBrand = brand ? (currentBrandGroup === brand.toUpperCase()) : true;

      // ✅ B. Checking Type (Desktop/Notebook/Laptop)
      const mType = item.Machine_Type.toLowerCase();
      const searchType = type ? type.toLowerCase() : '';
      
      // Handle 'Notebook' & 'Laptop' sebagai kategori yang sama dlm checking
      let matchType = true;
      if (searchType === 'notebook' || searchType === 'laptop') {
        matchType = mType.includes('notebook') || mType.includes('laptop');
      } else if (searchType) {
        matchType = mType.includes(searchType);
      }

      // ✅ C. Checking Project (FELDA/PETRONAS)
      const matchProject = project ? 
        (item.projectName?.toUpperCase().includes(project.toUpperCase()) || 
         item.serverId?.toUpperCase().includes(project.toUpperCase())) : true;

      return matchBrand && matchType && matchProject;
    });

    console.log(`✅ Filtered Result: ${filtered.length} rows (Brand Check Passed)`);
    res.json(filtered);

  } catch (err) {
    console.error('❌ Individual Details Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});



/* =====================================================
    🚀 START SERVER WITH HYBRID INITIALIZATION
===================================================== */
const PORT = process.env.PORT || 3000;

// Gunakan db.initConfig() untuk load Plan A (.env) atau Plan B (Master DB)
db.initConfig()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `📡 Connection Mode: ${process.env.USE_MASTER_DB === 'true' ? 'MASTER DB' : 'STATIC .ENV'}`,
      );
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
