import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/database';
import { sendEmail } from '@/utils/email';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!name || !email || !subject || !description || !priority) {
      return NextResponse.json(
        { message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if customer exists, create if not
      let customerResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      let customerId: number;

      if (customerResult.rows.length === 0) {
        const newCustomerResult = await client.query(
          'INSERT INTO users (name, email, role, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
          [name, email, 'customer']
        );
        customerId = newCustomerResult.rows[0].id;
      } else {
        customerId = customerResult.rows[0].id;
      }

      // Generate unique ticket number
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Handle file attachment
      let attachmentPath: string | null = null;
      if (attachment && attachment.size > 0) {
        const uploadDir = join(process.cwd(), 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${uuidv4()}-${attachment.name}`;
        attachmentPath = join(uploadDir, fileName);

        const bytes = await attachment.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(attachmentPath, buffer);
      }

      // Create ticket
      const ticketResult = await client.query(
        `INSERT INTO tickets (ticket_number, customer_id, subject, description, priority, status, attachment_path, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING id, ticket_number`,
        [ticketNumber, customerId, subject, description, priority, 'open', attachmentPath]
      );

      const ticket = ticketResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activity_logs (user_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [customerId, 'create_ticket', `Ticket ${ticketNumber} created`, request.ip || 'unknown']
      );

      // Send confirmation email to customer
      try {
        await sendEmail({
          to: email,
          subject: `Ticket Confirmation - ${ticketNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Ticket Submitted Successfully</h2>
              <p>Dear ${name},</p>
              <p>Your support ticket has been submitted successfully. Here are the details:</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Priority:</strong> ${priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
                <p><strong>Description:</strong> ${description}</p>
                <p><strong>Status:</strong> Open</p>
              </div>
              <p>You can check the status of your ticket anytime by visiting our ticket status page.</p>
              <p>We'll notify you when there are updates to your ticket.</p>
              <p>Thank you for using our backup support portal.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the ticket creation if email fails
      }

      // Send notification to all agents and admins
      try {
        const agentsResult = await client.query(
          'SELECT email, name FROM users WHERE role IN ($1, $2)',
          ['agent', 'admin']
        );

        for (const agent of agentsResult.rows) {
          await sendEmail({
            to: agent.email,
            subject: `New Support Ticket - ${ticketNumber}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">New Support Ticket</h2>
                <p>A new support ticket has been submitted:</p>
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                  <p><strong>Customer:</strong> ${name} (${email})</p>
                  <p><strong>Subject:</strong> ${subject}</p>
                  <p><strong>Priority:</strong> ${priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
                  <p><strong>Description:</strong> ${description}</p>
                </div>
                <p>Please log into the agent dashboard to respond to this ticket.</p>
              </div>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send agent notifications:', emailError);
        // Don't fail the ticket creation if email fails
      }

      return NextResponse.json({
        message: 'Ticket created successfully',
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
