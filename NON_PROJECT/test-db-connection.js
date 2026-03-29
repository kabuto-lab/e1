const postgres = require('postgres');

async function testConnection() {
  const sql = postgres('postgresql://postgres:postgres@localhost:5432/companion_db');
  
  try {
    console.log('Connecting to PostgreSQL...');
    const result = await sql`SELECT 1 as test`;
    console.log('✓ Query successful:', result);
    
    await sql.end();
    console.log('✓ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
