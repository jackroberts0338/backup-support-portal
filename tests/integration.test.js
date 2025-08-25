const { setupDatabase } = require('../scripts/setup-db');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Test database configuration
const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/backup_support_portal_test',
  ssl: false,
});

describe('Backup Support Portal Integration Tests', () => {
  let testClient;
  let testUserId;
  let testTicketId;

  beforeAll(async () => {
    // Setup test database
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/backup_support_portal_test';
    await setupDatabase();
    
    testClient = await testPool.connect();
  });

  afterAll(async () => {
    if (testClient) {
      testClient.release();
    }
    await testPool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testClient.query('DELETE FROM activity_logs');
    await testClient.query('DELETE FROM ticket_responses');
    await testClient.query('DELETE FROM tickets');
    await testClient.query('DELETE FROM users WHERE email != $1', ['admin@backupsupport.com']);
  });

  describe('User Management', () => {
    test('should create a new customer user', async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      
      const result = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id, name, email, role
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);

      expect(result.rows[0]).toMatchObject({
        name: 'Test Customer',
        email: 'customer@test.com',
        role: 'customer'
      });
      
      testUserId = result.rows[0].id;
    });

    test('should create a new agent user', async () => {
      const hashedPassword = await bcrypt.hash('agentpass123', 10);
      
      const result = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id, name, email, role
      `, ['Test Agent', 'agent@test.com', hashedPassword, 'agent']);

      expect(result.rows[0]).toMatchObject({
        name: 'Test Agent',
        email: 'agent@test.com',
        role: 'agent'
      });
    });
  });

  describe('Ticket Management', () => {
    beforeEach(async () => {
      // Create a test customer
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const customerResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);
      
      testUserId = customerResult.rows[0].id;
    });

    test('should create a new support ticket', async () => {
      const result = await testClient.query(`
        INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id, ticket_number, subject, priority, status
      `, [
        'TKT-TEST-001',
        testUserId,
        'Test Issue',
        'This is a test support ticket',
        'medium',
        'open'
      ]);

      expect(result.rows[0]).toMatchObject({
        ticket_number: 'TKT-TEST-001',
        subject: 'Test Issue',
        priority: 'medium',
        status: 'open'
      });

      testTicketId = result.rows[0].id;
    });

    test('should update ticket status', async () => {
      // First create a ticket
      const ticketResult = await testClient.query(`
        INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        'TKT-TEST-002',
        testUserId,
        'Test Issue 2',
        'This is another test ticket',
        'high',
        'open'
      ]);

      const ticketId = ticketResult.rows[0].id;

      // Update status to pending
      const updateResult = await testClient.query(`
        UPDATE tickets
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, status
      `, ['pending', ticketId]);

      expect(updateResult.rows[0]).toMatchObject({
        id: ticketId,
        status: 'pending'
      });
    });
  });

  describe('Agent Responses', () => {
    beforeEach(async () => {
      // Create test customer and agent
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const customerResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);
      
      const agentResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Agent', 'agent@test.com', hashedPassword, 'agent']);

      testUserId = customerResult.rows[0].id;
      const agentId = agentResult.rows[0].id;

      // Create a test ticket
      const ticketResult = await testClient.query(`
        INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        'TKT-TEST-003',
        testUserId,
        'Test Issue 3',
        'This is a test ticket for responses',
        'medium',
        'open'
      ]);

      testTicketId = ticketResult.rows[0].id;
    });

    test('should add agent response to ticket', async () => {
      const agentId = (await testClient.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['agent'])).rows[0].id;

      const result = await testClient.query(`
        INSERT INTO ticket_responses (ticket_id, agent_id, response, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id, ticket_id, agent_id, response
      `, [
        testTicketId,
        agentId,
        'Thank you for your ticket. We are working on resolving this issue.'
      ]);

      expect(result.rows[0]).toMatchObject({
        ticket_id: testTicketId,
        agent_id: agentId,
        response: 'Thank you for your ticket. We are working on resolving this issue.'
      });
    });

    test('should retrieve ticket responses', async () => {
      const agentId = (await testClient.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['agent'])).rows[0].id;

      // Add a response first
      await testClient.query(`
        INSERT INTO ticket_responses (ticket_id, agent_id, response, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [
        testTicketId,
        agentId,
        'Test response from agent'
      ]);

      // Retrieve responses
      const result = await testClient.query(`
        SELECT tr.id, tr.response, tr.created_at,
               u.name as agent_name, u.role as agent_role
        FROM ticket_responses tr
        JOIN users u ON tr.agent_id = u.id
        WHERE tr.ticket_id = $1
        ORDER BY tr.created_at ASC
      `, [testTicketId]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        response: 'Test response from agent',
        agent_name: 'Test Agent',
        agent_role: 'agent'
      });
    });
  });

  describe('System Status', () => {
    test('should retrieve system status', async () => {
      const result = await testClient.query(`
        SELECT primary_system_status, failover_activated, last_updated
        FROM system_status
        ORDER BY id DESC
        LIMIT 1
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('primary_system_status');
      expect(result.rows[0]).toHaveProperty('failover_activated');
      expect(result.rows[0]).toHaveProperty('last_updated');
    });

    test('should update system status', async () => {
      const result = await testClient.query(`
        UPDATE system_status
        SET failover_activated = $1, primary_system_status = $2, last_updated = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM system_status ORDER BY id DESC LIMIT 1)
        RETURNING failover_activated, primary_system_status
      `, [true, 'offline']);

      expect(result.rows[0]).toMatchObject({
        failover_activated: true,
        primary_system_status: 'offline'
      });
    });
  });

  describe('Activity Logging', () => {
    test('should log user activity', async () => {
      const result = await testClient.query(`
        INSERT INTO activity_logs (user_id, action, details, ip_address, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id, action, details, ip_address
      `, [
        testUserId || 1,
        'test_action',
        'This is a test activity log entry',
        '127.0.0.1'
      ]);

      expect(result.rows[0]).toMatchObject({
        action: 'test_action',
        details: 'This is a test activity log entry',
        ip_address: '127.0.0.1'
      });
    });

    test('should retrieve activity logs with user information', async () => {
      // First create a user and log
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const userResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test User', 'user@test.com', hashedPassword, 'customer']);

      const userId = userResult.rows[0].id;

      await testClient.query(`
        INSERT INTO activity_logs (user_id, action, details, ip_address, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [userId, 'login', 'User logged in successfully', '127.0.0.1']);

      // Retrieve logs with user info
      const result = await testClient.query(`
        SELECT al.id, al.action, al.details, al.ip_address, al.created_at,
               u.name as user_name, u.email as user_email, u.role as user_role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        action: 'login',
        details: 'User logged in successfully',
        ip_address: '127.0.0.1',
        user_name: 'Test User',
        user_email: 'user@test.com',
        user_role: 'customer'
      });
    });
  });

  describe('Database Constraints', () => {
    test('should enforce unique ticket numbers', async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const customerResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);

      const customerId = customerResult.rows[0].id;

      // Create first ticket
      await testClient.query(`
        INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, ['TKT-DUPLICATE', customerId, 'First Ticket', 'First ticket description', 'medium', 'open']);

      // Try to create duplicate ticket number
      await expect(
        testClient.query(`
          INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, ['TKT-DUPLICATE', customerId, 'Second Ticket', 'Second ticket description', 'medium', 'open'])
      ).rejects.toThrow();
    });

    test('should enforce valid ticket priorities', async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const customerResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);

      const customerId = customerResult.rows[0].id;

      // Try to create ticket with invalid priority
      await expect(
        testClient.query(`
          INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, ['TKT-INVALID', customerId, 'Invalid Ticket', 'Invalid ticket description', 'invalid_priority', 'open'])
      ).rejects.toThrow();
    });

    test('should enforce valid ticket statuses', async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const customerResult = await testClient.query(`
        INSERT INTO users (name, email, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING id
      `, ['Test Customer', 'customer@test.com', hashedPassword, 'customer']);

      const customerId = customerResult.rows[0].id;

      // Try to create ticket with invalid status
      await expect(
        testClient.query(`
          INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, ['TKT-INVALID-STATUS', customerId, 'Invalid Status Ticket', 'Invalid status ticket description', 'medium', 'invalid_status'])
      ).rejects.toThrow();
    });
  });
});
