import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';
import { sendTicketUpdateNotification } from '@/utils/email';

export async function POST(
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

    const { response, status } = await request.json();
    const ticketId = parseInt(params.id);

    if (!response || response.trim().length === 0) {
      return NextResponse.json(
        { message: 'Response content is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Get ticket details and customer info
      const ticketResult = await client.query(
        `SELECT t.ticket_number, t.status as current_status, t.subject,
                u.name as customer_name, u.email as customer_email
         FROM tickets t
         JOIN users u ON t.customer_id = u.id
         WHERE t.id = $1`,
        [ticketId]
      );

      if (ticketResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Ticket not found' },
          { status: 404 }
        );
      }

      const ticket = ticketResult.rows[0];

      // Insert the response
      const responseResult = await client.query(
        `INSERT INTO ticket_responses (ticket_id, agent_id, response, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id, created_at`,
        [ticketId, decoded.userId, response.trim()]
      );

      // Update ticket status if provided
      let newStatus = ticket.current_status;
      if (status && ['open', 'pending', 'resolved'].includes(status)) {
        await client.query(
          `UPDATE tickets
           SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [status, ticketId]
        );
        newStatus = status;
      }

      // Log the response
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [decoded.userId, 'respond_to_ticket',
         `Responded to ticket ${ticket.ticket_number} with status update to ${newStatus}`,
         request.ip || 'unknown']
      );

      // Send email notification to customer
      try {
        await sendTicketUpdateNotification(
          ticket.customer_email,
          ticket.customer_name,
          ticket.ticket_number,
          newStatus,
          response.trim()
        );
      } catch (emailError) {
        console.error('Failed to send ticket update notification:', emailError);
        // Don't fail the response if email fails
      }

      return NextResponse.json({
        message: 'Response added successfully',
        response: {
          id: responseResult.rows[0].id,
          response: response.trim(),
          created_at: responseResult.rows[0].created_at,
          agent_id: decoded.userId,
          ticket_status: newStatus
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error adding response to ticket:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
