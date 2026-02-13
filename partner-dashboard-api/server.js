const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { pool, poolConnect } = require("./db");
// const {
//   hdPool,
//   hdPoolConnect,
//   tcoPool,
//   tcoPoolConnect
// } = require("./db");



console.log("ENV SERVER:", process.env.DB_SERVER);

const app = express();
app.use(cors());


/* =====================
   STATUS MAP
===================== */

const STATUS_MAP = {
  0: "Waiting",
  1: "In Progress",
  2: "Solved",
  3: "Unsolved",
  4: "Transferring",
  10: "Pending User",
  11: "Pending Vendor",
  12: "Pending Migration",
  13: "Pending Approval",
  14: "Rejected"
};


/* =====================
   INCIDENT LIST
===================== */

app.get("/api/incidents", async (req,res) => {

  await poolConnect;

  const q = `
  SELECT TOP 50
    request_no,
    title,
    user_name,
    request_status,

    DATEADD(HOUR,8,
      DATEADD(SECOND,request_time,'1970-01-01')
    ) AS created_time_my

  FROM HD_Request
  ORDER BY request_time DESC
  `;

  const r = await pool.request().query(q);

  const rows = r.recordset.map(x => ({
    ...x,
    status_name: STATUS_MAP[x.request_status] || "Unknown"
  }));

  res.json(rows);
});


/* =====================
   INCIDENT KPI
===================== */

app.get("/api/incidents/kpi", async (req,res) => {

  await poolConnect;

  const q = `
  SELECT
    COUNT(request_no) AS total_ticket,

    SUM(CASE
      WHEN request_status NOT IN (2,3,14)
       AND DATEADD(HOUR,8,
         DATEADD(SECOND,request_time,'1970-01-01')
       ) < DATEADD(DAY,-7,GETDATE())
      THEN 1 ELSE 0 END) AS overdue_ticket

  FROM HD_Request
  `;

  const r = await pool.request().query(q);
  res.json(r.recordset[0]);
});


/* =====================
   BRAND AGING (TCO3 / ASSET)
===================== */

app.get("/api/brand-aging", async (req,res) => {

  await poolConnect;

  const q = `
  WITH bios AS (

    SELECT
      cur.object_root_idn,
      CAST(val.object_value_str AS datetime) bios_date

    FROM tshi_object_current cur
    JOIN tshi_object_value val
      ON val.object_value_idn = cur.object_value_idn

    WHERE cur.object_field_idn = 14
  ),

  base AS (

    SELECT
      r.MadeCompany AS brand_name,

      CASE
        WHEN DATEDIFF(year,b.bios_date,GETDATE()) < 1 THEN 'New'
        WHEN DATEDIFF(year,b.bios_date,GETDATE()) < 3 THEN 'Young'
        WHEN DATEDIFF(year,b.bios_date,GETDATE()) < 5 THEN 'Mid-Life'
        WHEN DATEDIFF(year,b.bios_date,GETDATE()) < 7 THEN 'Mature'
        ELSE 'Legacy'
      END aging_bucket

    FROM ts_object_root r
    JOIN bios b
      ON b.object_root_idn = r.object_root_idn

    WHERE r.MadeCompany IS NOT NULL
  )

  SELECT
    brand_name,
    COUNT(*) total,
    SUM(CASE WHEN aging_bucket='New' THEN 1 ELSE 0 END) new_cnt,
    SUM(CASE WHEN aging_bucket='Young' THEN 1 ELSE 0 END) young_cnt,
    SUM(CASE WHEN aging_bucket='Mid-Life' THEN 1 ELSE 0 END) mid_cnt,
    SUM(CASE WHEN aging_bucket='Mature' THEN 1 ELSE 0 END) mature_cnt,
    SUM(CASE WHEN aging_bucket='Legacy' THEN 1 ELSE 0 END) legacy_cnt

  FROM base
  GROUP BY brand_name
  ORDER BY total DESC
  `;

  const r = await pool.request().query(q);
  res.json(r.recordset);

});


/* ===================== */

app.listen(4000, () =>
  console.log("API running port 4000")
);


