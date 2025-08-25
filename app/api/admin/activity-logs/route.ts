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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      let query = `
        SELECT al.id, al.action, al.details, al.ip_address, al.created_at,
               u.name as user_name, u.email as user_email, u.role as user_role
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      let paramCount = 0;

      if (action) {
        paramCount++;
        query += ` AND al.action = $${paramCount}`;
        queryParams.push(action);
      }

      if (userId) {
        paramCount++;
        query += ` AND al.user_id = $${paramCount}`;
        queryParams.push(userId);
      }

      if (startDate) {
        paramCount++;
        query += ` AND al.created_at >= $${paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND al.created_at <= $${paramCount}`;
        queryParams.push(endDate);
      }

      // Add ordering and pagination
      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM activity_logs al
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      paramCount = 0;

      if (action) {
        paramCount++;
        countQuery += ` AND al.action = $${paramCount}`;
        countParams.push(action);
      }

      if (userId) {
        paramCount++;
        countQuery += ` AND al.user_id = $${paramCount}`;
        countParams.push(userId);
      }

      if (startDate) {
        paramCount++;
        countQuery += ` AND al.created_at >= $${paramCount}`;
        countParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        countQuery += ` AND al.created_at <= $${paramCount}`;
        countParams.push(endDate);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return NextResponse.json({
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
