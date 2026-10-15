# CORE SYSTEM v2.1 — Test Checklist

## Environment prerequisites
- [ ] Use a disposable local Supabase instance or a dedicated isolated Supabase branch.
- [ ] Provision test staff credentials and the tenant license out-of-band for this run.
- [ ] Never store real PINs, license keys, tokens, or personal data in this checklist or CI logs.
- [ ] Confirm E2E mutation scripts are limited to the isolated E2E tenant before running them.

## Build
- [ ] `npx tsc -b` → 0 errors
- [ ] `npm run build` → success

## Database
- [ ] `master_tenants` has the isolated active tenant with a privately provisioned license.
- [ ] `clinic_users` has the expected test staff rows, provisioned without repository-shipped PINs.
- [ ] `clinic_visit_sessions` has isolated test data.

## Auth
- [ ] `/login` loads with the expected theme.
- [ ] PIN login succeeds using credentials provisioned for this isolated run (admin).
- [ ] PIN login succeeds using credentials provisioned for this isolated run (doctor).
- [ ] PIN login succeeds using credentials provisioned for this isolated run (receptionist).
- [ ] JWT/session contains the expected tenant context.
- [ ] Logout button works.

## Data
- [ ] `/reception` shows queue data from the isolated tenant.
- [ ] Queue items have SLA colors.
- [ ] Queue items show only synthetic test patients.
- [ ] Realtime updates work.

## UI and role regression
- [ ] Sidebar shows the isolated clinic name.
- [ ] Sidebar shows the signed-in user and role.
- [ ] Mobile responsive layout works.
- [ ] All role-permitted routes load without 404.
- [ ] Verify `/admin`, `/doctor`, `/reception`, and `/super-admin` against the permission matrix.

## Cleanup
- [ ] Run the E2E soft-reset only against the isolated E2E tenant.
- [ ] Confirm no production database, production deployment, or production environment setting was touched.
