---
name: deployment-guard
description: Gate ELA Transfer releases with explicit pre-deployment verification and post-deployment checks.
---
# Deployment Guard

Before any production deployment or merge to main:

1. Confirm the exact branch/commit and requested scope.
2. Review the diff and unresolved review feedback.
3. Verify available automated checks and relevant functional tests.
4. Confirm no unexpected generated files, secrets, configuration changes or destructive migrations are included.
5. Require explicit user intent for the production-changing action when it has not already been clearly requested.
6. After deployment, verify the resulting state using available tools; never infer success from a local commit alone.

If verification is incomplete, state exactly what remains unverified instead of declaring the release safe.
