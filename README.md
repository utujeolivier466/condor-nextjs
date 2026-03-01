# Candor - SaaS Metrics Monitoring Platform

Candor is a weekly SaaS metrics briefing service that sends founders actionable insights about their business metrics every Monday morning.

## Features

- **Weekly Metrics Brief**: Automated SaaS metrics analysis delivered every Monday at 6 AM UTC
- **Stripe Integration**: Connect your Stripe account for automatic data retrieval
- **Trial System**: 7-day trial starting from first email send
- **Churn Detection**: Automated monitoring for payment failures and engagement drops

## User Flow

### Onboarding (First-time setup)
1. **/** - Landing page → Click "Get Started"
2. **/onboarding** - 4-step onboarding:
   - Connect Stripe account
   - Validate account
   - Reality check ($1 verification charge)
   - Email capture
3. **/setup** - Email capture (if not done in onboarding)
4. **/snapshot** - View initial metrics snapshot
5. **/burn-input** - Enter monthly burn rate
6. **/email-preview** - Preview weekly email format
7. **/home** - Dashboard with metrics

### Weekly Engine
- **Cron Job**: Runs every Sunday at 11 PM UTC
- **Process**: Fetch Stripe metrics → Generate judgment → Send plain text email
- **Trial Clock**: Starts on first email send

### Trial System
- **Duration**: 7 days from first email
- **States**: `pre_trial` → `active` → `expired`
- **No extensions**: Strict 7-day limit

### Monetization
- **/pricing** - View subscription plans
- **Stripe Checkout** - Payment processing
- **Webhook** - Activates subscription on payment

### Churn Detection
Runs daily at 9 AM UTC:
- No payment within 24h → Cancel
- No burn input within 48h → Cancel  
- 3 emails ignored → Warning → Cancel if still ignored

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email**: Custom SMTP integration
- **Deployment**: Vercel

## Environment Variables

```
env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PRICE_ID_MONTHLY=your_monthly_price_id
STRIPE_PRICE_ID_ANNUAL=your_annual_price_id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_cron_secret_for_manual_triggers

# Email (SMTP)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM=weekly@candor.so
```

## Getting Started

1. **Clone the repository**
```
bash
git clone <repo-url>
cd mynewapp
```

2. **Install dependencies**
```
bash
npm install
```

3. **Set up environment variables**
```
bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Run the development server**
```
bash
npm run dev
```

5. **Open http://localhost:3000**

## Database Schema

Run the SQL migrations in `supabase/migrations/` to set up:
- `schema.sql` - Base tables
- `schema-trial.sql` - Trial tracking
- `schema-monetization.sql` - Billing tables
- `schema-pipeline.sql` - Email pipeline
- `schema-email.sql` - Email tracking

## API Routes

| Endpoint | Description |
|----------|-------------|
| `/api/stripe/connect` | Initiate Stripe Connect OAuth |
| `/api/stripe/callback` | Stripe OAuth callback |
| `/api/setup/email` | Save user email |
| `/api/snapshot` | Fetch initial metrics |
| `/api/burn` | Save burn rate |
| `/api/trial/start` | Initialize trial |
| `/api/home` | Get dashboard data |
| `/api/billing/checkout` | Create Stripe checkout session |
| `/api/billing/webhook` | Stripe webhook handler |
| `/api/cron/weekly` | Weekly metrics email job |
| `/api/cron/churn` | Daily churn detection |

## Cron Jobs (Vercel)

Configured in `vercel.json`:
- Weekly: Sunday 11 PM UTC (`/api/cron/weekly`)
- Churn: Daily 9 AM UTC (`/api/cron/churn`)

## Middleware

The `middleware.ts` handles route protection based on trial state:
- `demo` - Full access
- `paid` - Full access  
- `active` - Full access
- `pre_trial` - Allowed through (setup flow)
- `expired` - Redirected to `/expired`

## Project Structure

```
app/
├── page.tsx                 # Landing page
├── onboarding/             # Onboarding flow
├── connect-stripe/         # Stripe Connect
├── setup/                  # Email setup
├── snapshot/               # Metrics snapshot
├── burn-input/             # Burn rate input
├── email-preview/          # Email preview
├── home/                   # Dashboard
├── pricing/                # Subscription plans
├── billing/                # Billing pages
├── expired/                # Expired trial page
└── api/                    # API routes

lib/
├── supabase.ts             # Supabase client
├── lib-trial-gate.ts       # Trial state logic
├── lib-weekly-job.ts      # Weekly email job
├── lib-churn-enforcement.ts # Churn detection
├── lib-compute.ts          # Metrics computation
├── lib-judgment.ts        # AI judgment
├── lib-email-template.ts   # Email formatting
└── lib-send-email.ts      # Email sending

supabase/migrations/        # Database migrations
```

## License

MIT
