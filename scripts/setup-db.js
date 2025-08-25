const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/backup_support_portal',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up database...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('admin', 'agent', 'customer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

                // Create tickets table
            await client.query(`
              CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_number VARCHAR(255) UNIQUE NOT NULL,
                customer_id INTEGER REFERENCES users(id),
                subject VARCHAR(500) NOT NULL,
                description TEXT NOT NULL,
                priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
                status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved')),
                attachment_path VARCHAR(500),
                assigned_agent_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);

            // Add assigned_agent_id column if it doesn't exist (for existing databases)
            try {
              await client.query('ALTER TABLE tickets ADD COLUMN assigned_agent_id INTEGER REFERENCES users(id)');
              console.log('Added assigned_agent_id column to tickets table');
            } catch (error) {
              // Column already exists, ignore error
              console.log('assigned_agent_id column already exists in tickets table');
            }

    // Create ticket_responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        agent_id INTEGER REFERENCES users(id),
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create system_status table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_status (
        id SERIAL PRIMARY KEY,
        primary_system_status VARCHAR(50) DEFAULT 'online',
        failover_activated BOOLEAN DEFAULT FALSE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user if not exists
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', ['admin@backupsupport.com']);
    
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, ['Admin User', 'admin@backupsupport.com', hashedPassword, 'admin']);
      
      console.log('Default admin user created: admin@backupsupport.com / admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Insert initial system status if not exists
    const statusExists = await client.query('SELECT id FROM system_status LIMIT 1');
    
    if (statusExists.rows.length === 0) {
      await client.query(`
        INSERT INTO system_status (primary_system_status, failover_activated, last_updated)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, ['online', false]);
      
      console.log('Initial system status created');
    } else {
      console.log('System status already exists');
    }

    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };

