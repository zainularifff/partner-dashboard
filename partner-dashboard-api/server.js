const express = require('express');
const cors = require('cors');
const { pool70, pool51, poolTCO70, poolTCO51, getConnection } = require('./db'); // Match names here
const app = express();

app.use(cors());

app.get('/api/dashboard', async (req, res) => {
  try {
    const p70 = await getConnection(pool70);
    const p51 = await getConnection(pool51);

    const results = await Promise.allSettled([
      p70.request().query('SELECT * FROM HD_REQUEST'),
      p51.request().query('SELECT * FROM HD_REQUEST')
    ]);

    let combinedData = [];

    // Process .70
    if (results[0].status === 'fulfilled') {
      const data70 = results[0].value.recordset.map(row => ({ 
        ...row, origin_ip: '192.168.140.70' 
      }));
      combinedData = [...combinedData, ...data70];
    }

    // Process .51
    if (results[1].status === 'fulfilled') {
      const data51 = results[1].value.recordset.map(row => ({ 
        ...row, origin_ip: '192.168.140.51' 
      }));
      combinedData = [...combinedData, ...data51];
    }

    res.json(combinedData);

  } catch (err) {
    console.error("DEBUG ERROR:", err); 
    res.status(500).json({ 
      message: "Database Connection Failed", 
      error: err.message 
    });
  }
});

app.listen(3000, () => console.log('AISM API running on Port 3000'));

// --- NEW ENDPOINT: TOTAL ASSETS ---
app.get('/api/assets/total', async (req, res) => {
  try {
    // 1. Get connections for the TCO databases
    const pTCO70 = await getConnection(poolTCO70); // TCO3 on .70
    const pTCO51 = await getConnection(poolTCO51); // TCO on .51

    const queryStr = 'SELECT COUNT(object_root_idn) as count FROM TS_OBJECT_ROOT';

    // 2. Run queries in parallel
    const results = await Promise.allSettled([
      pTCO70.request().query(queryStr),
      pTCO51.request().query(queryStr)
    ]);

    let totalCount = 0;

    // 3. Sum the count from Server .70
    if (results[0].status === 'fulfilled') {
      totalCount += results[0].value.recordset[0].count;
    }

    // 4. Sum the count from Server .51
    if (results[1].status === 'fulfilled') {
      totalCount += results[1].value.recordset[0].count;
    }

    // 5. Return the total
    res.json({ totalAssets: totalCount });

  } catch (err) {
    console.error("ASSET FETCH ERROR:", err);
    res.status(500).json({ 
      message: "Failed to fetch asset total", 
      error: err.message 
    });
  }
});
