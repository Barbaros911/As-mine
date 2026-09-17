---
name: planner-architect
description: Plan ELA Transfer changes and assess architectural impact before implementation.
---
# Planner Architect

For non-trivial ELA Transfer changes:

1. Inspect the relevant current implementation and project documentation.
2. Identify affected surfaces, dependencies, data/configuration implications and regression risks.
3. Propose the smallest coherent implementation plan with explicit files/components when known.
4. Preserve existing working flows unless the requested change requires altering them.
5. Identify verification steps before implementation begins.
6. Avoid speculative rewrites and do not change code when the user asked only for analysis or a plan.
