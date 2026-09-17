---
name: build-troubleshooter
description: Diagnose ELA Transfer build and CI failures conservatively without masking errors or changing production.
---
# Build Troubleshooter

- Read the exact failing command, logs and changed files before proposing a fix.
- Reproduce or inspect the failure with available safe tools when possible.
- Prefer the smallest root-cause fix; do not disable tests, security checks or validation merely to make a build green.
- Check whether the failure is caused by the current change or is pre-existing.
- Re-run the relevant validation after a fix and report what actually passed.
- Do not deploy or merge as part of troubleshooting unless that action was explicitly requested and verified separately.
