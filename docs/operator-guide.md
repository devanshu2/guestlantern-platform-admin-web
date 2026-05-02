# Operator Guide

## Provisioning

Use **Provision** to queue `POST /platform/restaurants/provision`. The response is asynchronous and returns a job ID. Open the job detail to inspect step status, worker lease metadata, audit events, and the final runtime receipt.

Important input expectations:

- Tenant ID is optional. If provided, use a UUID such as `33333333-3333-4333-8333-333333333333`.
- Slug must be lower-kebab, for example `smoke-provisioned`.
- Owner phone number must use E.164, for example `+913333333333`.
- Schema version should usually be `restaurant_template/0001_init.sql`.

## Job Actions

- Retry creates a fresh queued job from a failed source job.
- Cancel stops a queued or running job in place.
- Requeue moves a non-active or expired job back to queued.
- Force fail marks a queued or running job failed in place.

Cancel, requeue, and force-fail accept an optional operator reason that the backend records in audit.

## Restaurant Summary And Repair

Use a restaurant UUID to open **Restaurant Summary**. The summary shows metadata, domains, database config, auth config, infra state, readiness gaps, and runtime probes.

Repair guidance:

- Create domains with lowercase hosts such as `smoke-provisioned-custom.guestlantern.localhost`.
- Use secret refs, not raw secrets, for config fields, for example `secret://smoke-provisioned-db-password`.
- After database or auth config repair, run **Prepare infra** to queue reconciliation.
- Secret values are intentionally never displayed.

## Audit Search

Audit reads must be scoped by job ID, restaurant UUID, or both. The backend rejects unscoped audit browsing.

## Tenant Infra Lifecycle Ops

Open a restaurant summary to run tenant infra lifecycle operations. The UI uses the current tenant infra state, disables conflicting actions while provisioning or lifecycle work is active, and requires password step-up for each lifecycle scope.

Database Backup creates a tenant Postgres database snapshot. Disable and re-enable require an operator reason plus restaurant ID confirmation. Permanent delete requires an operator reason plus exact restaurant ID and slug confirmation.
