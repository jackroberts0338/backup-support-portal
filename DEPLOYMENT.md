# Deployment Guide - Backup Support Portal

This guide provides step-by-step instructions for deploying the Backup Support Portal to production environments.

## 🚀 Prerequisites

Before deployment, ensure you have:

- **Node.js 18.17.0+** installed on your server
- **PostgreSQL 12+** database server running
- **Domain name** (optional but recommended)
- **SSL certificate** for HTTPS (recommended)
- **Server access** (SSH for Linux/Mac, RDP for Windows)

## 🌐 Deployment Options

### Option 1: Traditional Server Deployment
- **VPS/Dedicated Server** (DigitalOcean, AWS EC2, Linode)
- **Shared Hosting** (with Node.js support)
- **On-premises Server**

### Option 2: Cloud Platform Deployment
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Heroku**

### Option 3: Container Deployment
- **Docker** with Docker Compose
- **Kubernetes**
- **AWS ECS/Fargate**

## 📋 Pre-Deployment Checklist

- [ ] Database schema is ready
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] File upload directory permissions set
- [ ] Email service configured
- [ ] Backup strategy planned

## 🗄 Database Setup

### 1. Create Production Database
```sql
CREATE DATABASE backup_support_portal;
CREATE USER backup_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE backup_support_portal TO backup_user;
```

### 2. Run Database Setup Script
```bash
# Set production environment variables
export DATABASE_URL="postgresql://backup_user:secure_password@localhost:5432/backup_support_portal"

# Run setup script
npm run db:setup
```

## ⚙️ Environment Configuration

Create `.env.production` file:

```env
# Database Configuration
DATABASE_URL=postgresql://backup_user:secure_password@your-db-host:5432/backup_support_portal

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-strong-production-jwt-secret-here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-production-email@gmail.com
SMTP_PASS=your-app-specific-password

# App Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-nextauth-secret

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# System Status
PRIMARY_SYSTEM_STATUS=online
FAILOVER_ACTIVATED=false

# Production Settings
NODE_ENV=production
PORT=3000
```

## 🚀 Deployment Steps

### Step 1: Build the Application
```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### Step 2: Start Production Server
```bash
# Start the production server
npm start
```

### Step 3: Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "backup-support-portal" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    location /uploads {
        alias /path/to/your/app/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📁 File Upload Configuration

### 1. Create Upload Directory
```bash
mkdir -p /var/www/backup-support-portal/uploads
chown -R node:node /var/www/backup-support-portal/uploads
chmod 755 /var/www/backup-support-portal/uploads
```

### 2. Update Environment Variables
```env
UPLOAD_DIR=/var/www/backup-support-portal/uploads
```

## 📧 Email Service Setup

### 1. Gmail Setup
1. Enable 2-factor authentication
2. Generate app-specific password
3. Use app password in SMTP configuration

### 2. SendGrid Setup
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### 3. AWS SES Setup
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

## 🔄 Failover Configuration

### 1. Health Check Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
}
```

### 2. Load Balancer Configuration
```nginx
upstream backup_support {
    server localhost:3000;
    server localhost:3001 backup;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://backup_support;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
}
```

## 📊 Monitoring & Logging

### 1. Application Logs
```bash
# PM2 logs
pm2 logs backup-support-portal

# Application logs
tail -f /var/log/backup-support-portal/app.log
```

### 2. Database Monitoring
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Connection monitoring
watch -n 1 "psql -U backup_user -d backup_support_portal -c 'SELECT count(*) FROM pg_stat_activity;'"
```

### 3. System Monitoring
```bash
# System resources
htop
iotop
nethogs

# Disk usage
df -h
du -sh /var/www/backup-support-portal/uploads/*
```

## 🔄 Backup Strategy

### 1. Database Backups
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/database"
DB_NAME="backup_support_portal"

mkdir -p $BACKUP_DIR
pg_dump -U backup_user $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### 2. File Upload Backups
```bash
#!/bin/bash
# /usr/local/bin/backup-uploads.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/uploads"
UPLOADS_DIR="/var/www/backup-support-portal/uploads"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOADS_DIR .

# Keep only last 30 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete
```

### 3. Automated Backup Cron Jobs
```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-db.sh
0 3 * * * /usr/local/bin/backup-uploads.sh
```

## 🚨 Emergency Procedures

### 1. System Failure Response
1. **Immediate Actions**
   - Check system logs
   - Verify database connectivity
   - Check disk space
   - Monitor system resources

2. **Failover Activation**
   - Log into admin dashboard
   - Activate failover mode
   - Notify stakeholders
   - Monitor backup system performance

3. **Recovery Steps**
   - Identify root cause
   - Fix primary system
   - Test functionality
   - Deactivate failover
   - Restore normal operations

### 2. Database Recovery
```bash
# Restore from backup
psql -U backup_user -d backup_support_portal < /var/backups/database/backup_YYYYMMDD_HHMMSS.sql
```

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
```

### 2. Application Optimization
```typescript
// Enable compression
import compression from 'next-compression';

// Enable caching
export const revalidate = 3600; // 1 hour
```

### 3. CDN Configuration
```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Test connection
   psql -h localhost -U backup_user -d backup_support_portal
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **File Upload Issues**
   ```bash
   # Check permissions
   ls -la /var/www/backup-support-portal/uploads
   
   # Check disk space
   df -h
   ```

4. **Memory Issues**
   ```bash
   # Monitor memory usage
   free -h
   
   # Check Node.js memory
   pm2 monit
   ```

## 📞 Support & Maintenance

### 1. Regular Maintenance Tasks
- [ ] Weekly database backups
- [ ] Monthly log rotation
- [ ] Quarterly security updates
- [ ] Annual SSL certificate renewal

### 2. Monitoring Alerts
- [ ] System resource usage
- [ ] Database connection status
- [ ] Application response time
- [ ] Error rate monitoring

### 3. Update Procedures
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart with PM2
pm2 restart backup-support-portal
```

---

**Remember**: This is a backup support system that needs to be reliable during critical situations. Regular testing of the failover system is essential to ensure it works when needed most.
