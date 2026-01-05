# Deployment Guide - League Intel

Complete guide for deploying League Intel to Vercel with Vercel Postgres.

## Prerequisites

- GitHub repository with code pushed
- Vercel account (free tier works)
- Domain name (optional, Vercel provides free subdomain)

## Quick Deploy (5 minutes)

### 1. Deploy to Vercel

```bash
# Install Vercel CLI (optional, can use web UI)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

Or use the **Vercel Dashboard**:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework Preset: **Next.js**
4. Root Directory: `./`
5. Click **Deploy**

### 2. Set Up Vercel Postgres

From your Vercel project dashboard:

1. Go to **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose **Region** (select closest to your users)
5. Click **Create**

Vercel automatically sets these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` ← Use this for `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING`

### 3. Configure Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**, add:

#### Required Variables

```bash
# Database (automatically set by Vercel Postgres)
DATABASE_URL="${POSTGRES_PRISMA_URL}"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"

# Cron Security
CRON_SECRET="<generate-with: openssl rand -base64 32>"

# Email (Resend - free tier: 100 emails/day)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="League Intel <noreply@yourdomain.com>"

# Email Digest
DIGEST_ENABLED="true"
DIGEST_DAY="1"  # Monday (0=Sunday, 1=Monday, etc.)
```

#### Optional Variables

```bash
# Analytics (optional)
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# Sentry Error Tracking (optional)
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"

# Feature Flags
FEATURE_EMAIL_DIGEST="true"
FEATURE_TRADE_IDEAS="true"
```

### 4. Run Database Migrations

After deploying and setting up Postgres:

