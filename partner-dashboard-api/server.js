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

/* ===============================
    🚦 RATE LIMITER
================================ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* =====================================================
    🔐 SYSTEM-TO-SYSTEM AUTH MIDDLEWARE
===================================================== */
function systemAuthMiddleware(req, res, next) {
  const token = req.headers['x-system-token'];
  if (!token || token !== process.env.SYSTEM_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized system access' });
  }
  next();
}

/* =====================================================
    ✅ CLIENT FILTER VALIDATION (Dinamik dari db.js)
===================================================== */
function validateClientFilter(req, res, next) {
  const selectedClient = req.query.client;
  if (selectedClient) {
    const allowedClients = db.clients.map((c) => c.name);
    const requested = selectedClient.split(',').map((c) => c.trim());
    const invalid = requested.filter((c) => !allowedClients.includes(c));

    if (invalid.length > 0) {
      return res.status(400).json({ message: 'Invalid client filter' });
    }
  }
  next();
}

/* =====================================================
    📊 DASHBOARD ROUTES (PROTECTED)
===================================================== */

// 1️⃣ Endpoint Utama Dashboard (Full Ticket Table) - SEBELUM NI HILANG
app.get('/api/dashboard', systemAuthMiddleware, async (req, res) => {
  try {
    const query = `
        SELECT 
          user_name, 
          request_no, 
          SUBSTRING(user_summary, 1, 8000) AS user_summary, 
          request_status, 
          request_time,
          ISNULL(completed_time, 0) AS completed_time
        FROM HD_REQUEST
      `;

    // Tarik dari semua server helpdesk secara serentak
    let combinedData = await db.queryAllServers('helpdesk', query);

    // Sort ikut masa terbaru
    combinedData.sort((a, b) => Number(b.request_time) - Number(a.request_time));

    res.json(combinedData);
  } catch (err) {
    res.status(500).json({
      message: 'Data Retrieval Failed',
      error: err.message,
    });
  }
});

// 2️⃣ Endpoint Hirarki Projek (Untuk Frontend)
app.get('/api/dashboard/hierarchy', systemAuthMiddleware, (req, res) => {
  try {
    res.json(db.projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch hierarchy' });
  }
});

// 3️⃣ Summary (Open, Pending, Solved, Lapsed)
app.get('/api/dashboard/summary', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    const selectedClient = req.query.client;
    const query = `SELECT request_status, request_time, completed_time FROM HD_REQUEST`;
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);

    const now = Math.floor(Date.now() / 1000);
    const summary = results.reduce(
      (acc, curr) => {
        const sID = curr.serverId || 'Unknown';
        const status = Number(curr.request_status ?? 0);
        let reqTime = Number(curr.request_time ?? 0);
        let compTime = Number(curr.completed_time ?? 0);

        if (reqTime > 9999999999) reqTime = Math.floor(reqTime / 1000);
        if (compTime > 9999999999) compTime = Math.floor(compTime / 1000);

        const endTime = compTime > 0 ? compTime : now;
        const daysElapsed = Math.floor((endTime - reqTime) / 86400);

        if (status === 0) acc.openTotal++;
        if (status === 13) acc.pendingTotal++;
        if (status === 2) acc.solvedTotal++;
        if (status !== 2 && daysElapsed > 7) acc.lapsedTotal++;

        const serverKey = `open${sID}`;
        if (!acc[serverKey]) acc[serverKey] = 0;
        if (status === 0) acc[serverKey]++;

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
    // Jika req.query.client kosong, hantar string kosong '' supaya db.js tarik SEMUA
    const selectedClient = req.query.client || '';

    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';

    // Panggil querySpecificServers dengan filter yang betul
    const results = await db.querySpecificServers('tco', queryStr, selectedClient);

    // ✅ LOG DEBUG: Tengok kat terminal Node.js berapa banyak server yang dia jumpa
    console.log(`[ASSETS] Menambah data dari ${results.length} server recordsets`);

    const totalAssets = results.reduce((sum, row) => sum + (row.count || 0), 0);

    res.json({ totalAssets });
  } catch (err) {
    res.status(500).json({
      message: 'Asset fetch failed',
      error: err.message,
    });
  }
});

// 5️⃣ Clients List (Untuk Dropdown)
app.get('/api/dashboard/clients', systemAuthMiddleware, (req, res) => {
  try {
    const clientList = db.clients.map((c) => ({
      id: c.name,
      label: c.type === 'project' ? `Project: ${c.name}` : `Client: ${c.name}`,
    }));
    res.json(clientList);
  } catch (err) {
    res.status(500).json([]);
  }
});

