# MockMBA rename

## Problem statement
How might we give the product one name that applicants remember and search for, matching the domain they see, before pilot invites go out?

## Recommended direction
Use **MockMBA** everywhere users see the brand, with the tagline "Mock interviews for MBA, EMBA and MiM applicants". It matches the domain (mockmba.com), the Google sign-in consent screen and the search phrase people use. No one outside has seen "Masters" yet (17 Oct 2026), so renaming now is free. If MS interview prep is ever pursued, it gets a sister page or brand on the same engine rather than stretching this name.

## Key assumptions to validate
- [ ] EMBA and MiM applicants don't read the name as excluding them: ask 3-5 pilot users from those groups.
- [ ] "Mock MBA interview" is real search intent: check Search Console queries ~4 weeks after indexing is on.

## MVP scope
User-visible brand only: wordmark, page titles and metadata, footer, auth panel, guides, privacy page, email subjects and sign-offs, calendar export name, `REACT_APP_SITE_NAME` default.

## Not doing (and why)
- Internal identifiers (repo `masters-platform`, Cloudflare project, database names): invisible to users, risk without benefit.
- localStorage keys `masters:user:*`, the auth BroadcastChannel/lock names and the `masters_refresh` cookie: renaming loses users' saved data or signs everyone out.
- Google consent-screen logo: triggers brand verification; after the pilot.
- New domain or MS content: no demand signal yet.

## Open questions
- If `REACT_APP_SITE_NAME` is set in Cloudflare Pages it overrides the code default and must be changed to "MockMBA" too.
