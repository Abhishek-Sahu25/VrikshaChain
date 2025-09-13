const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // Connect to PostgreSQL server (not the specific database)
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default database
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Check if database exists
    const dbName = process.env.DB_NAME || 'supply_chain_db';
    const dbExists = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbExists.rows.length === 0) {
      console.log(`Creating database: ${dbName}`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Database created successfully');
    } else {
      console.log('📋 Database already exists');
    }

    await adminPool.end();
    
    // Now run the main application to initialize schema
    console.log('🔄 Initializing database schema...');
    const { connectDB } = require('../config/database');
    await connectDB();
    
    console.log('✅ Database setup completed successfully');
    console.log('🚀 Ready to start the application!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };