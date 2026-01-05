# Smoke Test Guide for League Intel

This document outlines critical end-to-end flows to test manually before deploying to production.

## Prerequisites

Before running smoke tests:

1. **Database is set up and migrated**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Environment variables are configured**
   - `DATABASE_URL` points to a test database
   - `NEXTAUTH_URL` is set correctly
   - `NEXTAUTH_SECRET` is configured
   - `CRON_SECRET` is set

3. **Have a real Sleeper league ID ready**
   - Find this from sleeper.com in your league URL
   - Ensure the league has recent waiver activity (last 30 days)
   - Ideally, use a league with 10-12 teams and varied activity levels

## Critical Flow 1: User Authentication

### Test Steps:
1. Navigate to `/auth/signin`
2. Enter a valid email address
3. Verify "Check your email" confirmation appears
4. Check email inbox for magic link (if email is configured)
5. Click magic link
6. Verify redirect to `/dashboard`

### Expected Results:
- ✅ Sign-in form displays correctly
- ✅ Email sends successfully (or shows test mode message)
- ✅ Magic link works and authenticates user
- ✅ User session persists across page refreshes

### Known Issues/Gotchas:
- Email must be configured in production
- In development, check terminal logs for magic link URL
- Session expires after inactivity period

---

## Critical Flow 2: League Connection

### Test Steps:
1. From `/dashboard`, click "Add League"
2. Paste a valid Sleeper league ID (e.g., `123456789012345678`)
3. Click "Connect League"
4. Wait for league creation (should take 2-5 seconds)
5. Verify redirect to league page

### Expected Results:
- ✅ Form validates league ID
- ✅ API successfully fetches league data from Sleeper
- ✅ Database creates league + team records
- ✅ League appears in dashboard
- ✅ Team count matches actual league size

### Error Cases to Test:
1. **Invalid league ID** (e.g., `invalid123`)
   - Should show error: "Failed to create league"

2. **Duplicate league** (re-add same ID)
   - Should show: "League already exists"

3. **Sleeper API down** (rare, simulate with network disconnect)
   - Should show network error

---

## Critical Flow 3: League Sync & Analysis

### Test Steps:
1. Navigate to a newly added league
2. Click "Sync Now" button
3. Wait for sync to complete (10-30 seconds depending on league size)
4. Verify page reloads with updated data

### Expected Results:
- ✅ Sync fetches last 8 weeks of transactions from Sleeper
- ✅ Waiver transactions are stored in database
- ✅ Team `lastActivityAt` timestamps are updated
- ✅ Analysis runs automatically after sync
- ✅ Team strategy labels appear (REBUILD/CONTEND/TINKER/INACTIVE)
- ✅ Positional needs are calculated (DESPERATE/THIN/STABLE/HOARDING)

### Data Validation:
Check that for each team:
- **Strategy label makes sense**:
  - Active teams with young adds → REBUILD
  - Active teams with vet adds → CONTEND
  - Low activity → INACTIVE
  - Mixed patterns → TINKER

- **Positional needs are accurate**:
  - Teams with 3+ QB adds → QB DESPERATE
  - Teams with deep RB bench → RB HOARDING

---

## Critical Flow 4: League Intel Dashboard

### Test Steps:
1. View league dashboard at `/leagues/[leagueId]`
2. Review team cards
3. Check Intel Feed
4. Verify summary stats

### Expected Results:
- ✅ All teams display correctly
- ✅ Strategy labels show with proper colors
- ✅ Last activity timestamps are accurate
- ✅ Positional needs badges appear for all positions
- ✅ Strategy explanations make sense
- ✅ Intel Feed shows relevant insights
- ✅ Summary stats calculate correctly (most active, avg moves, etc.)

### Visual Checks:
- Team cards are readable and not cluttered
- Colors distinguish strategies clearly
- Mobile layout works (test on phone or resize browser)
- No layout breaking with long team names

---

## Critical Flow 5: Trade Ideas Generation

### Test Steps:
1. From league dashboard, select your team
2. Navigate to Trade Ideas page
3. Review generated suggestions

### Expected Results:
- ✅ Trade ideas are generated based on complementary needs
- ✅ Rationales are clear and make sense
- ✅ Confidence scores reflect quality of match
- ✅ Ideas sorted by confidence (highest first)
- ✅ Maximum 10 ideas shown

