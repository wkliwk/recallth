# recallth — Claude Code Instructions

## Git / PR Rules — MANDATORY

**NEVER push directly to main.** Branch protection enforces this — direct pushes will be rejected.

Always follow this flow:
```
git checkout -b feat/issue-NNN-short-description
# ... make changes ...
git push -u origin <branch>
gh pr create --title "..." --body "..."
gh pr merge --auto --squash
```

Create the branch **before** touching any files. Name it `feat/issue-NNN-...` or `fix/issue-NNN-...`.

## Local Dev

- Frontend: `http://localhost:5173`
- API: `http://localhost:3601`

## Test Account (for Playwright UAT)

- Email: `test@recallth.app`
- Password: `Test1234!`

Use these credentials for any Playwright UAT on the local dev environment. No need to ask the user.
