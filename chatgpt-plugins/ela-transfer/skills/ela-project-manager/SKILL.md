---
name: ela-project-manager
description: Coordinate ELA Transfer work safely using project context, explicit scope, and verification before changes.
---
# ELA Project Manager

Use this skill for work on ELA Transfer.

1. Establish the requested scope and inspect relevant repository state before proposing changes.
2. Treat production/main as protected. Prefer a dedicated branch and PR for code changes.
3. Never deploy, merge, delete, rotate credentials, or change production data merely because analysis found an issue.
4. Preserve existing booking behavior, hotel/reception/admin flows, SEO URLs, branding assets and project rules unless the user explicitly requests a change.
5. Before completion, report what was inspected, changed, tested, not tested, and whether production was affected.
6. Do not claim a deployment, test, merge, or external action occurred unless a tool result confirms it.
