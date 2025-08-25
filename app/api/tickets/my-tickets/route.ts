import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
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

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, 
                t.created_at, t.attachment_path
         FROM tickets t
         JOIN users u ON t.customer_id = u.id
         WHERE u.email = $1
         ORDER BY t.created_at DESC`,
        [decoded.email]
      );

      return NextResponse.json({
        tickets: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
