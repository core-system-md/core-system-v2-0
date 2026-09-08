# CORE SYSTEM v2.1 — P79 Migration History Reconciliation

Date: 2026-09-08
Production Supabase: `gobdznqbdaklkkqbkynx`
Repository: `core-system-md/core-system-v2-0`
Branch: `main`

## Purpose

Establish an evidence-backed reconciliation between the repository migration files and the Production Supabase migration registry before any migration-history cleanup is considered.

## Method

- Read the authoritative migration registry from Production Supabase via `list_migrations`.
- Read the authoritative migration-file inventory from GitHub `main` under `supabase/migrations/`.
- Match by migration `name` where the Production registry uses timestamped versions and the repository uses either numeric prefixes or timestamped filenames.
- Do not infer equivalence from numeric prefixes alone.
- Do not rewrite, delete, rename, or backfill Production migration-history rows.
- Do not treat an unmatched Production migration as safe to remove or recreate.

## Production registry observed

Production currently exposes **37 migration rows** through the Supabase migration registry.

### Exact name matches with repository files

**25** Production migration names have an identifiable repository file with the same migration name:

- `extensions` → `001_extensions.sql`
- `014_subunits_conversion` → `014_subunits_conversion.sql`
- `015_patient_identity` → `015_patient_identity.sql`
- `016_currency_global` → `016_currency_global.sql`
- `017_procedure_taxonomy` → `017_procedure_taxonomy.sql`
- `043_fix_patient_intake_page_order_null_guard` → `043_fix_patient_intake_page_order_null_guard.sql`
- `fix_update_session_status_authorization` → `044_fix_update_session_status_authorization.sql`
- `restore_canonical_queue_rpc` → `045_restore_canonical_queue_rpc.sql`
- `fix_queue_rpc_ambiguity` → `046_fix_queue_rpc_ambiguity.sql`
- `pin_session_pin_only_login` → `048_pin_session_pin_only_login.sql`
- `remove_legacy_validate_license_overload` → `048_remove_legacy_validate_license_overload.sql`
- `049_fix_pin_session_crypto_schema` → `049_fix_pin_session_crypto_schema.sql`
- `050_reception_pin_session_operations` → `050_reception_pin_session_operations.sql`
- `051_reception_pin_queue_broadcast` → `051_reception_pin_queue_broadcast.sql`
- `052_lock_reception_broadcast_trigger_function` → `052_lock_reception_broadcast_trigger_function.sql`
- `auth_metadata_claims_alignment` → `053_auth_metadata_claims_alignment.sql`
- `fix_cron_job_authorization_json` → `20260907202208_fix_cron_job_authorization_json.sql`
- `secure_cron_edge_function_auth` → `20260907202348_secure_cron_edge_function_auth.sql`
- `restore_leakage_detector_rpc` → `20260907202604_restore_leakage_detector_rpc.sql`
- `fix_analytics_snapshot_rpc_contract` → `054_analytics_snapshot_rpc_contract.sql`
- `p74_governance_deleted_at_columns` → `044_p74_governance_deleted_at_columns.sql`
- `p76_governance_timestamp_columns` → `045_p76_governance_timestamp_columns.sql`
- `p78_feature_flag_global_deduplication` → `046_p78_feature_flag_global_deduplication.sql`
- `p75_soft_delete_pin_sessions` → `053_p75_soft_delete_pin_sessions.sql`
- `p83_index_pin_sessions_staff_id` → `054_p83_index_pin_sessions_staff_id.sql`

The repository also contains three legacy timestamped placeholder files whose embedded migration names correspond to Production registry names for historical migrations:

- `20260610015013_019_pin_rate_limiting.sql` → `019_pin_rate_limiting`
- `20260610015618_020_session_status_fix.sql` → `020_session_status_fix`
- `20260610020316_022_rls_policies.sql` → `022_rls_policies`

These placeholder files are zero-byte compatibility artifacts in the repository and are not treated as proof that the non-placeholder numeric files were the exact files executed in Production.

### Production migration names without a matching repository filename

**12** Production migration names are observed without a same-name file under `supabase/migrations/` on `main`:

1. `urgent_restrict_anon_dangerous_functions`
2. `fix_direct_anon_grant_on_dangerous_functions`
3. `fix_remaining_rls_initplan_and_duplicate_indexes_v2`
4. `add_missing_fk_indexes_real_prod`
5. `fix_function_search_path_mutable`
6. `restrict_debug_jwt_probe`
7. `consolidate_permissive_policies`
8. `consolidate_pin_attempt_log_policies`
9. `drop_duplicate_unique_constraint`
10. `add_soft_delete_columns_gobdznqbdaklkkqbkynx`
11. `049_pin_session_pin_only_alignment`
12. `fix_pin_queue_rpc_search_path`

Therefore the observed registry reconciles arithmetically as **25 exact-name matches + 12 unmatched Production names = 37 Production rows**.

These unmatched entries are evidence of Production migration history that is not represented by a same-name repository migration file. The absence of a same-name file does **not** by itself prove that the underlying database change is absent from the repository's current desired state; equivalence requires SQL/effect-level comparison.

## Effect-level evidence checked

A read-only Production schema/function/index check was performed after the name-level reconciliation. Current state confirms:

- All active tenant-owned `public` base tables have `deleted_at`; the two global reference tables are excluded by contract.
- No `public` foreign key was found without a valid leading-column index.
- No duplicate active public index definitions were found.
- All current `SECURITY DEFINER` functions in `public` have an explicit `search_path` configuration.
- `public.debug_jwt_probe()` exists, is `SECURITY INVOKER`, has `search_path=public`, and is not executable by `anon`; it is executable by `authenticated`.
- `public.idx_pin_sessions_staff_id` exists with definition `CREATE INDEX idx_pin_sessions_staff_id ON public.pin_sessions USING btree (staff_id)`.

The repository search did not find a same-name `debug_jwt_probe` implementation, so the effect is verified in Production but provenance to a repository migration file is not established.

## Important finding about version numbers

Production migration `version` values are timestamp-based for most modern entries, while the repository uses numeric prefixes and, for several historical compatibility artifacts, timestamp-prefixed filenames. Therefore numeric ordering (`001`, `002`, ... `054`) cannot be used as a one-to-one Production history key.

Example: Production records `20260908093219 / p74_governance_deleted_at_columns`, while the repository file is `044_p74_governance_deleted_at_columns.sql`. The migration `name` provides the useful provenance link; the numeric repository prefix does not.

## Disposition

### Reconciliation result

`CONFIRMED` — A non-destructive name-level reconciliation is now documented, with exact arithmetic: 25 same-name repository matches + 12 unmatched Production names = 37 Production migration rows. Read-only effect checks were also performed without modifying Production.

### Cleanup result

`BLOCKED — INSUFFICIENT EVIDENCE` — No Production migration-history row is deleted, renamed, rewritten, or synthesized. The unmatched Production migrations cannot be safely cleaned solely from name or current-state evidence. A safe cleanup would require migration SQL/provenance comparison for each unmatched entry plus an explicitly reversible recovery procedure.

## Next safe action

Proceed with targeted effect/provenance comparison for the 12 unmatched Production migrations, prioritizing the security/index/search-path migrations because their current effects are observable in Production. Keep Production migration history unchanged until a one-to-one provenance mapping and rollback-safe procedure are established.
