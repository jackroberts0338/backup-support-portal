import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { ticketNumber, email } = await request.json();

    if (!ticketNumber || !email) {
      return NextResponse.json(
        { message: 'Ticket number and email are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, 
                t.created_at, t.updated_at, t.attachment_path
         FROM tickets t
         JOIN users u ON t.customer_id = u.id
         WHERE t.ticket_number = $1 AND u.email = $2`,
        [ticketNumber, email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: 'Ticket not found. Please check your ticket number and email address.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ticket: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Ticket search error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
