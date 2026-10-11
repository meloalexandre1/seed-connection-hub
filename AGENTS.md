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
- Data access goes through `src/services/`: `live.ts` talks to the real backend (RLS-enforced, publishable key only), `index.ts` still serves demo data for screens not migrated yet. Why: migrate screen by screen without touching unrelated UI.
- App pages live under `src/routes/_authenticated/` (client-only gate to `/auth`); `/auth` is the only public page. Why: private, invite-only app.
- The backend is Lovable Cloud (Supabase under the hood); its schema/RLS is defined by `docs/supabase/migrations/NNNN_*.sql`, already applied to the live backend. Why: single source of truth for the schema; screens swap from demo to live service by service.
- Never store real data in localStorage and never ship privileged keys to the browser. Why: privacy/LGPD.
- Demo actions must show an honest "not saved" notice, never a fake success. Why: no fake integrations.
- App chrome (sidebar desktop, bottom nav mobile) lives in `src/components/app/AppShell.tsx`, mounted in `__root.tsx`.
- Supabase schema source of truth is `docs/supabase/migrations/NNNN_*.sql` (idempotent); `schema.sql` is their concatenation and must be regenerated, never hand-edited. Why: reviewable, re-runnable migrations.
- Security-definer helpers live only in the unexposed `private` schema with empty search_path; every public table has explicit grants and RLS. Why: no generic authenticated access.
