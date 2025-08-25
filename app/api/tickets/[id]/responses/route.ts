import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);

    if (isNaN(ticketId)) {
      return NextResponse.json(
        { message: 'Invalid ticket ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
                    // Get ticket responses with user names and roles
              const result = await client.query(
                `SELECT tr.id, tr.response, tr.created_at,
                        u.name as agent_name, u.role as agent_role
                 FROM ticket_responses tr
                 JOIN users u ON tr.agent_id = u.id
                 WHERE tr.ticket_id = $1
                 ORDER BY tr.created_at ASC`,
                [ticketId]
              );

      return NextResponse.json({
        responses: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching ticket responses:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
