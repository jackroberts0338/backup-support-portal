import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';
import { sendEmail } from '@/utils/email';

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

    // Check if user is customer
    if (decoded.role !== 'customer') {
      return NextResponse.json(
        { message: 'Access denied. Customer role required.' },
        { status: 403 }
      );
    }

    const { response } = await request.json();
    const ticketId = parseInt(params.id);

    if (!response || response.trim().length === 0) {
      return NextResponse.json(
        { message: 'Response content is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Get ticket details and verify ownership
      const ticketResult = await client.query(
        `SELECT t.ticket_number, t.status, t.subject, t.assigned_agent_id,
                u.name as customer_name, u.email as customer_email
         FROM tickets t
         JOIN users u ON t.customer_id = u.id
         WHERE t.id = $1 AND t.customer_id = $2`,
        [ticketId, decoded.userId]
      );

      if (ticketResult.rows.length === 0) {
        return NextResponse.json(
          { message: 'Ticket not found or access denied' },
          { status: 404 }
        );
      }

      const ticket = ticketResult.rows[0];

      // Insert the customer response
      const responseResult = await client.query(
        `INSERT INTO ticket_responses (ticket_id, agent_id, response, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id, created_at`,
        [ticketId, decoded.userId, response.trim()]
      );

      // Update ticket status to 'pending' if it was 'open'
      if (ticket.status === 'open') {
        await client.query(
          `UPDATE tickets
           SET status = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          ['pending', ticketId]
        );
      }

      // Log the customer response
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [decoded.userId, 'customer_response',
         `Customer responded to ticket ${ticket.ticket_number}`,
         request.ip || 'unknown']
      );

      // Send email notification to assigned agent (if any)
      if (ticket.assigned_agent_id) {
        try {
          const agentResult = await client.query(
            'SELECT name, email FROM users WHERE id = $1',
            [ticket.assigned_agent_id]
          );

          if (agentResult.rows.length > 0) {
            const agent = agentResult.rows[0];
            await sendTicketUpdateNotification({
              to: agent.email,
              subject: `Customer Response - ${ticket.ticket_number}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Customer Response Received</h2>
                  <p>Hello ${agent.name},</p>
                  <p>The customer has responded to ticket <strong>${ticket.ticket_number}</strong>:</p>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Customer Response:</strong></p>
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0;">
                      ${response.trim()}
                    </div>
                  </div>
                  <p>Please log into the agent dashboard to respond to this customer.</p>
                  <p>Thank you!</p>
                </div>
              `
            });
          }
        } catch (emailError) {
          console.error('Failed to send agent notification:', emailError);
          // Don't fail the response if email fails
        }
      }

      return NextResponse.json({
        message: 'Response sent successfully',
        response: {
          id: responseResult.rows[0].id,
          response: response.trim(),
          created_at: responseResult.rows[0].created_at,
          agent_id: decoded.userId,
          ticket_status: ticket.status === 'open' ? 'pending' : ticket.status
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error adding customer response:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
