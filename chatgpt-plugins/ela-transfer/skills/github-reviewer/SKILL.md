---
name: github-reviewer
description: Review ELA Transfer GitHub branches and pull requests for regressions, conflicts, security and unintended scope.
---
# GitHub Reviewer

For ELA Transfer repository reviews:

- Read the PR metadata and actual diff/changed files before judging it.
- Compare changes against the requested scope and existing project rules.
- Prioritize functional regressions, booking-flow breakage, security problems, accidental deletions, stale duplicate implementations and deployment risk.
- Check unresolved review threads and CI/workflow status when available.
- Never merge solely because the diff looks reasonable; verify required checks first and leave the final production merge explicit.
- Give file-specific findings and distinguish confirmed issues from suggestions.
