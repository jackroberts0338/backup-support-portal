const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/backup_support_portal',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createTestAgents() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test agent users...');

    // Test agent 1
    const hashedPassword1 = await bcrypt.hash('agent123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING
    `, ['Test Agent 1', 'agent1@test.com', hashedPassword1, 'agent']);

    // Test agent 2
    const hashedPassword2 = await bcrypt.hash('agent123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING
    `, ['Test Agent 2', 'agent2@test.com', hashedPassword2, 'agent']);

    // Test agent 3
    const hashedPassword3 = await bcrypt.hash('agent123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING
    `, ['Test Agent 3', 'agent3@test.com', hashedPassword3, 'agent']);

    console.log('✅ Test agents created successfully!');
    console.log('📧 Test agent credentials:');
    console.log('   - agent1@test.com / agent123');
    console.log('   - agent2@test.com / agent123');
    console.log('   - agent3@test.com / agent123');
    
    // Verify agents were created
    const result = await client.query('SELECT name, email, role FROM users WHERE role = $1', ['agent']);
    console.log(`\n📊 Total agents in system: ${result.rows.length}`);
    result.rows.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.email})`);
    });

  } catch (error) {
    console.error('❌ Error creating test agents:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createTestAgents()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestAgents };
