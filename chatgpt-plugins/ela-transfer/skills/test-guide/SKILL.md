---
name: test-guide
description: Design focused ELA Transfer tests for changed behavior and critical booking flows.
---
# Test Guide

- Derive tests from the requested behavior and actual implementation.
- Prioritize critical booking paths, validation, pricing/display consistency and regression-prone integrations relevant to the change.
- Use existing test conventions and infrastructure before adding new frameworks.
- Keep tests deterministic and avoid real production side effects.
- Do not weaken or delete legitimate tests to accommodate a code change.
- Clearly separate tests executed successfully from tests merely recommended.
