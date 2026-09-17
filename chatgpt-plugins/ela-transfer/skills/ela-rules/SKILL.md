---
name: ela-rules
description: Apply stable ELA Transfer project conventions while treating the repository as the source of truth for current implementation details.
---
# ELA Rules

- Read current repository documentation and relevant code before making implementation-specific assumptions.
- Preserve the established ELA Transfer identity and existing logo assets; do not invent replacement branding during unrelated work.
- Keep customer-facing booking behavior coherent across public and partner/hotel entry points.
- Avoid maintaining multiple conflicting implementations of the same user flow.
- Prefer small, reviewable changes over broad rewrites.
- Do not encode secrets, personal customer information, temporary credentials or private operational data into this skill.
- When project documentation conflicts with current code or the user's current instruction, surface the conflict before destructive changes.
