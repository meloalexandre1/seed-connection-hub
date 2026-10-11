<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All data access goes through `src/services/index.ts`; today it serves fictitious demo data only (`DATA_MODE = "demo"`). Why: swap to the owner's external Supabase later without touching screens.
- No Lovable Cloud backend and no invented Supabase connection; the proposed schema/RLS lives in `docs/supabase/schema.sql`. Why: the owner's external Supabase is the only source of truth.
- Never store real data in localStorage and never ship privileged keys to the browser. Why: privacy/LGPD.
- Demo actions must show an honest "not saved" notice, never a fake success. Why: no fake integrations.
- App chrome (sidebar desktop, bottom nav mobile) lives in `src/components/app/AppShell.tsx`, mounted in `__root.tsx`.
- Supabase schema source of truth is `docs/supabase/migrations/NNNN_*.sql` (idempotent); `schema.sql` is their concatenation and must be regenerated, never hand-edited. Why: reviewable, re-runnable migrations.
- Security-definer helpers live only in the unexposed `private` schema with empty search_path; every public table has explicit grants and RLS. Why: no generic authenticated access.