### Example Valid Trade Idea:
```
Target: Team B
Give: WR
Get: RB
Rationale: "Team B is desperate at WR and has surplus RBs.
           You're thin at RB and have surplus WRs."
Confidence: 85%
```

### Edge Cases:
1. **No complementary needs exist**
   - Should show: "No trade ideas yet"

2. **Team has STABLE at all positions**
   - Few or no ideas generated

3. **Multiple strong matches**
   - Shows top 10 sorted by confidence

---

## Critical Flow 6: Cron Job Execution

### Test Steps:
1. Trigger manual cron job (if testing locally):
   ```bash
   curl "http://localhost:3000/api/cron/sync-all?secret=YOUR_CRON_SECRET" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. Check logs for execution

### Expected Results:
- ✅ All leagues sync successfully
- ✅ Transactions updated
- ✅ Analysis re-runs
- ✅ Logs show stats for each league

### In Production:
- Vercel Cron runs daily at 2 AM UTC
- Check Vercel dashboard for cron execution logs

---

## Data Integrity Checks

After running flows, verify in database:

### Leagues table:
```sql
SELECT id, name, season, "lastSyncAt", "ownerUserId"
FROM leagues;
```
- All leagues have `lastSyncAt` timestamp after sync

### League Teams:
```sql
SELECT id, "leagueId", "displayName", "strategyLabel", "lastActivityAt"
FROM league_teams
WHERE "leagueId" = 'YOUR_LEAGUE_ID';
```
- All teams have strategy labels (or NULL if not analyzed)
- Active teams have recent `lastActivityAt`

### Waiver Transactions:
```sql
SELECT COUNT(*), "teamId", "transactionType"
FROM waiver_transactions
GROUP BY "teamId", "transactionType";
```
- Transaction counts match expected from Sleeper
- Both ADDs and DROPs are recorded

### Team Summaries:
```sql
SELECT "teamId", "last30dAdds", "last30dDrops", "activityTrend"
FROM team_waiver_summary;
```
- Summary stats match transaction counts
- Activity trends make sense

---

## Performance Benchmarks

Expected performance:

| Operation | Expected Time | Max Acceptable |
|-----------|---------------|----------------|
| Sign in (email send) | < 2s | 5s |
| Add league | 3-5s | 10s |
| Sync league (10 teams) | 10-20s | 60s |
| Load intel dashboard | < 1s | 3s |
| Generate trade ideas | < 2s | 5s |
| Cron job (5 leagues) | 30-60s | 5 min |

---

## Common Errors & Troubleshooting

### Error: "Sleeper API error: 404"
- **Cause**: Invalid league ID
- **Fix**: Verify league ID from Sleeper URL

### Error: "Unauthorized"
- **Cause**: Not signed in or session expired
- **Fix**: Sign in again

### Error: "League not found"
- **Cause**: Accessing league you don't own
- **Fix**: Check league ownership

### Error: "Failed to sync league"
- **Cause**: Sleeper API rate limit or network issue
- **Fix**: Wait 60 seconds and retry

### No transactions imported
- **Cause**: League has no waiver activity in last 8 weeks
- **Fix**: This is normal for inactive leagues; no action needed

### Strategy labels all show INACTIVE
- **Cause**: No recent activity OR sync only fetched old weeks
- **Fix**: Verify current NFL week and sync recency

---

## Post-Deployment Checklist

After deploying to production:

- [ ] Smoke test all 6 critical flows
- [ ] Verify database migrations ran successfully
- [ ] Check environment variables are set
- [ ] Test with at least 2 different real Sleeper leagues
- [ ] Verify cron job is scheduled in Vercel
- [ ] Monitor error logs for first 24 hours
- [ ] Test on mobile device
- [ ] Verify analytics/monitoring is working (if configured)

---

## Regression Testing

When making changes, always re-test:

1. **After database schema changes** → Test league sync
2. **After analysis logic changes** → Test strategy classification
3. **After API route changes** → Test relevant flow end-to-end
4. **After UI changes** → Visual regression test + mobile

---

## Reporting Issues

When reporting bugs from smoke testing:

Include:
- Which flow/test step failed
- Expected vs actual behavior
- Browser/device used
- Screenshots if UI issue
- Relevant error messages from console/logs
- League ID used (if safe to share)

---

**Last Updated**: January 2026
**Maintained by**: League Intel Development Team
