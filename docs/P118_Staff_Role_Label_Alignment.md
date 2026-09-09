# P118 — Staff Role Label Alignment

## Claim
The active Clinic Admin Staff Management surface used role labels that were inconsistent with the established Arabic identity contract used by the active Reception and Doctor shells.

## Evidence
- `StaffManagement.tsx` previously labeled `receptionist` as `استقبال` and `super_admin` as `مدير النظام`.
- The active Reception identity mapping uses `موظف الاستقبال` for `receptionist` and `مشرف عام` for `super_admin`.
- The active Doctor identity mapping uses `مشرف عام` for `super_admin` and `موظف الاستقبال` for `receptionist`.
- The repair changed only the two display labels; role values and permission behavior were not changed.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope
UI label consistency only. No DB, RLS, Auth, RPC, permission matrix, tenant boundary, scoring, financial, routing, or business-rule change.