```bash
# Set environment variables locally
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

Or use Vercel's **Deployment Hook**:
1. Add to `package.json`:
   ```json
   {
     "scripts": {
       "vercel-build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

### 5. Verify Deployment

1. **Health Check**: Visit `/api/health`
   - Should return: `{"status":"healthy","database":"connected"}`

2. **Sign In**: Visit `/auth/signin`
   - Enter your email
   - Check for magic link (configure email first)

3. **Add Test League**:
   - Paste Sleeper league ID
   - Click "Connect League"
   - Run "Sync Now"

## Email Setup (Resend)

### Why Resend?

- **Free tier**: 100 emails/day (perfect for MVP)
- **Simple API**: Easy integration
- **Great deliverability**: Better than SendGrid for transactional emails
- **Modern**: Built for Next.js

### Setup Steps

1. **Create Resend Account**
   - Go to [resend.com](https://resend.com)
   - Sign up (free)

2. **Get API Key**
   - Go to **API Keys**
   - Click **Create API Key**
   - Copy key (starts with `re_`)

3. **Verify Domain** (Optional but recommended)
   - Go to **Domains**
   - Add your domain
   - Add DNS records (DKIM, SPF)
   - Verify

4. **Add to Vercel**
   ```bash
   RESEND_API_KEY="re_xxxxxxxxxxxxx"
   EMAIL_FROM="League Intel <digest@yourdomain.com>"
   ```

### Email Features

The app sends two types of emails:

1. **Magic Link Authentication**
   - Automatically sent when users sign in
   - Beautiful HTML template with branded design
   - Expires in 24 hours

2. **Weekly Email Digest**
   - Sent on configured day of week (default: Monday at 9 AM UTC)
   - Includes top insights, trade ideas, and league activity summary
   - Beautiful HTML template with gradient header
   - Only sent for leagues synced in last 14 days

## Weekly Digest Configuration

### Enable Digest

Set these environment variables in Vercel:

```bash
# Enable digest feature
DIGEST_ENABLED="true"

# Day of week to send (0=Sunday, 1=Monday, ..., 6=Saturday)
DIGEST_DAY="1"  # Monday
```

### Digest Content

Each weekly digest includes:

- **This Week's Overview**: Summary of league activity and trends
- **Top Insights**: 5 most relevant team insights (strategy, waiver activity, positional needs)
- **Trade Ideas**: 3 highest-confidence trade suggestions based on complementary needs
- **View Dashboard**: Direct link to full league analysis

### Digest Schedule

Digests are sent via Vercel Cron (configured in `vercel.json`):

```json
{
  "path": "/api/cron/send-digests",
  "schedule": "0 9 * * 1"  // Mondays at 9 AM UTC
}
```

**To change the time**: Modify the cron schedule in `vercel.json`:
- Format: `minute hour * * day`
- Examples:
  - `0 9 * * 1` - Monday at 9 AM UTC
  - `0 17 * * 5` - Friday at 5 PM UTC
  - `30 8 * * 3` - Wednesday at 8:30 AM UTC

**Note**: Digest will only send on the day specified in `DIGEST_DAY` environment variable, even if the cron runs daily.

### Testing Digest

To test the digest manually:

```bash
# Get your CRON_SECRET from Vercel environment variables
curl -X GET "https://your-app.vercel.app/api/cron/send-digests" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Digest Logs

Monitor digest sending in Vercel:
1. Go to **Logs** in Vercel Dashboard
2. Filter by function: `/api/cron/send-digests`
3. Look for:
   - `[Digest Cron] ✓ Sent digest to...` - Success
   - `[Digest Cron] ✗ Failed to send...` - Error

## Cron Jobs Configuration

Vercel Cron (already configured in `vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/send-digests",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

**Schedules:**
- `0 2 * * *` - Daily at 2 AM UTC (sync all leagues)
- `0 9 * * 1` - Mondays at 9 AM UTC (send weekly digests)

**Cron Format**: `minute hour day month weekday`

## Environment Variable Validation

The app validates environment variables at startup:

```typescript
// lib/env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'CRON_SECRET',
]

// Optional but recommended
const optionalEnvVars = [
  'RESEND_API_KEY',      // For email features
  'EMAIL_FROM',          // Email sender
  'DIGEST_ENABLED',      // Enable/disable digest
]
```

**Runtime Checks:**
- Database connection on startup
- Email service availability
- Cron secret validation

## Monitoring & Observability

### Built-in Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-05T12:00:00Z",
  "database": "connected",
  "email": "configured",
  "version": "0.1.0"
}
```

### Vercel Analytics

Enable in Vercel Dashboard → **Analytics**

### Logs

View in Vercel Dashboard → **Logs**

Filter by:
- Deployment
- Function
- Time range

### Error Tracking (Optional)

Add Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## Database Management

### View Data

```bash
# Using Prisma Studio (local)
npx prisma studio

# Or use Vercel Postgres Dashboard
# Go to Storage → Your Database → Data
```

### Run Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_feature

# Deploy to production
npx prisma migrate deploy
```

### Backup

Vercel Postgres includes:
- **Automatic backups**: Daily
- **Point-in-time recovery**: 7 days (Pro plan)

Manual backup:
```bash
# Export data
pg_dump $DATABASE_URL > backup.sql

# Import data
psql $DATABASE_URL < backup.sql
```

## Performance Optimization

### Edge Functions (Coming Soon)

For global low-latency:
```typescript
// app/api/leagues/route.ts
export const runtime = 'edge'
```

### Image Optimization

Already configured in `next.config.js`

### Caching

Add Redis for caching (optional):
```bash
# Vercel KV
vercel kv create
```

## Security Checklist

- [ ] Environment variables set in Vercel (not in code)
- [ ] `NEXTAUTH_SECRET` is random and secure (32+ characters)
- [ ] `CRON_SECRET` is random and secure
- [ ] Database uses connection pooling (`POSTGRES_PRISMA_URL`)
- [ ] Email domain verified (SPF, DKIM)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Rate limiting enabled (optional, use Vercel WAF)

## Troubleshooting

### "Cannot connect to database"

1. Check `DATABASE_URL` is set correctly
2. Verify Vercel Postgres is running
3. Check connection string format
4. Try using `POSTGRES_PRISMA_URL` instead

### "Email not sending"

1. Check `RESEND_API_KEY` is valid
2. Verify `EMAIL_FROM` domain is verified
3. Check Resend dashboard for errors
4. Ensure not exceeding rate limits (100/day free tier)

### "Cron not running"

1. Verify cron is enabled in `vercel.json`
2. Check cron logs in Vercel Dashboard
3. Ensure `CRON_SECRET` is set
4. Cron requires Production deployment (not Preview)

### "Build failing"

1. Check build logs in Vercel
2. Ensure all dependencies in `package.json`
3. Verify `DATABASE_URL` is available at build time
4. Check TypeScript errors: `npm run type-check`

## Scaling Considerations

### Free Tier Limits

- **Vercel**:
  - 100 GB bandwidth/month
  - 100 hours serverless execution/month
  - Unlimited deployments

- **Vercel Postgres**:
  - 256 MB storage
  - 60 hours compute time/month
  - 256 MB RAM

- **Resend**:
  - 100 emails/day
  - 3,000 emails/month

### When to Upgrade

Upgrade when you hit:
- 1,000+ active users
- 50+ leagues
- 10,000+ emails/month

### Pro Tips

1. **Use connection pooling** (already configured)
2. **Enable caching** for frequent queries
3. **Optimize images** with Next.js Image component
4. **Use ISR** (Incremental Static Regeneration) for dashboards
5. **Monitor logs** regularly

## Cost Estimation

**Free Tier** (Good for MVP):
- Vercel: Free
- Vercel Postgres: Free (256 MB)
- Resend: Free (100 emails/day)
- **Total: $0/month**

**Hobby/Production** (~100 users, 20 leagues):
- Vercel Pro: $20/month
- Vercel Postgres (512 MB): Included
- Resend Pro (1,000 emails/day): $20/month
- **Total: ~$40/month**

**Scale** (~1,000 users, 200 leagues):
- Vercel Pro: $20/month
- Vercel Postgres (1 GB): $10/month
- Resend (10,000 emails/month): $20/month
- **Total: ~$50/month**

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Prisma Docs**: [prisma.io/docs](https://prisma.io/docs)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

**Last Updated**: January 2026
**Maintained by**: League Intel Team
