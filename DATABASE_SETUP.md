# Database Setup Guide

## Quick Setup with SQLite (Default - No External Services)

SQLite is now the default database for local development. It requires no external services, no installation, and works completely offline.

1. **The database is already configured!**
   - Your `.env` file has `DATABASE_URL="file:./prisma/dev.db"`
   - This creates a local SQLite database file

2. **Run migrations (if not already done)**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

3. **That's it!** The database is ready to use.

The SQLite database file (`prisma/dev.db`) is created automatically and contains all your data locally. No external services needed!

## Alternative: Local PostgreSQL (Optional)

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

