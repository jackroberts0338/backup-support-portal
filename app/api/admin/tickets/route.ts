import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';

// Get all tickets for admin view
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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, 
                t.created_at, t.updated_at, t.assigned_agent_id,
                c.name as customer_name, c.email as customer_email,
                a.name as assigned_agent_name
         FROM tickets t
         JOIN users c ON t.customer_id = c.id
         LEFT JOIN users a ON t.assigned_agent_id = a.id
         ORDER BY 
           CASE t.priority 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
           END,
           t.created_at DESC`
      );

      return NextResponse.json({
        tickets: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
