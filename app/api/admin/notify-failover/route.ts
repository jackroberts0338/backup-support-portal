import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/database';
import { sendFailoverNotification } from '@/utils/email';

export async function POST(request: NextRequest) {
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

    const { isActive } = await request.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Send failover notification to all admins
    try {
      await sendFailoverNotification(isActive);
      
      // Log the notification
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO activity_logs (user_id, action, details, ip_address)
           VALUES ($1, $2, $3, $4)`,
          [decoded.userId, 'failover_notification',
           `Failover ${isActive ? 'activated' : 'deactivated'} - notifications sent to all admins`,
           request.ip || 'unknown']
        );
      } finally {
        client.release();
      }

      return NextResponse.json({
        message: 'Failover notifications sent successfully',
        failoverActive: isActive
      });

    } catch (error) {
      console.error('Error sending failover notifications:', error);
      return NextResponse.json(
        { message: 'Failed to send notifications', error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in failover notification:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
