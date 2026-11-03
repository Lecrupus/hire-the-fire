# Contributing

## Branches

`main` is always deployable and protected: a pull request and a green CI run are required to merge.
Work on short-lived branches named `feat/…`, `fix/…`, `test/…` or `docs/…`.

## Commits

[Conventional commits](https://www.conventionalcommits.org/):

```
feat(jobs): add salary filter
fix(auth): refresh loop on 401
test(applications): duplicate apply
```

One GitHub issue per feature; each PR closes its issue (`Closes #12`).

## Before you open a PR

```bash
npm run lint
npm test
npm run build -w client
```

A Husky pre-commit hook formats staged files with Prettier and runs ESLint. CI runs the same checks
plus server coverage (fails under 70% lines).

## PR checklist

The template in `.github/pull_request_template.md` lists it: tests, validation and ownership checks,
no secrets or `console.log`, docs updated, screenshots for UI changes.
