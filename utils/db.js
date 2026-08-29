const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    const useSSL = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase');
    // Vercel spins up many lambdas. pg's default max of 10 per instance
    // exhausts Supabase's 200-connection cap (EMAXCONN) and email unlock
    // starts returning 500s ("Try again").
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 4000,
      allowExitOnIdle: true
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
