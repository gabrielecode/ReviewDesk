import { createPool } from './src/db/index.ts';

async function test() {
  console.log('Testing DB connection...');
  console.log('SQL_HOST:', process.env.SQL_HOST);
  console.log('SQL_USER:', process.env.SQL_USER);
  console.log('SQL_DB_NAME:', process.env.SQL_DB_NAME);
  
  const pool = createPool();
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
  } catch (err) {
    console.error('Failure:', err);
  } finally {
    await pool.end();
  }
}

test();
