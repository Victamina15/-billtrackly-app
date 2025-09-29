# BillTracky Vercel Deployment Guide

## 🚀 Quick Deployment to Vercel

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- PostgreSQL database (Supabase recommended)
- Resend API key for email services

### 1. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Email Service
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=noreply@billtracky.com

# Application Configuration
NODE_ENV=production
APP_URL=https://your-app.vercel.app

# Optional Security (Recommended)
SESSION_SECRET=your_super_secure_session_secret_here
JWT_SECRET=your_jwt_secret_here
```

### 2. Domain Configuration

#### Custom Domain Setup:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `billtracky.com`)
3. Configure DNS records as instructed by Vercel
4. Update `APP_URL` environment variable to use your custom domain

#### CORS Origins:
The app is configured to allow these origins:
- `https://billtracky.com`
- `https://www.billtracky.com`
- `https://billtracky.vercel.app`
- `https://billtracky-app.vercel.app`

Add your custom domain to the CORS configuration in `api/index.js` if different.

### 3. Database Setup

#### Using Supabase (Recommended):
1. Create a new Supabase project
2. Go to Settings → Database → Connection string
3. Copy the connection string and add it as `DATABASE_URL` in Vercel
4. Run database migrations (if needed):
   ```bash
   npm run db:push
   ```

#### Using Other PostgreSQL providers:
- Ensure SSL is enabled (`?sslmode=require`)
- Connection string format: `postgresql://username:password@host:port/database?sslmode=require`

### 4. Email Service Setup

#### Resend Configuration:
1. Create account at [resend.com](https://resend.com)
2. Verify your domain (billtracky.com)
3. Get API key from dashboard
4. Add `RESEND_API_KEY` to Vercel environment variables

### 5. Deployment Process

#### Automatic Deployment (Recommended):
1. Connect your GitHub repository to Vercel
2. Push code to main branch
3. Vercel automatically builds and deploys

#### Manual Deployment:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 6. Build Configuration

The project includes optimized build settings:

```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ]
}
```

### 7. Testing Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# API test
curl https://your-app.vercel.app/api/test
```

### 8. Monitoring and Logs

- **Vercel Dashboard**: Monitor deployments and performance
- **Function Logs**: View serverless function logs in Vercel dashboard
- **Analytics**: Enable Vercel Analytics for usage insights

### 9. Performance Optimization

#### Recommended Settings:
- **Function Duration**: 10s (configured in vercel.json)
- **Memory**: 1024MB (Vercel default)
- **Regions**: Auto (Vercel default)

#### Caching:
- Static assets cached automatically
- API responses cached based on headers
- Database connections pooled for efficiency

### 10. Security Considerations

✅ **Enabled Security Features:**
- CORS properly configured
- Security headers set
- Environment variables encrypted
- HTTPS enforced
- SQL injection protection (Drizzle ORM)

### 11. Troubleshooting

#### Common Issues:

**Build Failures:**
- Check environment variables are set
- Verify database connection string
- Review build logs in Vercel dashboard

**API Errors:**
- Check serverless function logs
- Verify CORS configuration
- Test database connectivity

**Database Issues:**
- Ensure SSL is enabled
- Check firewall settings
- Verify connection string format

#### Support:
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Supabase Support: [supabase.com/docs](https://supabase.com/docs)
- Project Issues: GitHub repository issues

---

## 📊 Production Checklist

- [ ] Environment variables configured
- [ ] Custom domain added (optional)
- [ ] Database connected and tested
- [ ] Email service configured
- [ ] CORS origins updated
- [ ] SSL certificate active
- [ ] Health check endpoint working
- [ ] User registration/login tested
- [ ] Analytics enabled (optional)
- [ ] Monitoring setup (optional)

Your BillTracky application should now be live and ready for users! 🎉