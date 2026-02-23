const express = require('express');
const cors = require('cors');
const { pool70, pool51, poolTCO70, poolTCO51, getConnection } = require('./db');
const app = express();

app.use(cors());

// ✅ 1. UNCOMMENTED: For the Detail Page Table
app.get('/api/dashboard', async (req, res) => {
  try {
    const p70 = await getConnection(pool70);
    const p51 = await getConnection(pool51);

    const query = `
      SELECT 
        user_name, 
        request_no,
        title,
        request_status,
        request_time
      FROM HD_REQUEST
      ORDER BY request_time DESC
    `;

    const results = await Promise.allSettled([
      p70.request().query(query),
      p51.request().query(query)
    ]);

    let combinedData = [];

    if (results[0].status === 'fulfilled') {
      const data70 = results[0].value.recordset.map(row => ({
        ...row,
        origin_ip: '192.168.140.70'
      }));
      combinedData = [...combinedData, ...data70];
    }

    if (results[1].status === 'fulfilled') {
      const data51 = results[1].value.recordset.map(row => ({
        ...row,
        origin_ip: '192.168.140.51'
      }));
      combinedData = [...combinedData, ...data51];
    }

    // 🔥 Important: global sort after combine
    combinedData.sort((a, b) => b.request_time - a.request_time);

    res.json(combinedData);

  } catch (err) {
    console.error("DEBUG ERROR:", err);
    res.status(500).json({
      message: "Database Connection Failed",
      error: err.message
    });
  }
});

// ✅ 2. KEEP THIS: For the 4 Dashboard Summary Boxes
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const p70 = await getConnection(pool70);
    const p51 = await getConnection(pool51);

    const summaryQuery = `
      SELECT 
        COUNT(CASE WHEN request_status = 0 THEN 1 END) as openCount,
        COUNT(CASE WHEN request_status = 13 THEN 1 END) as pendingCount,
        COUNT(CASE WHEN request_status = 2 THEN 1 END) as solvedCount,
        COUNT(CASE WHEN request_status != 2 AND DATEDIFF(day, DATEADD(s, CAST(request_time AS BIGINT), '1970-01-01'), GETDATE()) > 7 THEN 1 END) as lapsedCount
      FROM HD_REQUEST`;

    const results = await Promise.allSettled([
      p70.request().query(summaryQuery),
      p51.request().query(summaryQuery)
    ]);

    const data70 = results[0].status === 'fulfilled' ? results[0].value.recordset[0] : { openCount:0, pendingCount:0, solvedCount:0, lapsedCount:0 };
    const data51 = results[1].status === 'fulfilled' ? results[1].value.recordset[0] : { openCount:0, pendingCount:0, solvedCount:0, lapsedCount:0 };

    res.json({
      openTotal: data70.openCount + data51.openCount,
      open70: data70.openCount,
      open51: data51.openCount,
      pendingTotal: data70.pendingCount + data51.pendingCount,
      solvedTotal: data70.solvedCount + data51.solvedCount,
      lapsedTotal: data70.lapsedCount + data51.lapsedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. KEEP THIS: For Total Assets
app.get('/api/assets/total', async (req, res) => {
  try {
    const pTCO70 = await getConnection(poolTCO70);
    const pTCO51 = await getConnection(poolTCO51);
    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';
    const results = await Promise.allSettled([
      pTCO70.request().query(queryStr),
      pTCO51.request().query(queryStr)
    ]);

    let totalCount = 0;
    if (results[0].status === 'fulfilled') totalCount += results[0].value.recordset[0].count;
    if (results[1].status === 'fulfilled') totalCount += results[1].value.recordset[0].count;

    res.json({ totalAssets: totalCount });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch asset total", error: err.message });
  }
});

app.listen(3000, () => console.log('AISM API running on Port 3000'));
