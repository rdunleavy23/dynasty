# Database Setup Guide

## Quick Setup with Supabase (Recommended - 2 minutes)

1. **Create a Supabase account**
   - Go to https://supabase.com
   - Sign up (free tier is sufficient)

2. **Create a new project**
   - Click "New Project"
   - Choose an organization
   - Name your project (e.g., "league-intel")
   - Set a database password (save this!)
   - Choose a region close to you
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get your connection string**
   - Go to Settings → Database
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

4. **Update your .env file**
   ```bash
   # Replace [YOUR-PASSWORD] with the password you set
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```

5. **Run migrations**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

6. **Restart your dev server**
   ```bash
   npm run dev
   ```

## Alternative: Local PostgreSQL

If you prefer local PostgreSQL:

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Create database
   createdb league_intel
   ```

2. **Update .env**
   ```bash
   DATABASE_URL="postgresql://$(whoami)@localhost:5432/league_intel?schema=public"
   ```

3. **Run migrations**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

## Verify Setup

After setup, test the connection:
```bash
npx prisma db pull
```

If successful, you're ready to go!

