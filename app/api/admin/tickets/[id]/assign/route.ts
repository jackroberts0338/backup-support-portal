import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';

// Assign ticket to agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { agent_id } = await request.json();
    const ticketId = parseInt(params.id);

    if (!agent_id || isNaN(agent_id)) {
      return NextResponse.json(
        { message: 'Valid agent ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Verify the agent exists and is actually an agent
      const agentResult = await client.query(
        'SELECT id, name, email FROM users WHERE id = $1 AND role = $2',
        [agent_id, 'agent']
      );

      if (agentResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Agent not found or invalid role' },
          { status: 404 }
        );
      }

      // Verify the ticket exists
      const ticketResult = await client.query(
        'SELECT id, ticket_number, customer_id FROM tickets WHERE id = $1',
        [ticketId]
      );

      if (ticketResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Ticket not found' },
          { status: 404 }
        );
      }

      // Assign the ticket to the agent
      await client.query(
        `UPDATE tickets 
         SET assigned_agent_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [agent_id, ticketId]
      );

      // Log the assignment
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [decoded.userId, 'assign_ticket',
         `Ticket ${ticketResult.rows[0].ticket_number} assigned to agent ${agentResult.rows[0].name}`,
         request.ip || 'unknown']
      );

      return NextResponse.json({
        message: 'Ticket assigned successfully',
        ticket_id: ticketId,
        agent_id: agent_id,
        agent_name: agentResult.rows[0].name
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error assigning ticket:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
