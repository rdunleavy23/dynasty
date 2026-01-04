# League Intel

**See how your dynasty league really plays.**

League Intel is a web app that analyzes waiver trends, team strategies, and positional needs in dynasty fantasy football leagues. It helps casual dynasty players make smarter trades by understanding league context—who's rebuilding, who's desperate at RB, and which trades are most likely to be accepted.

## Product Overview

League Intel is designed for casual dynasty fantasy football managers who:
- Play primarily on Sleeper (with future support for MFL and ESPN)
- Want to understand their leaguemates' strategies without diving into spreadsheets
- Need context-aware trade suggestions, not just generic value calculators

### Core Features (v1)

1. **League Connection** - Connect your Sleeper league with just a league ID
2. **Waiver Tracking** - Automatically track adds/drops and transaction patterns
3. **Team Strategy Classification** - Identify teams as REBUILD, CONTEND, TINKER, or INACTIVE
4. **Positional Needs Analysis** - See who's desperate/thin/stable/hoarding at each position
5. **League Intel Dashboard** - Visual overview of all teams with explanations
6. **Smart Trade Ideas** - Contextual trade suggestions based on complementary needs

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase or Vercel Postgres)
- **ORM**: Prisma
- **Auth**: NextAuth.js (email magic link)
- **Hosting**: Vercel
- **Data Source**: Sleeper API (public endpoints)

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (local or cloud)
- Sleeper account with at least one dynasty league

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dynasty
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Fill in the required values:
   ```env
   # Database (use Supabase, Vercel Postgres, or local PostgreSQL)
   DATABASE_URL="postgresql://user:password@localhost:5432/league_intel?schema=public"

   # NextAuth (generate secret with: openssl rand -base64 32)
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-here"

   # Cron job security
   CRON_SECRET="your-cron-secret-here"

   # Email (optional for dev, required for production)
   EMAIL_SERVER_HOST="smtp.example.com"
   EMAIL_SERVER_PORT="587"
   EMAIL_SERVER_USER="your-email@example.com"
   EMAIL_SERVER_PASSWORD="your-password"
   EMAIL_FROM="noreply@leagueintel.app"
   ```

4. **Set up the database**

   Run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
dynasty/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── leagues/      # League CRUD + sync
│   │   └── cron/         # Background jobs
│   ├── dashboard/        # User dashboard
│   ├── leagues/          # League intel pages
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── TeamCard.tsx
│   ├── IntelFeed.tsx
│   ├── LeagueCard.tsx
│   └── TradeIdeaCard.tsx
├── lib/                   # Core business logic
│   ├── analysis/         # Analysis algorithms
│   │   ├── strategy.ts   # Team strategy classification
│   │   ├── positions.ts  # Positional needs detection
│   │   ├── pipeline.ts   # Analysis orchestration
│   │   └── trade-ideas.ts # Trade suggestion engine
│   ├── sleeper.ts        # Sleeper API wrapper
│   ├── db.ts             # Prisma client
│   └── auth.ts           # NextAuth config
├── prisma/
│   └── schema.prisma     # Database schema
├── types/
│   └── index.ts          # TypeScript types
└── public/               # Static assets
```

## Usage

### Adding a League

1. Navigate to `/dashboard`
2. Click "Add League"
3. Enter your Sleeper league ID (found in the league URL)
4. Click "Connect League"
5. Run "Sync Now" to import transaction data

### Viewing League Intel

1. Go to your league from the dashboard
2. See team cards with:
   - Strategy classification (Rebuild/Contend/Tinker/Inactive)
   - Last activity timestamp
   - Positional needs (Desperate/Thin/Stable/Hoarding)
   - Activity explanation
3. Check the Intel Feed for key insights

### Getting Trade Ideas

1. From the league intel page, select your team
2. Click "Trade Ideas"
3. Review contextual suggestions based on:
   - Your positional surpluses/needs
   - Other teams' complementary needs
   - Team strategies (rebuild vs contend)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

The app includes a `vercel.json` configuration for automated daily syncs.

### Database Setup

Use Vercel Postgres or Supabase:

**Vercel Postgres:**
```bash
vercel postgres create
vercel env pull .env.local
```

**Supabase:**
1. Create a new project at https://supabase.com
2. Copy the connection string from Settings → Database
3. Update `DATABASE_URL` in your environment

## Analysis Heuristics

All analysis logic is documented and tunable. Key files:

- **`lib/analysis/strategy.ts`** - Team strategy classification
  - INACTIVE: 21+ days without activity
  - REBUILD: Adding young players (≤24), dropping vets (≥26)
  - CONTEND: Adding vets (≥26), dropping youth (≤24)
  - TINKER: Mixed patterns

- **`lib/analysis/positions.ts`** - Positional needs
  - DESPERATE: 3+ waiver adds in 21 days
  - THIN: Low bench depth
  - STABLE: Adequate depth
  - HOARDING: Deep bench (5+ for RB/WR, 3+ for QB/TE)

- **`lib/analysis/trade-ideas.ts`** - Trade matching
  - Finds complementary needs (surplus → desperate)
  - Considers team strategies
  - Generates human-readable rationales

## API Endpoints

### User-Facing APIs

- `POST /api/leagues` - Create a new league
- `GET /api/leagues` - List user's leagues
- `POST /api/leagues/[id]/sync` - Sync league data
- `GET /api/leagues/[id]/intel` - Get league intelligence
- `GET /api/leagues/[id]/trade-ideas?teamId=X` - Get trade ideas

### Cron/Background Jobs

- `GET /api/cron/sync-all` - Sync all leagues (Vercel Cron)
- `GET /api/cron/sync-league?leagueId=X&secret=Y` - Sync one league
- `GET /api/cron/recompute-league?leagueId=X&secret=Y` - Recompute analysis

## Roadmap

### v1.1
- Add MFL and ESPN support
- Player value integration (FantasyCalc, KeepTradeCut)
- Historical trend charts

### v1.2
- Email notifications for trade opportunities
- League comparison (multiple leagues)
- Export reports

### v2.0
- AI-powered trade negotiation suggestions
- Sleeper OAuth for direct roster access
- Mobile app

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Email: support@leagueintel.app (if configured)

---

Built with love for dynasty fantasy football managers. Good luck with your trades!
