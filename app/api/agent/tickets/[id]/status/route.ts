import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';

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

    // Check if user is agent or admin
    if (decoded.role !== 'agent' && decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Agent or admin role required.' },
        { status: 403 }
      );
    }

    const { status } = await request.json();
    const ticketId = parseInt(params.id);

    if (!status || !['open', 'pending', 'resolved'].includes(status)) {
      return NextResponse.json(
        { message: 'Valid status required: open, pending, or resolved' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Update ticket status
      const result = await client.query(
        `UPDATE tickets 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, ticket_number, status`,
        [status, ticketId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: 'Ticket not found' },
          { status: 404 }
        );
      }

      // Log the status update
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address) 
         VALUES ($1, $2, $3, $4)`,
        [decoded.userId, 'update_ticket_status', 
         `Ticket ${result.rows[0].ticket_number} status updated to ${status}`, 
         request.ip || 'unknown']
      );

      return NextResponse.json({
        message: 'Ticket status updated successfully',
        ticket: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
