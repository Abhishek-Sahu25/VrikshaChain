// config/database.js - Updated for Neon PostgreSQL
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Neon PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon PostgreSQL
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased for cloud connection
});

const connectDB = async () => {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL successfully');
    
    // Check database version
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version.split(' ')[1]);
    
    client.release();
    
    // Initialize database schema
    await initializeSchema();
    await seedInitialData();
    
  } catch (error) {
    console.error('❌ Neon PostgreSQL connection failed:', error.message);
    console.error('🔍 Check your DATABASE_URL in .env file');
    throw error;
  }
};

const initializeSchema = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing database schema...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('COLLECTOR', 'LAB', 'PROCESSOR', 'MANUFACTURER', 'ADMIN', 'CONSUMER')),
        full_name VARCHAR(100),
        organization VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(50),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create file metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64) UNIQUE NOT NULL,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        upload_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table for JWT management
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_valid BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create geofences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS geofences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        coordinates JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create blockchain transactions log
    await client.query(`
      CREATE TABLE IF NOT EXISTS blockchain_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        function_name VARCHAR(50) NOT NULL,
        parameters JSONB NOT NULL,
        response JSONB,
        status VARCHAR(20) DEFAULT 'PENDING',
        submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create system settings table for Neon-specific configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance (optimized for Neon)
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_metadata_hash ON file_metadata(file_hash);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_tx_id ON blockchain_transactions(transaction_id);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_status ON blockchain_transactions(status);
    `);

    // Add updated_at trigger function for PostgreSQL
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
      CREATE TRIGGER update_system_settings_updated_at
        BEFORE UPDATE ON system_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database schema initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

const seedInitialData = async () => {
  const client = await pool.connect();
  
  try {
    // Check if admin user exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['ADMIN']
    );

    if (existingAdmin.rows.length === 0) {
      console.log('🌱 Seeding initial data...');
      
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await client.query(`
        INSERT INTO users (username, email, password, role, full_name, organization)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        'admin@supplychain.com',
        hashedPassword,
        'ADMIN',
        'System Administrator',
        'Supply Chain Corp'
      ]);

      // Create sample users for testing
      const sampleUsers = [
        ['farmer1', 'farmer1@test.com', 'COLLECTOR', 'John Farmer', 'Green Valley Farms'],
        ['lab1', 'lab1@test.com', 'LAB', 'Dr. Smith', 'Quality Testing Lab'],
        ['processor1', 'processor1@test.com', 'PROCESSOR', 'Mike Processor', 'Food Processing Inc'],
        ['manufacturer1', 'manufacturer1@test.com', 'MANUFACTURER', 'Sarah Johnson', 'Premium Products Ltd'],
        ['consumer1', 'consumer1@test.com', 'CONSUMER', 'Alice Consumer', 'General Public']
      ];

      for (const [username, email, role, fullName, org] of sampleUsers) {
        const defaultPassword = await bcrypt.hash('password123', 12);
        await client.query(`
          INSERT INTO users (username, email, password, role, full_name, organization)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [username, email, defaultPassword, role, fullName, org]);
      }

      // Create sample geofences for India
      const sampleGeofences = [
        {
          name: 'Maharashtra Organic Zone',
          description: 'Certified organic farming area in Maharashtra, India',
          coordinates: {
            type: 'Polygon',
            coordinates: [[[72.8, 18.9], [72.9, 18.9], [72.9, 19.0], [72.8, 19.0], [72.8, 18.9]]]
          }
        },
        {
          name: 'Kerala Spice Region',
          description: 'Traditional spice cultivation area in Kerala',
          coordinates: {
            type: 'Polygon',
            coordinates: [[[76.2, 10.0], [76.4, 10.0], [76.4, 10.2], [76.2, 10.2], [76.2, 10.0]]]
          }
        },
        {
          name: 'Punjab Wheat Belt',
          description: 'Primary wheat production region in Punjab',
          coordinates: {
            type: 'Polygon',
            coordinates: [[[75.0, 30.5], [75.5, 30.5], [75.5, 31.0], [75.0, 31.0], [75.0, 30.5]]]
          }
        }
      ];

      const adminUser = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
      const adminId = adminUser.rows[0].id;

      for (const geofence of sampleGeofences) {
        await client.query(`
          INSERT INTO geofences (name, description, coordinates, created_by)
          VALUES ($1, $2, $3, $4)
        `, [geofence.name, geofence.description, JSON.stringify(geofence.coordinates), adminId]);
      }

      // Add system settings for Neon-specific configurations
      const systemSettings = [
        {
          key: 'neon_region',
          value: { region: 'auto-detect', connection_pooling: true },
          description: 'Neon PostgreSQL region and connection settings'
        },
        {
          key: 'file_storage',
          value: { provider: 'local', max_size: 50 * 1024 * 1024, allowed_types: ['pdf', 'jpg', 'jpeg', 'png'] },
          description: 'File storage configuration'
        },
        {
          key: 'blockchain_config',
          value: { mode: 'mock', network: 'supply-chain', version: '1.0' },
          description: 'Blockchain integration settings'
        }
      ];

      for (const setting of systemSettings) {
        await client.query(`
          INSERT INTO system_settings (setting_key, setting_value, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP
        `, [setting.key, JSON.stringify(setting.value), setting.description]);
      }

      console.log('✅ Initial data seeded successfully');
      console.log('📋 Default Admin Credentials:');
      console.log('   Username: admin@supplychain.com');
      console.log('   Password: admin123');
      console.log('📋 Test User Credentials (password123 for all):');
      console.log('   farmer1@test.com, lab1@test.com, processor1@test.com');
      console.log('   manufacturer1@test.com, consumer1@test.com');
    } else {
      console.log('📋 Database already has initial data');
    }
    
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Health check function for Neon
const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

// Graceful shutdown for Neon connections
const closeDatabaseConnection = async () => {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

module.exports = {
  pool,
  connectDB,
  checkDatabaseHealth,
  closeDatabaseConnection
};