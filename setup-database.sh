#!/bin/bash
# Database setup script
# Run this after setting DATABASE_URL in .env

set -e

echo "🔍 Checking DATABASE_URL..."
if ! grep -q "DATABASE_URL=" .env || grep -q 'DATABASE_URL=""' .env; then
  echo "❌ DATABASE_URL not set in .env"
  echo ""
  echo "Please add DATABASE_URL to .env:"
  echo "  For SQLite (default, no external services): DATABASE_URL=\"file:./prisma/dev.db\""
  echo "  For PostgreSQL: DATABASE_URL=\"postgresql://user:password@localhost:5432/league_intel?schema=public\""
  echo ""
  echo "See DATABASE_SETUP.md for more options"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""
echo "📦 Running Prisma migrations..."
npx prisma migrate dev --name init

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "1. Restart your dev server: npm run dev"
echo "2. Visit: http://localhost:3000/local/league/1312497096116404224"

