const express = require('express');
const cors = require('cors');
const db = require('./db'); 
const app = express();

app.use(cors());

// ✅ 1. Table Data: Shows all tickets from all clients
app.get('/api/dashboard', async (req, res) => {
  try {
    const query = `
      SELECT user_name, request_no, title, request_status, request_time
      FROM HD_REQUEST
    `;

    let combinedData = await db.queryAllServers('helpdesk', query);

    // Global sort by time descending
    combinedData.sort((a, b) => b.request_time - a.request_time);

    res.json(combinedData);
  } catch (err) {
    res.status(500).json({ message: "Data Retrieval Failed", error: err.message });
  }
});

// ✅ 2. Summary Boxes: Sums totals and breaks down by Client Name
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(CASE WHEN request_status = 0 THEN 1 END) as openCount,
        COUNT(CASE WHEN request_status = 13 THEN 1 END) as pendingCount,
        COUNT(CASE WHEN request_status = 2 THEN 1 END) as solvedCount,
        COUNT(CASE WHEN request_status != 2 AND DATEDIFF(day, DATEADD(s, CAST(request_time AS BIGINT), '1970-01-01'), GETDATE()) > 7 THEN 1 END) as lapsedCount
      FROM HD_REQUEST`;

    const results = await db.queryAllServers('helpdesk', summaryQuery);

    const summary = results.reduce((acc, curr) => {
      acc.openTotal += curr.openCount;
      acc.pendingTotal += curr.pendingCount;
      acc.solvedTotal += curr.solvedCount;
      acc.lapsedTotal += curr.lapsedCount;
      
      // ✅ Creates specific keys like "open_Client_A" for your UI
      acc[`open_${curr.origin_server_id}`] = curr.openCount;
      
      return acc;
    }, { openTotal: 0, pendingTotal: 0, solvedTotal: 0, lapsedTotal: 0 });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. Total Assets: Sums TCO objects from all clients
app.get('/api/assets/total', async (req, res) => {
  try {
    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';
    const results = await db.queryAllServers('tco', queryStr);

    const totalAssets = results.reduce((sum, row) => sum + row.count, 0);

    res.json({ totalAssets });
  } catch (err) {
    res.status(500).json({ message: "Asset fetch failed", error: err.message });
  }
});

app.listen(3000, () => console.log('Dynamic AISM API running on Port 3000'));
