# Mars development

- This is a clone of the Lumi UI source. Preserve its MIT license and upstream attribution.
- App: `apps/www`; Playground: `app/[locale]/(view)/(dashboard)/page.tsx`.
- Use the installed `mars` skill for MARS UI and policy-workspace changes. Its entrypoint is `~/.codex/skills/mars/SKILL.md`; it covers the local Lumi UI and Base UI layers. Use `lumi` for general Lumi integration guidance when needed.
- Feature imports use `@/components/ui/*`. Preserve Base UI `render` composition, data-slot attributes, semantic tokens, root isolation, and shared animation utilities.
- `components/ui/toast.tsx` intentionally re-exports the upstream module to share toast managers with the app Toaster.
- Use pnpm; do not update bun.lock. pnpm-lock.yaml is the active lockfile.
- Start with `pnpm dev` and open http://localhost:3100/. Keep the localhost hostname for locale rewrites.
- Run `pnpm typecheck` and `pnpm build` after material changes.
- Keep demo formatting deterministic across server/browser locales.
- The nested `mars/` directory is a pre-existing independent project. Do not modify it as part of this app.
- Consult installed Next.js docs before changing Next.js APIs or configuration.