// 6️⃣ Top Faulty Assets
app.get('/api/assets/top-faults', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    const selectedClient = req.query.client;
    const dbH = process.env.DB_NAME_HELPDESK;
    const query = `
        DECLARE @AssetDB NVARCHAR(50) = (SELECT TOP 1 name FROM sys.databases WHERE name IN ('TCO3', 'TCO') ORDER BY LEN(name) DESC);
        DECLARE @sql NVARCHAR(MAX) = '
          WITH FaultCounts AS (
              SELECT ISNULL(b.model, ''UNKNOWN'') AS name, COUNT(a.request_no) AS fault_count
              FROM [${dbH}].[dbo].[HD_REQUEST] a
              LEFT JOIN ' + QUOTENAME(@AssetDB) + '.[dbo].[TS_OBJECT_ROOT] b ON LTRIM(RTRIM(a.user_sn)) = LTRIM(RTRIM(b.object_root_idn))
              WHERE b.model NOT LIKE ''%VMware%'' AND b.model IS NOT NULL
              GROUP BY b.model
          ),
          TotalCount AS (SELECT SUM(fault_count) as grand_total FROM FaultCounts)
          SELECT TOP 5 f.name, f.fault_count, CAST((f.fault_count * 100.0 / NULLIF(t.grand_total, 0)) AS INT) AS rate
          FROM FaultCounts f, TotalCount t ORDER BY f.fault_count DESC';
        EXEC sp_executesql @sql;`;

    const results = await db.querySpecificServers('helpdesk', query, selectedClient);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7️⃣ Brand Aging Analysis - Menghimpun data dari semua server
app.get('/api/assets/brand-aging', systemAuthMiddleware, validateClientFilter, async (req, res) => {
  try {
    let selectedClient = req.query.client || '';
    selectedClient = selectedClient.replace('Project: ', '').trim();

    const query = `
        DECLARE @AssetDB NVARCHAR(50) = (
            SELECT TOP 1 name FROM sys.databases 
            WHERE name IN ('TCO3', 'TCO') 
            ORDER BY CASE WHEN name = 'TCO3' THEN 1 ELSE 2 END
        );

        DECLARE @sql NVARCHAR(MAX) = '
          SELECT 
            CASE 
                -- ✅ Kategori Gergasi Windows & Korporat
                WHEN UPPER(a.MadeCompany) LIKE ''%HP%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%HEWLETT%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%COMPAQ%'' THEN ''HP''
                WHEN UPPER(a.MadeCompany) LIKE ''%DELL%'' THEN ''DELL''
                WHEN UPPER(a.MadeCompany) LIKE ''%LENOVO%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%THINKPAD%'' THEN ''LENOVO''
                WHEN UPPER(a.MadeCompany) LIKE ''%ASUS%'' THEN ''ASUS''
                WHEN UPPER(a.MadeCompany) LIKE ''%ACER%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%PREDATOR%'' THEN ''ACER''
                
                -- ✅ Kategori Premium & Apple
                WHEN UPPER(a.MadeCompany) LIKE ''%APPLE%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%MACBOOK%'' THEN ''APPLE''
                
                -- ✅ Kategori Gaming & High-End
                WHEN UPPER(a.MadeCompany) LIKE ''%MSI%'' THEN ''MSI''
                WHEN UPPER(a.MadeCompany) LIKE ''%RAZER%'' THEN ''RAZER''
                WHEN UPPER(a.MadeCompany) LIKE ''%GIGABYTE%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%AORUS%'' THEN ''GIGABYTE''
                
                -- ✅ Kategori Lain-lain (Common)
                WHEN UPPER(a.MadeCompany) LIKE ''%SAMSUNG%'' THEN ''SAMSUNG''
                WHEN UPPER(a.MadeCompany) LIKE ''%MICROSOFT%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%SURFACE%'' THEN ''MICROSOFT''
                WHEN UPPER(a.MadeCompany) LIKE ''%HUAWEI%'' 
                     OR UPPER(a.MadeCompany) LIKE ''%MATEBOOK%'' THEN ''HUAWEI''
                
                ELSE ''OTHERS'' 
            END AS name,
            ISNULL(DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()), 3) AS Age
          FROM ' + QUOTENAME(@AssetDB) + '.[dbo].[TS_OBJECT_ROOT] a
          LEFT JOIN (
              SELECT Object_Root_Idn, MAX(Object_Value_Idn) as MaxValId
              FROM ' + QUOTENAME(@AssetDB) + '.[dbo].[TSHI_OBJECT_CURRENT]
              WHERE Object_Field_Idn = 14
              GROUP BY Object_Root_Idn
          ) c_filter ON a.Object_Root_Idn = c_filter.Object_Root_Idn
          LEFT JOIN ' + QUOTENAME(@AssetDB) + '.[dbo].[TSHI_OBJECT_VALUE] v 
              ON c_filter.MaxValId = v.Object_Value_Idn
          WHERE a.MadeCompany NOT LIKE ''%VMware%''';
        
        EXEC sp_executesql @sql;`;

    const rawResults = await db.querySpecificServers('tco', query, selectedClient);

    const brandMap = {};
    rawResults.forEach((curr) => {
      const bName = curr.name;
      if (!brandMap[bName]) {
        brandMap[bName] = { name: bName, total: 0, n: 0, s: 0, ag: 0, c: 0 };
      }
      brandMap[bName].total += 1;
      if (curr.Age < 1) brandMap[bName].n += 1;
      else if (curr.Age <= 2) brandMap[bName].s += 1;
      else if (curr.Age === 3) brandMap[bName].ag += 1;
      else brandMap[bName].c += 1;
    });

    // ✅ Susun mengikut total terbanyak & ambil Top 10 supaya brand baru ni muncul
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

// 8️⃣ TEST QUERY MANUAL KE TCO SERVER (Debugging)
app.get('/api/test-compaq', async (req, res) => {
  try {
    // Kita tembak terus ke TCO server .53 secara manual untuk check
    const query = `SELECT MadeCompany, COUNT(*) as total FROM [TCO].[dbo].[TS_OBJECT_ROOT] GROUP BY MadeCompany`;
    const results = await db.querySpecificServers('tco', query, 'Project_B');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
    🚀 SERVER START
===================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
