# Vercel Deployment Checklist

This document ensures your Next.js app is ready for production deployment on Vercel.

## ✅ Code Quality Checks (COMPLETED)

- [x] **TypeScript compilation**: All files compile without errors
- [x] **ESLint configuration**: Proper ESLint setup with Next.js standards
- [x] **No broken imports**: All imports resolve correctly
- [x] **API route syntax**: All route handlers are properly formatted
- [x] **Environment variable references**: Variables properly accessed via `process.env`

## ✅ Configuration Files (COMPLETED)

- [x] **next.config.ts**: Configured with proper middleware handling
- [x] **tsconfig.json**: Fixed jsx file reference issue
- [x] **package.json**: All required dependencies listed
- [x] **middleware.ts**: Properly configured with correct matcher paths
- [x] **vercel.json**: Cron jobs properly configured
- [x] **.env.example**: Created with all required variables documented

## 🔧 Required Environment Variables for Vercel

Before deployment, ensure these environment variables are set in Vercel Dashboard:

### Supabase (Database)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

### Stripe (Payments & OAuth)
- `STRIPE_SECRET_KEY` - Secret key (sk_live_xxx)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_CLIENT_ID` - OAuth client ID
- `STRIPE_REDIRECT_URI` - OAuth callback URL (https://yourdomain.vercel.app/api/stripe/callback)
- `STRIPE_PRICE_MONTHLY` - Monthly subscription price ID
- `STRIPE_PRICE_ANNUAL` - Annual subscription price ID

### Email (Resend)
- `RESEND_API_KEY` - API key for email service

### Application
- `NEXT_PUBLIC_APP_URL` - Your app's public URL (https://yourdomain.vercel.app)
- `CRON_SECRET` - Secret token for cron job authentication
- `ADMIN_SECRET` - Admin dashboard password

## ✅ API Routes (VERIFIED)

All critical API routes have been reviewed:

- [x] `/api/billing/checkout` - Creates Stripe checkout sessions
- [x] `/api/billing/webhook` - Handles Stripe webhook events
- [x] `/api/stripe/connect` - **FIXED** - Stripe OAuth initiation (syntax error corrected)
- [x] `/api/stripe/callback` - Handles OAuth callback from Stripe
- [x] `/api/onboarding/validate` - Validates Stripe connection
- [x] `/api/snapshot` - Pulls Stripe revenue data
- [x] `/api/home` - Returns trial status and email data
- [x] `/api/cron/weekly` - Weekly email job
- [x] `/api/cron/churn` - Daily churn enforcement
- [x] `/api/admin/data` - Admin dashboard data

## ✅ Library Functions (VERIFIED)

All utility functions verified:

- [x] `lib-supabase.ts` - Database client initialization
- [x] `lib-compute.ts` - Metrics computation from Stripe
- [x] `lib-judgment.ts` - Business logic for health scores
- [x] `lib-email-template.ts` - Email generation
- [x] `lib-send-email.ts` - Email sending via Resend
- [x] `lib-trial-gate.ts` - Trial state management
- [x] `lib-churn-enforcement.ts` - Churn rules
- [x] `lib-weekly-job.ts` - Weekly email job executor

## ✅ Middleware (VERIFIED)

- [x] Middleware properly configured
- [x] Cookie-based company ID management
- [x] Demo account detection and handling
- [x] Redirect logic correct

## 🔐 Security Considerations

- [x] Service role key never exposed to client (server-side only)
- [x] Admin endpoints protected with secret token
- [x] Cron routes protected with Bearer token
- [x] Webhook signature verification enabled
- [x] HTTPS enforced in production

## 📦 Dependencies

All production dependencies are properly declared:
- `@supabase/supabase-js` - Database client
- `stripe` - Stripe API client
- `resend` - Email service
- `next` - Framework
- `react` & `react-dom` - UI library
- `@tailwindcss/postcss` - Styling

## 📋 Pre-Deployment Steps

1. **Create `.env.local` on your dev machine** (copy from `.env.example`)
2. **Set environment variables on Vercel Dashboard** (Project Settings → Environment Variables)
3. **Run `npm run build` locally** to test production build
4. **Verify Stripe webhook URL** in Stripe Dashboard points to: `https://yourdomain.vercel.app/api/billing/webhook`
5. **Test cron jobs** with manual curl requests to: `https://yourdomain.vercel.app/api/cron/weekly` (include `Authorization: Bearer YOUR_CRON_SECRET`)
6. **Configure CORS** if needed for API routes

## 🚀 Deployment Steps

1. Push code to GitHub
2. Deploy from Vercel Dashboard (should auto-build on push)
3. Verify deployment logs for any errors
4. Test live endpoints manually
5. Monitor cron job execution in Vercel Analytics

## 🐛 Troubleshooting

### Build Fails with "Stripe Connect Error"
- Check `STRIPE_CLIENT_ID` is set in environment variables
- Verify the variable contains the correct value (should start with `ca_`)

### "Missing Supabase env vars" Error
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check they are not quoted unnecessarily

### Cron Jobs Not Running
- Verify `vercel.json` cron configuration
- Check `CRON_SECRET` matches between route and Vercel's cron settings
- Ensure Vercel Pro plan (required for cron)

### Emails Not Sending
- Verify `RESEND_API_KEY` is set
- Click "Verify Sending Domain" in Resend dashboard
- Update the sender address if using custom domain

## ✅ All Issues Fixed

### Issue #1: Stripe Connect Route Syntax Error ✓ FIXED
**Location**: `app/api/stripe/connect/route.ts`
**Problem**: Line 24 had `client_id: client` (wrong variable name)
**Solution**: Changed to `client_id: clientId,` with proper comma

### Issue #2: TypeScript Config ✓ FIXED
**Location**: `tsconfig.json`
**Problem**: Referenced non-existent file `app/candor-landing.jsx`
**Solution**: Removed incorrect file reference

### Issue #3: Missing Environment Variable Documentation ✓ FIXED
**Location**: `.env.example`
**Problem**: No documentation of required environment variables
**Solution**: Created comprehensive `.env.example` with all required variables listed and documented

## Final Status

✅ **All critical issues resolved**
✅ **Zero TypeScript compilation errors**
✅ **All environment variables documented**
✅ **Ready for GitHub commit and Vercel deployment**
