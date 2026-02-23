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

// ✅ 2. Summary Boxes: Pengiraan status tiket (Open, Pending, Solved, Lapsed)
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const query = `SELECT request_status, request_time, completed_time FROM HD_REQUEST`;
    const results = await db.queryAllServers('helpdesk', query);

    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 604800; 

    const summary = results.reduce((acc, curr) => {
      const status = Number(curr.request_status ?? curr.REQUEST_STATUS ?? 0);
      let reqTime = Number(curr.request_time ?? curr.REQUEST_TIME ?? 0);
      let completedTime = Number(curr.completed_time ?? curr.COMPLETED_TIME ?? 0);

      if (reqTime > 9999999999) reqTime = Math.floor(reqTime / 1000);
      if (completedTime > 9999999999) completedTime = Math.floor(completedTime / 1000);

      const endTime = completedTime > 0 ? completedTime : now;
      const daysElapsed = Math.floor((endTime - reqTime) / 86400);

      if (status === 0) acc.openTotal++;
      if (status === 13) acc.pendingTotal++;
      if (status === 2) acc.solvedTotal++;
      if (status !== 2 && daysElapsed > 7) acc.lapsedTotal++;

      return acc;
    }, { openTotal: 0, pendingTotal: 0, solvedTotal: 0, lapsedTotal: 0 });

    summary.masa_update = new Date().toLocaleTimeString();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. Total Assets: Menggunakan DB_NAME_TCO (TCO3)
app.get('/api/assets/total', async (req, res) => {
  try {
    // Parameter 'tco' akan memberitahu db.js untuk menggunakan database TCO3
    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';
    const results = await db.queryAllServers('tco', queryStr);
    const totalAssets = results.reduce((sum, row) => sum + row.count, 0);
    res.json({ totalAssets });
  } catch (err) {
    res.status(500).json({ message: 'Asset fetch failed', error: err.message });
  }
});

// ✅ 4. Top 5 Fault-Prone Models: JOIN Cross-Database
app.get('/api/assets/top-faults', async (req, res) => {
  try {
    const query = `
      SELECT TOP 5
        b.model AS name,
        COUNT(a.request_no) AS fault_count,
        CAST(COUNT(a.request_no) * 100.0 / SUM(COUNT(a.request_no)) OVER() AS INT) AS rate
      FROM [helpdesk].[dbo].[HD_REQUEST] a
      INNER JOIN [TCO3].[dbo].[TS_OBJECT_ROOT] b 
        ON LTRIM(RTRIM(a.user_sn)) = LTRIM(RTRIM(b.object_root_idn))
      WHERE b.model IS NOT NULL 
        AND b.model NOT IN ('', 'Not Available', 'VMware7,1')
      GROUP BY b.model
      ORDER BY fault_count DESC
    `;

    // Kita gunakan context 'helpdesk' sebagai pintu masuk utama server
    const results = await db.queryAllServers('helpdesk', query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
