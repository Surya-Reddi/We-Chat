import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default pool;

// const { Pool } = require("pg");

// const pool = new Pool({
//     user: "postgres",
//     host: "localhost",
//     database: "postgres",
//     password: "Surya123$",
//     port: 5432,
// });

// module.exports = pool;