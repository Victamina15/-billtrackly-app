# BillTracky Production Deployment Guide

## 🚀 Production Environment Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Supabase, AWS RDS, or similar)
- Domain name (billtracky.com)
- Email service (Resend) account
- SSL certificate

### Environment Variables

Create a `.env` file with the following variables:

```env
# Environment
NODE_ENV=production

# Server Configuration
PORT=3000
APP_URL=https://billtracky.com

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Email Configuration
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@billtracky.com

# Security (Generate strong random strings)
SESSION_SECRET=your_super_secure_session_secret_here
JWT_SECRET=your_jwt_secret_here
```

## 🛠️ Deployment Steps

### 1. Build the Application
```bash
npm install --production
npm run build
```

### 2. Database Setup
```bash
# Push database schema
npm run db:push
```

### 3. Start Production Server
```bash
npm start
```

## 🔧 Common Production Issues & Fixes

### Issue 1: Database Connection Errors
**Symptoms**: Server fails to start, database connection timeouts
**Solution**:
- Verify DATABASE_URL is correct
- Check firewall rules allow connections
- Ensure SSL mode is configured correctly
- Test connection: `psql $DATABASE_URL`

### Issue 2: Email Service Not Working
**Symptoms**: Registration succeeds but no email sent
**Solution**:
- Verify RESEND_API_KEY is valid
- Check domain verification in Resend dashboard
- Ensure FROM_EMAIL domain is verified
- Test with curl:
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@billtracky.com","to":"test@example.com","subject":"Test","text":"Test"}'
```

### Issue 3: CORS Issues
**Symptoms**: Frontend can't connect to API
**Solution**: Add CORS configuration to server
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://billtracky.com', 'https://www.billtracky.com']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
```

### Issue 4: Static Files Not Served
**Symptoms**: Frontend shows blank page
**Solution**: Verify static file serving is configured

### Issue 5: SSL/HTTPS Issues
**Symptoms**: Mixed content errors, insecure connections
**Solution**:
- Ensure all API calls use HTTPS in production
- Configure reverse proxy (nginx/cloudflare) properly
- Force HTTPS redirects

## 🏥 Health Check Endpoints

Add these endpoints for monitoring:

```javascript
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
```

## 📊 Production Monitoring

### Log Important Events
```javascript
console.log(`[${new Date().toISOString()}] Server started on port ${PORT}`);
console.log(`[${new Date().toISOString()}] Database connected`);
console.log(`[${new Date().toISOString()}] Email service configured`);
```

### Error Handling
```javascript
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

## 🚀 Deployment Platforms

### Vercel Deployment
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

### Railway Deployment
1. Connect GitHub repository
2. Add environment variables
3. Deploy with automatic scaling

### DigitalOcean App Platform
1. Create new app from GitHub
2. Configure environment variables
3. Set build and run commands

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Debugging Production Issues

### Check Logs
```bash
# View application logs
pm2 logs billtracky

# View system logs
sudo journalctl -u billtracky -f
```

### Test Endpoints
```bash
# Test health
curl https://billtracky.com/health

# Test registration
curl -X POST https://billtracky.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"password123","role":"owner","organizationData":{"name":"Test Org","phone":"123-456-7890","planType":"free"}}'
```

### Database Verification
```bash
# Connect to database
psql $DATABASE_URL

# Check tables exist
\dt

# Check if schema is up to date
SELECT * FROM users LIMIT 1;
```

## 🔒 Security Checklist

- [ ] Environment variables are not exposed in client-side code
- [ ] Database connections use SSL
- [ ] API endpoints have proper authentication
- [ ] CORS is configured correctly
- [ ] Input validation is enabled
- [ ] Rate limiting is implemented
- [ ] HTTPS is enforced
- [ ] Security headers are set

## 📈 Performance Optimization

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling
- [ ] Implement caching where appropriate
- [ ] Monitor memory usage
- [ ] Set up load balancing if needed

## 🆘 Emergency Procedures

### Rollback Deployment
```bash
# If using git-based deployment
git revert HEAD
git push origin main
```

### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Contact Information
- Domain: Check registrar/DNS settings
- Database: Check hosting provider dashboard
- Email: Check Resend dashboard
- SSL: Check certificate provider

---

## 🎯 Quick Fix Commands

```bash
# Restart application
pm2 restart billtracky

# View real-time logs
pm2 logs billtracky --lines 50

# Check process status
pm2 status

# Update environment variables
pm2 restart billtracky --update-env
```