const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();

app.use(cors());

// ✅ 1. Table Data: Menampilkan senarai penuh tiket
app.get('/api/dashboard', async (req, res) => {
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

    let combinedData = await db.queryAllServers('helpdesk', query);
    combinedData.sort((a, b) => b.request_time - a.request_time);
    res.json(combinedData);
  } catch (err) {
    res.status(500).json({ message: 'Data Retrieval Failed', error: err.message });
  }
});

// ✅ 2. Summary Boxes: Pengiraan status tiket (Open, Pending, Solved, Lapsed) + MASTER FILTER
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // 1. Tangkap filter dari URL (Contoh: ?client=Client_A)
    const selectedClient = req.query.client;
    console.log('[Server] Filtering Summary for:', selectedClient || 'All Clients');

    const query = `SELECT request_status, request_time, completed_time FROM HD_REQUEST`;

    // 2. TUKAR DI SINI: Gunakan querySpecificServers dan hantar selectedClient
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);

    const now = Math.floor(Date.now() / 1000);

    const summary = results.reduce(
      (acc, curr) => {
        // Ambil ID server untuk spinner visual (PENTING!)
        const sID = curr.serverId || 'Unknown';
        const status = Number(curr.request_status ?? 0);
        let reqTime = Number(curr.request_time ?? 0);
        let completedTime = Number(curr.completed_time ?? 0);

        if (reqTime > 9999999999) reqTime = Math.floor(reqTime / 1000);
        if (completedTime > 9999999999) completedTime = Math.floor(completedTime / 1000);

        const endTime = completedTime > 0 ? completedTime : now;
        const daysElapsed = Math.floor((endTime - reqTime) / 86400);

        // Pengiraan Grand Total (Akan reflect ikut filter secara automatik)
        if (status === 0) acc.openTotal++;
        if (status === 13) acc.pendingTotal++;
        if (status === 2) acc.solvedTotal++;
        if (status !== 2 && daysElapsed > 7) acc.lapsedTotal++;

        // ✅ TAMBAH: Logic Spinner (Supaya visual Client_A, Client_B tak hilang)
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
    console.error('[Summary API Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ✅ 3. Total Assets: Tapis mengikut database client (70 atau 50)
app.get('/api/assets/total', async (req, res) => {
  try {
    // 1. Tangkap ID client dari frontend (cth: ?client=50)
    const selectedClient = req.query.client; 
    console.log('[Server] Asset Total Filter:', selectedClient || 'All Clients');

    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';

    // 2. TUKAR DI SINI: Guna querySpecificServers supaya dia hanya query DB yang dipilih
    const results = await db.querySpecificServers('tco', queryStr, selectedClient);
    
    // 3. Kira total: Kalau pilih Client 50, results hanya ada data dari Client 50
    const totalAssets = results.reduce((sum, row) => sum + (row.count || 0), 0);
    
    res.json({ totalAssets });
  } catch (err) {
    console.error('[Asset API Error]:', err.message);
    res.status(500).json({ message: 'Asset fetch failed', error: err.message });
  }
});

// ✅ 4. Top 5 Fault-Prone Models: Master Filter Support
app.get('/api/assets/top-faults', async (req, res) => {
  try {
    // 1. Tangkap filter dari Frontend (cth: ?client=50)
    const selectedClient = req.query.client;
    const dbH = process.env.DB_NAME_HELPDESK;

    const query = `
      DECLARE @AssetDB NVARCHAR(50) = (SELECT TOP 1 name FROM sys.databases WHERE name IN ('TCO3', 'TCO') ORDER BY LEN(name) DESC);
      
      DECLARE @sql NVARCHAR(MAX) = '
        WITH FaultCounts AS (
            SELECT 
                ISNULL(b.model, ''UNKNOWN'') AS name, 
                COUNT(a.request_no) AS fault_count
            FROM [${dbH}].[dbo].[HD_REQUEST] a
            LEFT JOIN ' + QUOTENAME(@AssetDB) + '.[dbo].[TS_OBJECT_ROOT] b 
              ON LTRIM(RTRIM(a.user_sn)) = LTRIM(RTRIM(b.object_root_idn))
            WHERE b.model NOT LIKE ''%VMware%''
              AND b.model IS NOT NULL
            GROUP BY b.model
        ),
        TotalCount AS (
            -- Ini akan kira total faults mengikut database yang di-query sahaja
            SELECT SUM(fault_count) as grand_total FROM FaultCounts
        )
        SELECT TOP 5 
            f.name, 
            f.fault_count,
            CAST((f.fault_count * 100.0 / NULLIF(t.grand_total, 0)) AS INT) AS rate
        FROM FaultCounts f, TotalCount t
        ORDER BY f.fault_count DESC';
        
      EXEC sp_executesql @sql;
    `;

    // 2. TUKAR DI SINI: Gunakan querySpecificServers supaya dia hanya tarik data client yang dipilih
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);
    res.json(results);
    
  } catch (err) {
    console.error('[Top Faults API Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ✅ 5. Brand Aging Analysis: Master Filter Support
app.get('/api/assets/brand-aging', async (req, res) => {
  try {
    // 1. Tangkap filter dari Frontend (cth: ?client=50)
    const selectedClient = req.query.client;
    console.log('[Server] Brand Aging Filter:', selectedClient || 'All Clients');

    const query = `
      DECLARE @AssetDB NVARCHAR(50) = (SELECT TOP 1 name FROM sys.databases WHERE name IN ('TCO3', 'TCO') ORDER BY LEN(name) DESC);
      
      DECLARE @sql NVARCHAR(MAX) = '
        WITH AgingData AS (
            SELECT 
                -- Normalise Brand Name
                CASE 
                    WHEN a.MadeCompany LIKE ''%HP%'' 
                         OR a.MadeCompany LIKE ''%Hewlett-Packard%'' 
                         OR a.MadeCompany LIKE ''%Compaq%'' 
                         OR a.MadeCompany LIKE ''%Pavilion%'' THEN ''HP''
                    WHEN a.MadeCompany LIKE ''%ASUSTeK%'' OR a.MadeCompany LIKE ''%ASUS%'' THEN ''Asus''
                    WHEN a.MadeCompany LIKE ''%Dell%'' THEN ''Dell''
                    WHEN a.MadeCompany LIKE ''%Lenovo%'' THEN ''Lenovo''
                    WHEN a.MadeCompany LIKE ''%Acer%'' THEN ''Acer''
                    WHEN a.MadeCompany LIKE ''%Apple%'' THEN ''Apple''
                    WHEN a.MadeCompany LIKE ''%Microsoft%'' THEN ''Microsoft''
                    ELSE a.MadeCompany 
                END AS CleanBrand,
                DATEDIFF(year, TRY_CAST(v.Object_Value_Str AS DATETIME), GETDATE()) AS Age
            FROM ' + QUOTENAME(@AssetDB) + '.[dbo].[TS_OBJECT_ROOT] a
            JOIN ' + QUOTENAME(@AssetDB) + '.[dbo].[TSHI_OBJECT_CURRENT] c ON a.Object_Root_Idn = c.Object_Root_Idn
            JOIN ' + QUOTENAME(@AssetDB) + '.[dbo].[TSHI_OBJECT_VALUE] v ON c.Object_Value_Idn = v.Object_Value_Idn
            WHERE c.Object_Field_Idn = 14 
              AND v.Object_Value_Str NOT IN ('''', ''Not Available'', ''N/A'')
              AND a.MadeCompany IS NOT NULL
              AND a.MadeCompany NOT LIKE ''%VMware%''
              AND a.MadeCompany NOT IN (''Not Available'', ''To be filled by O.E.M.'', ''System manufacturer'')
        ),
        CalculatedStats AS (
            SELECT 
                CleanBrand AS name,
                COUNT(*) AS total,
                SUM(CASE WHEN Age <= 1 THEN 1 ELSE 0 END) AS u_new,
                SUM(CASE WHEN Age > 1 AND Age <= 3 THEN 1 ELSE 0 END) AS u_young,
                SUM(CASE WHEN Age > 3 AND Age <= 5 THEN 1 ELSE 0 END) AS u_mid,
                SUM(CASE WHEN Age > 5 THEN 1 ELSE 0 END) AS u_legacy
            FROM AgingData
            GROUP BY CleanBrand
        )
        SELECT TOP 5
            name,
            total,
            CAST((u_new * 100.0 / NULLIF(total, 0)) AS INT) AS [new],
            CAST((u_young * 100.0 / NULLIF(total, 0)) AS INT) AS young,
            CAST((u_mid * 100.0 / NULLIF(total, 0)) AS INT) AS mid,
            CAST((u_legacy * 100.0 / NULLIF(total, 0)) AS INT) AS legacy
        FROM CalculatedStats
        ORDER BY total DESC';
        
      EXEC sp_executesql @sql;
    `;

    // 2. TUKAR DI SINI: Gunakan querySpecificServers supaya dia panggil database client yang dipilih je
    const results = await db.querySpecificServers('helpdesk', query, selectedClient);
    res.json(results);

  } catch (err) {
    console.error('[Brand Aging API Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ✅ 6. Clients List: Senarai ID Client untuk Dropdown Filter
app.get('/api/dashboard/clients', async (req, res) => {
  try {
    // Kita ambil terus dari config DB_CLIENTS yang ada dalam db.js
    // Ini cara paling laju dan dijamin match dengan Master Filter
    const clientList = db.clients.map(c => ({
      id: c.name,
      label: `Client ${c.name}`
    }));

    console.log('[Server] Sending Client List:', clientList.map(c => c.id));
    res.json(clientList);
  } catch (err) {
    console.error('[Clients API Error]:', err.message);
    res.status(500).json([]);
  }
});


// ✅ 7. Clients List: Endpoint untuk dapatkan senarai client/server unik 
app.get('/api/dashboard/clients', async (req, res) => {
  try {
    // Pastikan db.clients ada isi (diambil dari .env DB_CLIENTS)
    const clientList = db.clients.map(c => ({
      id: c.name,
      label: `Client ${c.name}`
    }));
    res.json(clientList);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
