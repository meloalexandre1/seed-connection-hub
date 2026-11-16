# Stripe sandbox integration — SEED Connection Hub

## Status
- Branch only. No production deploy or mutation of the hosted Supabase database.
- Planner guide: Stripe sandbox guide `iguide_61Vlw0x7lFduo1R5d415jifGnwLNM` (accepted).
- Components: hosted subscription Checkout, draft invoices in BRL, customer creation linked by metadata to a SEED person ID, hosted Customer Portal, and verified webhook inbox.
- Finance mutations require an authenticated Supabase user with the `admin` role.
- Stripe Tax is intentionally OFF: the business's Brazilian tax/NFS-e obligations require a separate fiscal review. A Stripe invoice PDF is not a Brazilian NFS-e.
- NO real charges: the app refuses non-`sk_test_` keys and webhook refuses live events.

## Before first sandbox call
1. Create an isolated staging deployment. Do **not** attach it to the live domain or live DB for tests involving migrations.
2. Audit the currently tracked `.env` in the repository privately; rotate any leaked credentials. Do not paste secrets into issues, PRs, or ChatGPT.
3. Configure the following in the **server-only secret manager** (not VITE_*):
   - `STRIPE_TEST_INTEGRATION_ENABLED=true`
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (created for the test webhook destination)
   - `STRIPE_APP_ORIGIN=https://<your-staging-host>`
   - `STRIPE_TEST_PRICE_IDS=price_...,price_...` (approved recurring BRL prices)
   - Existing `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` on the **server**
4. Apply `docs/supabase/migrations/0016_stripe_test_events.sql` ONLY to your isolated **staging** Supabase project. Do not apply it to production just to test.
5. In Stripe test mode configure Branding, a Customer Portal configuration, and a webhook destination at
   `https://<your-staging-host>/api/stripe/webhook`.
   Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `credit_note.created`, `charge.refunded`.
6. Configure the customer portal and invoice reminders in Stripe Dashboard test mode.
7. Run a test-only end-to-end transaction. Verify the event in `stripe_test_events`, and send the same signed event twice to confirm the unique `event_id` prevents duplicates.

## Callable authenticated server functions
- `createStripeTestCustomer({personId,email,requestId})`: creates a Stripe test customer, with stable customer idempotency keyed by SEED person. Repeated calls with **different email for the same person** must be handled as a customer update process later.
- `createStripeTestCheckout({customerId,priceId,requestId})`: hosted subscription Checkout. `priceId` must be in the server allowlist.
- `createStripeTestInvoiceDraft({customerId,description,amountCents,requestId})`: creates an unsent, unfinalized BRL invoice in DRAFT. It never sends automatically.
- `createStripeTestCustomerPortal({customerId,requestId})`: hosted customer portal.

All `requestId` values must be generated once per business operation and preserved across retries (UUID). These functions are backend APIs; an admin UI has not yet been built.

## Limitations / gate to production
- **No payout or live charges**, and no Tax calculations.
- The webhook currently verifies signatures and durably logs events. It **does not** yet change a person's payment status, grant entitlements, or reconcile ledger records. Create a proper finance schema and background processor before relying on it for business operations.
- Person/customer linkage lives in Stripe metadata, not a synchronized SEED mapping table. For production, add a unique `person_id -> stripe_customer_id` mapping table, plus read models and reconciliation.
- The adapter uses direct Stripe REST requests to avoid a dependency/lockfile change in this isolated first stage. Consider the official `stripe` Node SDK before production.
- Do not surface the invoice or checkout pages as a valid Brazilian fiscal document; arrange NFS-e separately.
- Invoicing: test invoice creation is safe to retry with the *same* requestId. If invoice-item creation fails midway, the draft may remain incomplete; add a repair/reconciliation task before production.
- Complete authentication, portal authorization, staging payment method tests, webhook replay and failure tests, Brazilian tax review, and PR review before merging.
