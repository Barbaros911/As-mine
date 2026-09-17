---
name: site-qa
description: Verify ELA Transfer customer, hotel, reception and admin experiences without changing production state.
---
# Site QA

When validating ELA Transfer:

- Test mobile-first and desktop behavior where the available tools support it.
- Verify navigation, booking entry points, origin/destination, date/time, vehicle selection, price display, confirmation and share/copy flows relevant to the requested scope.
- Check public, hotel/reception and admin surfaces for stale or conflicting versions.
- Verify important SEO routes remain reachable when they are in scope.
- Distinguish static inspection from an actual browser/runtime test.
- Do not submit real bookings, charge payments, message drivers/customers, or mutate production data unless the user explicitly requests that action and the connected tool supports it.
- Report reproducible failures with route, action and observed result.
