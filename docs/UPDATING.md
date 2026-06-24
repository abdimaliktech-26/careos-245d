# Updating Higsi in Production

How to safely change the live app. Production: **https://careintake-five.vercel.app**
(Vercel project `careintake`, DB = Supabase `hwsbizbdvxofsyehttkw`.)

> **Golden rule:** never edit `main` or prod directly. Always branch → CI green → deploy → verify → rollback if bad. `main` must always be deployable.

---

## The standard update (every change)

```bash
cd ~/Desktop/careintake
git checkout main && git pull
git checkout -b fix/<short-name>        # 1. branch

# ...make the change...

npm run build && npx vitest run         # 2. must BOTH pass locally

git add -A && git commit -m "fix: <what changed>"
git push -u origin fix/<short-name>
gh pr create --fill                     # 3. CI runs on the PR
# wait for CI green, then:
gh pr merge --squash --delete-branch
```

**Deploy:**
- If Vercel Git integration is connected → merging already deployed it. Done.
- If not → deploy manually:
  ```bash
  git checkout main && git pull
  vercel --prod --yes
  ```

**Then verify:** open the live site, hard-refresh (Cmd+Shift+R), log in, test the change, watch `vercel logs` for ~5 min.

---

## If a deploy breaks production — ROLLBACK FIRST

```bash
vercel ls careintake            # find the previous good deployment URL
vercel rollback <previous-url>  # instant: last-good version back in seconds
```
Or: Vercel Dashboard → Deployments → previous one → **Promote to Production**.

Then fix forward calmly on a branch.

⚠️ **Rollback reverts CODE ONLY — not the database.**

---

## Database changes (extra care once you have real users)

Schema lives in Supabase, separate from code. Migrations: `supabase/migrations/`.

- **Forward-only** — never edit an already-applied migration; write a NEW file.
- **Additive first** — add columns/tables before removing, so old + new code both work during the deploy window.
- Ship the migration **before or with** the code that needs it — never after.
- Apply via Supabase MCP `apply_migration` or `supabase db push`.
- Most "works locally, fails in prod" bugs = missing/incorrect **RLS policies**.
- A code rollback does NOT undo a migration — fix a bad migration with another migration.

---

## Environment variables / secrets

```bash
vercel env ls
vercel env add <NAME> production     # then redeploy for it to take effect
vercel env rm <NAME> production
```
Examples: `NEXT_PUBLIC_APP_NAME`, Supabase keys, `RESEND_API_KEY`, `CRON_SECRET`.

---

## Severity triage

| Severity | Example | Action |
|----------|---------|--------|
| 🔴 P0 — site down / login broken / data leak | white screen, all logins fail | **Rollback now**, then fix |
| 🟠 P1 — feature broken, workaround exists | export fails | Hotfix branch → ship |
| 🟢 P2 — cosmetic / minor | typo, color | Normal flow |

---

## Where to look when something's wrong

| Source | Shows |
|--------|-------|
| `vercel logs <url>` / Vercel Dashboard → Logs | runtime errors, 500s, crashes |
| Supabase Dashboard → Logs | DB errors, RLS denials, slow queries |
| Browser console + Network tab | client errors, failed auth |

---

## Recommended upgrades

1. **Vercel Git integration** (Settings → Git) → auto-deploy `main` + preview URL per PR. Then updating = merge a PR.
2. **Error monitoring** (Sentry or Vercel Observability) → hear about issues before users report them.
