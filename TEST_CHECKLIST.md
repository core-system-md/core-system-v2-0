# CORE SYSTEM v2.0 — Test Checklist

## ✅ Build
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → success

## ✅ Database
- [ ] `license_key` updated to `DEMO-LICENSE-2024`
- [ ] `master_tenants` has active tenant
- [ ] `clinic_users` has 3 staff members
- [ ] `clinic_visit_sessions` has data

## ✅ Auth
- [ ] /login loads with dark theme
- [ ] PIN login with `1234` (Admin) → success
- [ ] PIN login with `5678` (Doctor) → success
- [ ] PIN login with `0000` (Reception) → success
- [ ] JWT contains `user_metadata.tenant_id`
- [ ] Logout button works

## ✅ Data
- [ ] /reception shows Queue (not empty)
- [ ] Queue items have SLA colors
- [ ] Queue items show patient names
- [ ] Realtime updates work

## ✅ UI
- [ ] Sidebar shows clinic name
- [ ] Sidebar shows user name + role
- [ ] Mobile responsive works
- [ ] All routes load without 404
