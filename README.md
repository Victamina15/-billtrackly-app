# 🧾 BillTracky - Complete Laundry Management System

A modern, full-stack web application for managing laundry business operations including invoice creation, customer management, service configuration, and employee access control.

## ✨ Features

### 🎯 Core Features
- **Invoice Management**: Create, edit, and track customer invoices
- **Customer Database**: Comprehensive customer information and order history
- **Service Configuration**: Flexible pricing for wash, iron, and combination services
- **Employee Access Control**: Secure access code-based authentication
- **Real-time Dashboard**: Live order tracking and business analytics
- **Payment Processing**: Multiple payment method support
- **Order Tracking**: Full lifecycle tracking from received to delivered

### 🚀 Advanced Features
- **Email Integration**: Automated email notifications via Resend
- **Airtable Sync**: Optional cloud backup and synchronization
- **WhatsApp Integration**: Customer communication capabilities
- **Cash Management**: Daily closure and financial tracking
- **Analytics & Reporting**: Business insights and performance metrics
- **Multi-device Support**: Responsive design for desktop and mobile

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/UI** component library
- **React Hook Form** with Zod validation
- **TanStack Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** with Drizzle ORM
- **Bcrypt** for password hashing
- **CORS** and security headers
- **Rate limiting** and error handling

### Database & Storage
- **PostgreSQL** (Supabase recommended)
- **Drizzle ORM** for type-safe database operations
- **Automatic migrations** and schema management

### External Services
- **Resend** for email delivery
- **Airtable** for cloud backup (optional)
- **WhatsApp Business API** (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Resend API key for email services

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Victamina15/-billtrackly-app.git
   cd billtrackly-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.production.example .env
   ```

   Update `.env` with your configuration:
   ```bash
   NODE_ENV=development
   DATABASE_URL=postgresql://username:password@host:port/database
   RESEND_API_KEY=re_your_resend_api_key_here
   FROM_EMAIL=noreply@billtracky.com
   APP_URL=http://localhost:5000
   ```

4. **Database setup**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🌐 Deployment Options

### 🚀 Vercel (Recommended)
Quick deployment to Vercel with serverless functions:

1. **Connect to Vercel**
   - Import your GitHub repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://...
   RESEND_API_KEY=re_...
   FROM_EMAIL=noreply@billtracky.com
   NODE_ENV=production
   APP_URL=https://your-app.vercel.app
   ```

3. **Deploy**
   ```bash
   git push origin main
   ```

📖 **Detailed Guide**: See [VERCEL_SETUP.md](./VERCEL_SETUP.md)

### 🐳 Docker Production
For self-hosted deployment:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

📖 **Detailed Guide**: See [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

## 📁 Project Structure

```
billtracky/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   └── lib/           # Utilities and hooks
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database layer
│   ├── email-service.ts   # Email functionality
│   └── config.ts          # Configuration
├── shared/                 # Shared TypeScript types
├── api/                    # Vercel serverless functions
├── migrations/             # Database migrations
└── dist/                   # Built output
```

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run check           # TypeScript type checking
npm run build           # Build for production

# Database
npm run db:push         # Push schema changes to database

# Deployment
npm run deploy          # Validate and build for production
npm run vercel-build    # Build for Vercel deployment

# Testing
npm run test:health     # Test health endpoint
npm run validate:prod   # Validate production configuration
```

## 🔒 Security Features

- **Access Code Authentication**: Secure employee login system
- **CORS Protection**: Properly configured cross-origin requests
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Input Validation**: Comprehensive Zod schema validation
- **SQL Injection Protection**: Drizzle ORM parameterized queries
- **Rate Limiting**: API endpoint protection
- **HTTPS Enforcement**: Secure connections in production

## 📧 Email Configuration

BillTracky uses Resend for email delivery:

1. **Create Resend Account**: [resend.com](https://resend.com)
2. **Verify Domain**: Add and verify your sending domain
3. **Get API Key**: Add to environment variables
4. **Configure Templates**: Customer notifications and receipts

## 💾 Database Setup

### Supabase (Recommended)
1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from project settings
3. Add to `DATABASE_URL` environment variable
4. Run `npm run db:push` to create tables

### Other PostgreSQL
Any PostgreSQL 12+ database works:
- AWS RDS
- Google Cloud SQL
- DigitalOcean Databases
- Self-hosted PostgreSQL

## 🎨 Customization

### Branding
- Logo: Replace files in `attached_assets/`
- Colors: Update Tailwind config in `tailwind.config.ts`
- Fonts: Modify CSS variables in `client/src/index.css`

### Business Logic
- Services: Configure pricing in admin panel
- Invoice Templates: Customize in `client/src/components/`
- Email Templates: Modify in `server/email-service.ts`

## 🆘 Troubleshooting

### Common Issues

**Database Connection**
```bash
# Test connection
npm run validate:prod
```

**Build Failures**
```bash
# Check TypeScript errors
npm run check

# Clean rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Email Issues**
- Verify Resend API key
- Check domain verification
- Review email service logs

### Getting Help

1. **Check Documentation**: Review setup guides
2. **Validate Configuration**: Run `npm run validate:prod`
3. **Check Logs**: Review console and server logs
4. **GitHub Issues**: Report bugs or request features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-location support
- [ ] Inventory management
- [ ] Customer loyalty program
- [ ] API rate limiting per user
- [ ] Webhook system
- [ ] Export/import functionality

---

## 📞 Support

- **Documentation**: Available in `/docs` folder
- **Issues**: GitHub Issues for bug reports
- **Email**: Contact support via configured email
- **Discord**: Community support channel (coming soon)

Built with ❤️ for laundry business owners everywhere.