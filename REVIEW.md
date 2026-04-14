# AU Hospital Watch — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-hospitals/ *(redirects to custom domain)*
- **Custom domain:** https://au-hospitals.benrichardson.dev *(live — TLS cert issued)*

## DNS setup

DNS CNAME and TLS cert are already provisioned:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-hospitals` | `ben-gy.github.io` | DNS only ✓ |
