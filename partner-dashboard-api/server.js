const express = require('express');
const cors = require('cors');
const { pool70, pool51, getConnection } = require('./db'); // Match names here
const app = express();

app.use(cors());

app.get('/api/incidents', async (req, res) => {
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
