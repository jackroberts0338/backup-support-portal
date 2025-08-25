import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT primary_system_status, failover_activated, last_updated FROM system_status ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        return NextResponse.json({
          primarySystem: 'online',
          failoverActivated: false,
          lastUpdated: new Date().toISOString()
        });
      }

      const status = result.rows[0];
      
      return NextResponse.json({
        primarySystem: status.primary_system_status,
        failoverActivated: status.failover_activated,
        lastUpdated: status.last_updated
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json({
      primarySystem: 'online',
      failoverActivated: false,
      lastUpdated: new Date().toISOString()
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { primarySystemStatus, failoverActivated } = await request.json();

    if (primarySystemStatus === undefined || failoverActivated === undefined) {
      return NextResponse.json(
        { message: 'primarySystemStatus and failoverActivated are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE system_status 
         SET primary_system_status = $1, failover_activated = $2, last_updated = CURRENT_TIMESTAMP 
         WHERE id = (SELECT id FROM system_status ORDER BY id DESC LIMIT 1)`
        , [primarySystemStatus, failoverActivated]
      );

      return NextResponse.json({
        message: 'System status updated successfully',
        primarySystem: primarySystemStatus,
        failoverActivated,
        lastUpdated: new Date().toISOString()
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('System status update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
