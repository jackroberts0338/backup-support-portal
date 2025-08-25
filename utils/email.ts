import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email function
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email not configured. Skipping email send.');
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Backup Support Portal" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send failover notification to admins
export const sendFailoverNotification = async (isActive: boolean): Promise<void> => {
  try {
    const subject = isActive 
      ? '🚨 FAILOVER ACTIVATED - Primary Support System is Down'
      : '✅ FAILOVER DEACTIVATED - Primary Support System is Back Online';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isActive ? '#dc2626' : '#059669'};">
          ${isActive ? '🚨 FAILOVER SYSTEM ACTIVATED' : '✅ FAILOVER SYSTEM DEACTIVATED'}
        </h2>
        <p><strong>Status:</strong> ${isActive ? 'ACTIVE' : 'INACTIVE'}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Primary System Status:</strong> ${isActive ? 'OFFLINE' : 'ONLINE'}</p>
        ${isActive ? `
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Action Required:</h3>
            <ul>
              <li>Monitor incoming tickets closely</li>
              <li>Ensure all agents are available</li>
              <li>Check system performance</li>
              <li>Prepare for increased ticket volume</li>
            </ul>
          </div>
        ` : `
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #059669; margin-top: 0;">System Normalized:</h3>
            <ul>
              <li>Primary support system is operational</li>
              <li>Backup portal can be deactivated</li>
              <li>Monitor for any remaining issues</li>
            </ul>
          </div>
        `}
        <p>This is an automated notification from the Backup Support Portal system.</p>
      </div>
    `;

    // Get all admin users
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT email FROM users WHERE role = $1',
        ['admin']
      );

      for (const admin of result.rows) {
        await sendEmail({
          to: admin.email,
          subject,
          html
        });
      }
    } finally {
      client.release();
      pool.end();
    }

  } catch (error) {
    console.error('Error sending failover notification:', error);
  }
};

// Send ticket status update notification
export const sendTicketUpdateNotification = async (
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  status: string,
  agentResponse?: string
): Promise<void> => {
  try {
    const statusColors = {
      open: '#2563eb',
      pending: '#d97706',
      resolved: '#059669'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColors[status as keyof typeof statusColors] || '#6b7280'};">
          Ticket Status Update - ${ticketNumber}
        </h2>
        <p>Dear ${customerName},</p>
        <p>Your support ticket has been updated:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
          <p><strong>New Status:</strong> <span style="color: ${statusColors[status as keyof typeof statusColors] || '#6b7280'}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
          ${agentResponse ? `
            <p><strong>Agent Response:</strong></p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 10px 0;">
              ${agentResponse}
            </div>
          ` : ''}
        </div>
        <p>You can check the full status of your ticket anytime by visiting our ticket status page.</p>
        <p>Thank you for using our backup support portal.</p>
      </div>
    `;

    await sendEmail({
      to: customerEmail,
      subject: `Ticket Update - ${ticketNumber} - Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      html
    });

  } catch (error) {
    console.error('Error sending ticket update notification:', error);
  }
};
