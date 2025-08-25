import { NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET() {
  try {
    // Check database connectivity
    const client = await pool.connect();
    let dbStatus = 'healthy';
    
    try {
      await client.query('SELECT 1');
    } catch (error) {
      dbStatus = 'unhealthy';
    } finally {
      client.release();
    }

    // Check system status
    const systemStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    const statusCode = dbStatus === 'healthy' ? 200 : 503;
    
    return NextResponse.json(systemStatus, { status: statusCode });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      database: 'unknown'
    }, { status: 503 });
  }
}
