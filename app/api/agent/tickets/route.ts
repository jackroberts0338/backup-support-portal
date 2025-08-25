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

    // Check if user is agent or admin
    if (decoded.role !== 'agent' && decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Agent or admin role required.' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    
    try {
      // If user is admin, show all tickets. If agent, show only assigned tickets plus unassigned
      let query: string;
      let params: any[];

      if (decoded.role === 'admin') {
        query = `
          SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, 
                  t.created_at, t.attachment_path, t.assigned_agent_id,
                  u.name as customer_name, u.email as customer_email
           FROM tickets t
           JOIN users u ON t.customer_id = u.id
           ORDER BY 
             CASE t.priority 
               WHEN 'critical' THEN 1 
               WHEN 'high' THEN 2 
               WHEN 'medium' THEN 3 
               WHEN 'low' THEN 4 
               ELSE 5 
             END,
             t.created_at DESC
        `;
        params = [];
      } else {
        query = `
          SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, 
                  t.created_at, t.attachment_path, t.assigned_agent_id,
                  u.name as customer_name, u.email as customer_email
           FROM tickets t
           JOIN users u ON t.customer_id = u.id
           WHERE t.assigned_agent_id = $1 OR t.assigned_agent_id IS NULL
           ORDER BY 
             CASE t.priority 
               WHEN 'critical' THEN 1 
               WHEN 'high' THEN 2 
               WHEN 'medium' THEN 3 
               WHEN 'low' THEN 4 
               ELSE 5 
             END,
             t.created_at DESC
        `;
        params = [decoded.userId];
      }

      const result = await client.query(query, params);

      return NextResponse.json({
        tickets: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching agent tickets:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
