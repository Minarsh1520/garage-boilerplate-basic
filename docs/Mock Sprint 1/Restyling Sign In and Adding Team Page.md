# Documentation of Mock Sprint 1 work — Summary
## Made by Minh Tran
**Dev log · `feature/teamPage`** · `766a61b → dc9ab2c` · final state as of **PR #8** (merged, current `main`)

Condensed version — major features and fixes only, from the 5 commits since PR #5 merged.

---

## Major features
- **Restyling Sign In Page** Sign in page has been restyle as per requirement.
- **Team Page Added** Adding team page with images (png) add in local frontend/public/images/team and short blurb store in the team page.tsx.
- **Redirect Log In to Team Page** All login method will direct to Team Page.
- **Mobile navigation drawer.** `Sidebar.tsx` was `hidden lg:flex` — below 1024px there was no way to reach Dashboard, Notes, Profile, Settings, or Team at all. Added a hamburger toggle + slide-in drawer directly in `Navbar.tsx` (no new component file), reusing `Sidebar.tsx`'s exported `navItems` as the single source of truth for both menus.

## Major fixes

- **Team page scaling, end to end.** `grid-cols-[20%_80%]` (a percentage avatar column with no cap, which ballooned on wide screens) → a fixed-pixel column (`grid-cols-[100px_1fr] sm:grid-cols-[128px_1fr]`) → `clamp()`-based fluid scaling for the avatar column, card padding, and name/role/description text, so the whole card grows continuously with viewport width instead of jumping at fixed breakpoints.
- **Team page width.** `max-w-4xl` → `max-w-7xl` (matching `docs/DESIGN.md`'s own page-width convention) → removed entirely, ending on plain `w-full`, so it fills the screen next to the sidebar instead of leaving large dead margins on wide monitors. Only safe once the avatar column was fixed-pixel — a percentage column would have ballooned again the moment the cap came off.
- **Sign-in "always looks mobile" bug.** `(auth)/layout.tsx`'s `max-w-sm` centering wrapper was clipping the sign-in page's own full-width header down to a 384px column at every screen size. Removed.
- **Sign-up color inversion.** A hardcoded `bg-white` on `(auth)/layout.tsx`'s inner wrapper had no `dark:` counterpart, so it clashed with the sign-up inputs' own independent `dark:` classes under system dark mode — half the page flipped dark, half stayed frozen white. One class removed.
- **Content bug.** Scarlet Heng's bio had been accidentally overwritten with a duplicate of another member's bio (a `git stash` mishap) — recovered.
- **Cross-cutting change.** `DashboardShell`'s `<main>` lost its `p-6` padding entirely, which affects every dashboard route (Dashboard, Notes, Profile, Settings), not just team page — still worth a visual check on those pages.

## Still open

- What fills the empty space below the card list on tall/wide screens is unresolved (a few options were on the table: neutral background, vertically centering the list, or bigger cards).
- Auth function cause page to render quite slow, more prevalent as it now direct to team page
- The globals.css prefer @media is still dark mode, which conflict with current UI design motiff.
---

Merged via [PR #7](https://github.com/Minarsh1520/garage-boilerplate-basic/pull/7) and [PR #8](https://github.com/Minarsh1520/garage-boilerplate-basic/pull/8).

Document written by Minh Quang Tran, with formatting assistance from Claude AI