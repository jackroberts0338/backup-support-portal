import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Get total users
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = parseInt(usersResult.rows[0].count);

      // Get total tickets
      const ticketsResult = await client.query('SELECT COUNT(*) as count FROM tickets');
      const totalTickets = parseInt(ticketsResult.rows[0].count);

      // Get open tickets
      const openTicketsResult = await client.query(
        "SELECT COUNT(*) as count FROM tickets WHERE status IN ('open', 'pending')"
      );
      const openTickets = parseInt(openTicketsResult.rows[0].count);

      // Get resolved tickets
      const resolvedTicketsResult = await client.query(
        "SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'"
      );
      const resolvedTickets = parseInt(resolvedTicketsResult.rows[0].count);

      return NextResponse.json({
        totalUsers,
        totalTickets,
        openTickets,
        resolvedTickets
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      totalUsers: 0,
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0
    });
  }
}
