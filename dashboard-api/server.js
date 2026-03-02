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
    📊 DASHBOARD ROUTES
===================================================== */

// 1. Endpoint Utama Dashboard (Full Ticket Table)
app.get('/api/dashboard', systemAuthMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT user_name, request_no,
             SUBSTRING(user_summary, 1, 8000) AS user_summary,
             request_status, request_time,
             ISNULL(completed_time, 0) AS completed_time
      FROM HD_REQUEST
    `;

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

// 2 Endpoint Detail Tiket (Versi Pantas)
app.get('/api/dashboard/detail/:uuid', systemAuthMiddleware, async (req, res) => {
  try {
    const { uuid } = req.params;

    // 1. Tarik SEMUA tiket (Sebab kita tak tahu UUID ni milik tiket mana)
    const query = `SELECT user_name, request_no, user_summary, request_status, request_time, completed_time FROM HD_REQUEST`;
    const allData = await db.queryAllServers('helpdesk', query);

    // 2. Cari tiket yang bila di-normalize + uuidv5, dapat UUID yang sama macam dalam URL
    const targetTicket = allData.find((row) => {
      const generatedUuid = uuidv5(normalize(row.request_no), NAMESPACE);
      return generatedUuid === uuid;
    });

    if (!targetTicket) {
      return res.status(404).json({ message: 'Ticket not found with this UUID' });
    }

    res.json(targetTicket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3 Endpoint Hirarki Projek
app.get('/api/dashboard/hierarchy', systemAuthMiddleware, (req, res) => {
  res.json(db.projects);
});

// 4 Summary (KPI)
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

// 5 Total Assets
app.get('/api/assets/total', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';

    // 1. Query SQL untuk kira total aset
    const queryStr = `SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT`;

    // 2. TUKAR KEPADA 'tco' (Sebab TS_OBJECT_ROOT ada dalam DB TCO, bukan Helpdesk)
    const results = await db.querySpecificServers('tco', queryStr, selectedClient);

    // 3. DEBUG: Check console untuk tengok hasil mapping db.js
    console.log(`📡 Asset Results:`, results);

    // 4. Kira total (Pastikan row.count ditukar ke Number)
    const totalAssets = results.reduce((sum, row) => sum + Number(row.count || 0), 0);

    res.json({ totalAssets });
  } catch (err) {
    console.error('❌ Total Asset Error:', err.message);
    res.status(500).json({ message: 'Asset fetch failed', error: err.message });
  }
});

// 6 Clients List
app.get('/api/dashboard/clients', systemAuthMiddleware, (req, res) => {
  // db.clients datang dari getter 'flatServerList' dalam db.js
  const clientList = db.clients.map((c) => ({
    id: c.name,
    label: c.type === 'project' ? `Project: ${c.name}` : `Client: ${c.name}`,
    projectName: c.projectName,
    sector: c.sector, // <--- Sekarang ni dah ada sebab db.js dah angkut dari MySQL
    type: c.type,
  }));

  res.json(clientList);
});

// 7 Top Faulty Assets
app.get('/api/assets/top-faults', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';
    const dbH = process.env.DB_NAME_HELPDESK || 'Helpdesk';

    const query = `
      SELECT 
        ISNULL(b.model, 'UNKNOWN') AS name, 
        COUNT(a.request_no) AS fault_count
      FROM [${dbH}].[dbo].[HD_REQUEST] a
      INNER JOIN TS_OBJECT_ROOT b ON LTRIM(RTRIM(a.user_sn)) = LTRIM(RTRIM(b.object_root_idn))
      WHERE b.model NOT LIKE '%VMware%'
      GROUP BY b.model
    `;

    // Ambil data dari db.js (Ingat: db.js dah tolong 'tempek' serverId, projectName, serverSector)
    const allResults = await db.querySpecificServers('tco', query, selectedClient);

    // 📊 Aggregation (Gabungkan model yang sama tapi kekalkan info server/sector)
    const aggregated = allResults.reduce((acc, curr) => {
      // Kita cari dalam accumulator kalau model + server yang sama dah ada
      const existing = acc.find(
        (item) => item.name === curr.name && item.serverId === curr.serverId,
      );

      const count = Number(curr.fault_count || 0);

      if (existing) {
        existing.fault_count += count;
      } else {
        acc.push({
          name: curr.name,
          fault_count: count,
          serverId: curr.serverId,
          projectName: curr.projectName,
          serverSector: curr.serverSector, // <--- Dah ada balik!
        });
      }
      return acc;
    }, []);

    // Kira Grand Total untuk peratusan (%)
    const grandTotal = aggregated.reduce((sum, item) => sum + item.fault_count, 0);

    // Ambil Top 5 Teratas secara Global
    const finalTop5 = aggregated
      .sort((a, b) => b.fault_count - a.fault_count)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        rate: grandTotal > 0 ? Math.round((item.fault_count * 100) / grandTotal) : 0,
      }));

    res.json(finalTop5);
  } catch (err) {
    console.error('❌ Top Faults Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8 Brand Aging Analysis
app.get('/api/assets/brand-aging', systemAuthMiddleware, async (req, res) => {
  try {
    let selectedClient = req.query.client || '';
    // Bersihkan prefix kalau ada (supaya match dengan flatServerList)
    selectedClient = selectedClient.replace('Project: ', '').trim();

    // ⚡ Query SQL (Dijalankan pada SETIAP server TCO secara individu)
    const query = `
      SELECT 
        CASE 
          WHEN UPPER(a.MadeCompany) LIKE '%HP%' OR UPPER(a.MadeCompany) LIKE '%HEWLETT%' OR UPPER(a.MadeCompany) LIKE '%COMPAQ%' THEN 'HP'
          WHEN UPPER(a.MadeCompany) LIKE '%DELL%' THEN 'DELL'
          WHEN UPPER(a.MadeCompany) LIKE '%LENOVO%' OR UPPER(a.MadeCompany) LIKE '%THINKPAD%' THEN 'LENOVO'
          WHEN UPPER(a.MadeCompany) LIKE '%ASUS%' THEN 'ASUS'
          WHEN UPPER(a.MadeCompany) LIKE '%ACER%' OR UPPER(a.MadeCompany) LIKE '%PREDATOR%' THEN 'ACER'
          WHEN UPPER(a.MadeCompany) LIKE '%APPLE%' OR UPPER(a.MadeCompany) LIKE '%MACBOOK%' THEN 'APPLE'
          WHEN UPPER(a.MadeCompany) LIKE '%MICROSOFT%' OR UPPER(a.MadeCompany) LIKE '%SURFACE%' THEN 'MICROSOFT'
          ELSE 'OTHERS' 
        END AS brand,
        ISNULL(DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()), 3) AS Age
      FROM TS_OBJECT_ROOT a
      LEFT JOIN (
        SELECT Object_Root_Idn, MAX(Object_Value_Idn) as MaxValId 
        FROM TSHI_OBJECT_CURRENT 
        WHERE Object_Field_Idn = 14 
        GROUP BY Object_Root_Idn
      ) cf ON a.Object_Root_Idn = cf.Object_Root_Idn
      LEFT JOIN TSHI_OBJECT_VALUE v ON cf.MaxValId = v.Object_Value_Idn
      WHERE a.MadeCompany NOT LIKE '%VMware%'
    `;

    // db.js akan handle 'USE [TCO_Name]' secara automatik
    const rawResults = await db.querySpecificServers('tco', query, selectedClient);

    const brandMap = {};

    // 📊 Aggregation di Node.js
    rawResults.forEach((curr) => {
      const bName = curr.brand;
      if (!brandMap[bName]) {
        brandMap[bName] = {
          name: bName,
          total: 0,
          new: 0,
          standard: 0,
          aging: 0,
          critical: 0,
          serverId: curr.serverId,
          projectName: curr.projectName,
          serverSector: curr.serverSector,
        };
      }

      brandMap[bName].total += 1;
      const age = curr.Age;

      if (age < 1) brandMap[bName].new += 1;
      else if (age <= 2) brandMap[bName].standard += 1;
      else if (age === 3) brandMap[bName].aging += 1;
      else brandMap[bName].critical += 1;
    });

    // Susun Top 10 dan tukar kepada peratusan (%)
    const finalResults = Object.values(brandMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((b) => ({
        name: b.name,
        total: b.total,
        new: Math.round((b.new * 100) / b.total),
        standard: Math.round((b.standard * 100) / b.total),
        aging: Math.round((b.aging * 100) / b.total),
        critical: Math.round((b.critical * 100) / b.total),
        // Metadata dikekalkan (Ambil rekod terakhir server yang jumpa brand ni)
        serverId: b.serverId,
        projectName: b.projectName,
        serverSector: b.serverSector,
      }));

    res.json(finalResults);
  } catch (err) {
    console.error('❌ Brand Aging Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// 9 Incident Trend Analysis
app.get('/api/incidents/trend', systemAuthMiddleware, async (req, res) => {
  try {
    const { type, client, year, month } = req.query;
    let conditions = [];

    // 1. Filter Status (Kekalkan logik kau)
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

    // 2. Logik Dynamic Date Formatting
    let dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'yyyy')";
    const isAllYear = !year || year === 'All' || year === 'All Year';

    if (!isAllYear) {
      const safeYear = parseInt(year, 10);
      if (!isNaN(safeYear)) {
        conditions.push(`YEAR(DATEADD(SECOND, request_time, '1970-01-01')) = ${safeYear}`);
        dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'MMM')"; // Papar nama bulan (Jan, Feb...)

        if (month && month !== 'All' && month !== 'All Months') {
          const safeMonth = parseInt(month, 10);
          if (!isNaN(safeMonth)) {
            conditions.push(`MONTH(DATEADD(SECOND, request_time, '1970-01-01')) = ${safeMonth}`);
            dateSelect = "FORMAT(DATEADD(SECOND, request_time, '1970-01-01'), 'dd MMM')"; // Papar tarikh (01 Jan...)
          }
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query SQL: Kita tarik Sort Key supaya Node.js tahu mana bulan dulu, mana bulan kemudian
    const query = `
      SELECT 
        ${dateSelect} AS date, 
        COUNT(*) AS count, 
        MIN(request_time) as sort_key
      FROM HD_REQUEST 
      ${whereClause}
      GROUP BY ${dateSelect}
    `;

    // Panggil db.js (Ingat: Gunakan 'helpdesk' pool di sini)
    const rawResults = await db.querySpecificServers('helpdesk', query, client || '');

    // 📊 Aggregation: Gabungkan data dari semua server mengikut Label Tarikh
    const aggregated = rawResults.reduce((acc, curr) => {
      const label = curr.date;
      if (!acc[label]) {
        acc[label] = {
          date: label,
          count: 0,
          sortTime: Number(curr.sort_key),
        };
      }
      acc[label].count += Number(curr.count || 0);
      return acc;
    }, {});

    // 🚀 Sorting Terakhir: Susun mengikut masa supaya graf tak bersepah
    const finalTrend = Object.values(aggregated).sort((a, b) => a.sortTime - b.sortTime);

    console.log(`📈 Trend Generated: ${finalTrend.length} data points.`);
    res.json(finalTrend);
  } catch (err) {
    console.error('❌ Trend Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 10 Years Filter
app.get('/api/incidents/years', async (req, res) => {
  try {
    const query = `SELECT DISTINCT YEAR(DATEADD(SECOND, request_time, '1970-01-01')) AS year FROM HD_REQUEST WHERE request_time > 0`;

    // Panggil semua server Helpdesk
    const results = await db.queryAllServers('helpdesk', query);

    // Ambil tahun, buang null/undefined, buang duplicate, dan susun (Desc)
    const uniqueYears = [...new Set(results.map((r) => r.year))]
      .filter((y) => y !== null && y !== undefined)
      .sort((a, b) => b - a); // Susun 2026, 2025, 2024...

    res.json(uniqueYears);
  } catch (err) {
    console.error('❌ Years Error:', err.message);
    res.status(500).json({ error: 'Gagal mendapatkan senarai tahun' });
  }
});

// 11 Asset Summary
app.get('/api/assets/summary', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';

    // Query SQL tetap sama (Kira mengikut MachineType)
    const query = `
      SELECT 
        UPPER(LTRIM(RTRIM(ISNULL(c.MachineType, 'OTHERS')))) AS Machine_Type,
        COUNT(a.Object_root_idn) as Total
      FROM TS_OBJECT_ROOT a 
      LEFT JOIN ts_client_info c ON a.Object_root_idn = c.Object_root_idn
      GROUP BY c.MachineType
    `;

    // Panggil db.js (Sekarang dia akan pulangkan data + serverSector)
    const allResults = await db.querySpecificServers('tco', query, selectedClient);

    const summary = allResults.reduce(
      (acc, curr) => {
        const count = Number(curr.Total || 0);
        const sector = (curr.serverSector || 'OTHERS').toUpperCase(); // Ambil dari db.js

        // 1. Tambah ke Total Asset Global
        acc.totalAsset += count;

        // 2. Pecahkan mengikut Kategori Machine Type
        const type = curr.Machine_Type;
        if (type.includes('DESKTOP')) acc.desktop += count;
        else if (type.includes('LAPTOP') || type.includes('NOTEBOOK')) acc.laptop += count;
        else if (type.includes('SERVER')) acc.server += count;
        else acc.others += count;

        // 3. Pecahkan mengikut Sektor (Terus guna data dari MySQL)
        if (sector === 'GLC') acc.glc += count;
        else if (sector === 'FSI') acc.fsi += count;
        else if (sector === 'GOV') acc.gov += count;
        else if (sector === 'EDU') acc.edu += count;
        else acc.othersSector += count; // Tambah sikit untuk sektor lain-lain

        return acc;
      },
      {
        totalAsset: 0,
        desktop: 0,
        laptop: 0,
        server: 0,
        others: 0,
        glc: 0,
        fsi: 0,
        gov: 0,
        edu: 0,
        othersSector: 0,
      },
    );

    console.log(`✅ Summary Berjaya: ${summary.totalAsset} Aset diproses.`);
    res.json(summary);
  } catch (err) {
    console.error('❌ Summary Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 12 Brand Hierarchy (Versi Baru)
app.get('/api/assets/brand-hierarchy-new', systemAuthMiddleware, async (req, res) => {
  try {
    const brand = req.query.brand || 'ASUS';
    const selectedClient = req.query.client || ''; // Tambah filter client kalau perlu

    // ⚡ Query SQL (Dijalankan pada setiap server TCO)
    const query = `
      SELECT 
        UPPER(ISNULL(c.MachineType, 'DEVICES')) AS machineType,
        a.MadeCompany AS modelName,
        CASE 
          WHEN UPPER(a.MadeCompany) LIKE '%HP%' OR UPPER(a.MadeCompany) LIKE '%HEWLETT%' OR UPPER(a.MadeCompany) LIKE '%COMPAQ%' THEN 'HP'
          WHEN UPPER(a.MadeCompany) LIKE '%DELL%' THEN 'DELL'
          WHEN UPPER(a.MadeCompany) LIKE '%LENOVO%' OR UPPER(a.MadeCompany) LIKE '%THINKPAD%' THEN 'LENOVO'
          WHEN UPPER(a.MadeCompany) LIKE '%ASUS%' THEN 'ASUS'
          WHEN UPPER(a.MadeCompany) LIKE '%ACER%' OR UPPER(a.MadeCompany) LIKE '%PREDATOR%' THEN 'ACER'
          WHEN UPPER(a.MadeCompany) LIKE '%APPLE%' OR UPPER(a.MadeCompany) LIKE '%MACBOOK%' THEN 'APPLE'
          ELSE 'OTHERS' 
        END AS brandGroup,
        ISNULL(DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()), 3) AS Age
      FROM TS_OBJECT_ROOT a
      JOIN TS_CLIENT_INFO c ON a.Object_Root_Idn = c.Object_Root_Idn
      LEFT JOIN (
        SELECT Object_Root_Idn, MAX(Object_Value_Idn) as MaxValId 
        FROM TSHI_OBJECT_CURRENT 
        WHERE Object_Field_Idn = 14 
        GROUP BY Object_Root_Idn
      ) cf ON a.Object_Root_Idn = cf.Object_Root_Idn
      LEFT JOIN TSHI_OBJECT_VALUE v ON cf.MaxValId = v.Object_Value_Idn
      WHERE UPPER(a.MadeCompany) LIKE UPPER('%${brand}%')
    `;

    // 🚀 db.js uruskan parallel connection ke semua TCO server
    const results = await db.querySpecificServers('tco', query, selectedClient);

    // Metadata serverSector & serverId secara automatik dah ada dalam results
    console.log(`📊 [Brand Hierarchy] Dijana: ${results.length} rekod untuk brand: ${brand}`);

    res.json(results);
  } catch (err) {
    console.error('❌ [Brand Hierarchy Error]:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 13 Individual Asset Details (Versi Full Fix)
app.get('/api/assets/individual-details', systemAuthMiddleware, async (req, res) => {
  try {
    const { project, type, brand } = req.query;
    let conditions = [];

    // 1. BRAND FILTER
    if (brand) {
      const b = brand.toUpperCase();
      conditions.push(`
        (CASE 
          WHEN UPPER(a.MadeCompany) LIKE '%ASUS%' THEN 'ASUS'
          WHEN UPPER(a.MadeCompany) LIKE '%HP%' OR UPPER(a.MadeCompany) LIKE '%HEWLETT%' THEN 'HP'
          WHEN UPPER(a.MadeCompany) LIKE '%DELL%' THEN 'DELL'
          WHEN UPPER(a.MadeCompany) LIKE '%LENOVO%' THEN 'LENOVO'
          ELSE 'OTHERS'
        END) = '${b}'
      `);
    }

    // 2. TYPE FILTER
    if (type) {
      const t = type.toLowerCase();
      if (t === 'notebook' || t === 'laptop') {
        conditions.push(
          "(LOWER(ISNULL(c.MachineType, 'devices')) LIKE '%laptop%' OR LOWER(ISNULL(c.MachineType, 'devices')) LIKE '%notebook%')",
        );
      } else {
        conditions.push(`LOWER(ISNULL(c.MachineType, 'devices')) LIKE '%${t}%'`);
      }
    }

    const whereClause = conditions.length ? `WHERE ` + conditions.join(' AND ') : '';

    const query = `
      SELECT 
          a.ComputerName,
          a.Object_Client_Name AS [Owner_Name],
          b.Object_Full_Name AS [Location_Department],
          UPPER(ISNULL(c.MachineType, 'DEVICES')) AS [Machine_Type],
          a.IP,
          CASE 
            WHEN ISNUMERIC(a.RAM) = 1 THEN CAST(CAST(a.RAM AS FLOAT) / 1024 AS DECIMAL(10,0))
            ELSE 0 
          END AS [RAM_GB],
          a.CPU AS [Full_CPU_Name],
          a.MadeCompany AS [Manufacturer],
          DATEDIFF(day, a.ConnectionTime, GETDATE()) AS [Agent_Age_Days],
          CASE 
              WHEN DATEDIFF(day, a.ConnectionTime, GETDATE()) <= 90 THEN 'Active' 
              ELSE 'Inactive' 
          END AS [Agent_Status]
      FROM TS_OBJECT_ROOT a
      LEFT JOIN ts_object_relation b ON a.Object_rel_idn = b.Object_rel_idn
      LEFT JOIN ts_client_info c ON c.Object_root_idn = a.Object_root_idn
      ${whereClause}
    `;

    const rawResults = await db.querySpecificServers('tco', query, project || '');

    // 🛠️ MAPPING BERSIH: Buang duplicate & metadata teknikal yang tak perlu
    const finalData = rawResults.map((row) => {
      // Kita "destructure" untuk buang serverId & projectName yang datang dari db.js
      const { serverId, projectName, serverSector, ...cleanRow } = row;

      return {
        ...cleanRow,
        client: serverId, // Guna 'client' yang lebih pendek (e.g., FELDA)
        sector: serverSector, // Guna 'sector' (e.g., GLC)
      };
    });

    console.log(`✅ ${finalData.length} baris dipulangkan (Metadata cleaned).`);
    res.json(finalData);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 14 Statistic For Capex
app.get('/api/dashboard/stats-summary', systemAuthMiddleware, async (req, res) => {
  try {
    const selectedClient = req.query.client || '';

    const allProjects = db.projects || [];
    const allClients = db.clients || [];

    // 2. Query MSSQL - Tambah pecahan mengikut versi OS
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATEDIFF(day, ConnectionTime, GETDATE()) > 90 THEN 1 ELSE 0 END) as idle,
        
        -- PECAHAN OS RISK
        SUM(CASE WHEN OS LIKE '%Windows 7%' THEN 1 ELSE 0 END) as win7_units,
        SUM(CASE WHEN OS LIKE '%Windows 8%' THEN 1 ELSE 0 END) as win8_units,
        SUM(CASE WHEN OS LIKE '%Windows XP%' THEN 1 ELSE 0 END) as winXP_units,
        SUM(CASE WHEN OS LIKE '%Windows 10%' AND OS NOT LIKE '%22H2%' AND OS NOT LIKE '%21H2%' THEN 1 ELSE 0 END) as win10_old_units
      FROM TS_OBJECT_ROOT
    `;

    const mssqlResults = await db.querySpecificServers('tco', query, selectedClient);

    // 3. Rumuskan Data (Update Reducer untuk kutip semua pecahan OS)
    const assetStats = mssqlResults.reduce((acc, curr) => {
      acc.total += Number(curr.total || 0);
      acc.idle += Number(curr.idle || 0);
      
      // Ambil pecahan dari SQL
      acc.win7 += Number(curr.win7_units || 0);
      acc.win8 += Number(curr.win8_units || 0);
      acc.winXP += Number(curr.winXP_units || 0);
      acc.win10_old += Number(curr.win10_old_units || 0);
      
      return acc;
    }, { 
      total: 0, idle: 0, 
      win7: 0, win8: 0, winXP: 0, win10_old: 0 
    });

    // Kira jumlah besar OS Risk
    const totalOsRiskUnits = assetStats.win7 + assetStats.win8 + assetStats.winXP + assetStats.win10_old;

    // 4. Filter Projects (Kekalkan logic asal kau)
    const filteredProjects = selectedClient
      ? allProjects.filter(p => p.project_name === selectedClient || p.client_name === selectedClient)
      : allProjects;

    const activeCount = filteredProjects.filter(p => {
      const val = p.is_active;
      if (val === undefined || val === null) return false;
      if (Buffer.isBuffer(val)) return val[0] === 1;
      return String(val) === '1' || val === true || Number(val) === 1;
    }).length;

    // 5. Respond JSON (Ditambah breakdown untuk Angular)
    res.json({
      portfolio: {
        total: filteredProjects.length,
        active: activeCount,
        inactive: filteredProjects.length - activeCount
      },
      assets: {
        total: assetStats.total,
        idle: assetStats.idle,
        capexExposure: assetStats.idle * 3500,
        idleLoss: assetStats.idle * 150
      },
      risk_analysis: {
        total_units: totalOsRiskUnits,
        financial_impact: totalOsRiskUnits * 500,
        // KAU BOLEH PAKAI DATA NI UTUK TOOLTIP ATAU CHART
        breakdown: {
          windows_7: assetStats.win7,
          windows_8: assetStats.win8,
          windows_xp: assetStats.winXP,
          windows_10_outdated: assetStats.win10_old
        }
      },
      visibility: {
        percentage: assetStats.total > 0 ? (((assetStats.total - assetStats.idle) / assetStats.total) * 100).toFixed(1) : '0.0',
        offline: assetStats.idle
      }
    });

  } catch (err) {
    console.error('❌ Stats Summary Error:', err.message);
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
