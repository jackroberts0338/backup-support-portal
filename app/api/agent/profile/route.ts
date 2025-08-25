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
      // Fetch the current user's profile
      const result = await client.query(
        `SELECT id, name, email, role, created_at
         FROM users 
         WHERE id = $1`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        profile: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching agent profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
