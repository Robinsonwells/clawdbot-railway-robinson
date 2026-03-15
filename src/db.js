import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // uncomment if your DB requires SSL
});

pool.on("error", (err) => {
  console.error("Unexpected PG client error", err);
});

export { pool };
