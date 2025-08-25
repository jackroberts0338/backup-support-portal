# Backup Support Portal

A comprehensive backup support system built with Next.js, featuring failover capabilities, ticket management, and real-time communication between customers and agents.

## Features

### Core Functionality
- **User Authentication & Role Management**: Admin, Agent, and Customer roles with secure JWT authentication
- **Support Ticket System**: Create, track, and manage support tickets with priority levels
- **Failover System**: Automatic failover activation when primary system goes down
- **Email Notifications**: Automated email alerts for ticket updates and system status changes

### New Features (Latest Update)
- **Ticket Assignment**: Admins can assign tickets to specific agents for better workload distribution
- **Chat-like Communication**: Customers and agents can have real-time conversations similar to Jira
- **Customer Responses**: Customers can now respond to agent messages, creating a two-way conversation
- **Agent Dashboard**: Agents see only their assigned tickets plus unassigned tickets they can pick up

### Admin Capabilities
- View all system tickets and assign them to agents
- Monitor system health and toggle failover mode
- Manage user accounts (create, view, modify)
- View comprehensive activity logs
- Access system statistics and analytics

### Agent Capabilities
- View assigned tickets and unassigned tickets
- Respond to customer inquiries
- Update ticket status (open, pending, resolved)
- Engage in chat-like conversations with customers

### Customer Capabilities
- Submit support tickets with attachments
- View ticket status and history
- Respond to agent messages
- Track conversation history in a chat-like interface

## Technical Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens with role-based access control
- **Email**: Nodemailer with SMTP support
- **File Uploads**: Local file storage with UUID naming
- **Testing**: Jest with comprehensive test coverage

## Database Schema

### Core Tables
- `users`: User accounts with roles and authentication
- `tickets`: Support tickets with priority, status, and assignment
- `ticket_responses`: Conversation history between customers and agents
- `system_status`: System health and failover status
- `activity_logs`: Comprehensive audit trail of all system activities

### Key Relationships
- Tickets are linked to customers and optionally assigned to agents
- Responses are linked to tickets and users (customers or agents)
- All activities are logged with user context and IP addresses

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- SMTP server for email notifications

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backup-support-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run setup-db
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT
JWT_SECRET=your-secret-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# System
NODE_ENV=development
```

## Usage

### Default Admin Account
- **Email**: admin@backupsupport.com
- **Password**: admin123

### Workflow Examples

#### Ticket Assignment (Admin)
1. Login as admin
2. Navigate to "Ticket Management" tab
3. View all tickets with customer and agent information
4. Click "Assign" on any ticket
5. Select an agent from the dropdown
6. Confirm assignment

#### Customer-Agent Conversation
1. Customer submits a ticket
2. Admin assigns ticket to an agent
3. Agent responds via agent dashboard (tabbed interface)
4. Customer can reply via customer dashboard
5. Conversation continues in chat-like interface
6. Agent updates ticket status as needed

#### Agent Dashboard (Tabbed Interface)
1. Agent logs into dashboard
2. Views tabs: "Unassigned Tickets" + individual agent tabs
3. Each agent tab shows only tickets assigned to that specific agent
4. Agents can only respond to their assigned tickets
5. Admin can see all tabs and manage all tickets

#### Failover Management
1. Admin monitors system status
2. Toggle failover mode when primary system is down
3. Automatic email notifications sent to all admins
4. Monitor ticket volume and agent availability
5. Deactivate failover when primary system recovers

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Tickets
- `POST /api/tickets/create` - Create new ticket
- `GET /api/tickets/my-tickets` - Get customer's tickets
- `GET /api/tickets/search` - Search tickets publicly
- `GET /api/tickets/[id]/responses` - Get ticket responses
- `POST /api/tickets/[id]/customer-respond` - Customer response

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - User management
- `POST /api/admin/users` - Create users
- `GET /api/admin/tickets` - View all tickets
- `PUT /api/admin/tickets/[id]/assign` - Assign ticket to agent
- `GET /api/admin/activity-logs` - Activity logs
- `POST /api/admin/notify-failover` - Failover notifications

### Agent
- `GET /api/agent/tickets` - Get assigned tickets
- `PUT /api/agent/tickets/[id]/status` - Update ticket status
- `POST /api/agent/tickets/[id]/respond` - Agent response
- `GET /api/agent/users` - Get list of all agents (for tabbed dashboard)
- `GET /api/agent/profile` - Get current agent's profile information

### System
- `GET /api/system/status` - System status
- `PUT /api/system/status` - Update system status
- `GET /api/health` - Health check

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Considerations
- Set `NODE_ENV=production`
- Configure production database with SSL
- Set up production SMTP server
- Configure proper JWT secrets
- Set up file upload directory permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository or contact the development team.
