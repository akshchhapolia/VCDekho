const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    const useSSL = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    });
} else {
    console.warn("WARNING: DATABASE_URL is not set. Database connections will fail.");
}

module.exports = {
  query: (text, params) => {
      if (!pool) throw new Error("Database not configured. Set DATABASE_URL.");
      return pool.query(text, params);
  },
  get pool() { return pool; }
};
