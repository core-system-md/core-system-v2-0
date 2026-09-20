# i18n — Bilingual Database Field Audit

## Scope

Documentation only. No Supabase schema, migration, RLS policy, RPC, index, or data mutation is introduced by this audit.

## Current state

The current schema contains Arabic-specific columns without English counterparts in the application/database model:

- `first_name_ar`
- `father_name_ar`
- `last_name_ar`
- `currencies.name_ar`
- `procedure_name_ar`

No `_en` columns are being created in this phase.

## Options for a future multilingual data model

1. **Paired columns** — add a matching `_en` column for each bilingual field. Simple reads and writes, but every additional language expands the schema.
2. **Dedicated translations table** — store entity/key/language/value rows separately. Better for multiple languages and governance, with additional joins and constraints.
3. **JSONB multilingual value** — store values such as `{ "ar": "...", "en": "..." }`. Flexible for future languages, but requires consistent validation/query conventions.

## Recommended decision gate

Prefer the **dedicated translations table** if more than two languages are expected or if translation lifecycle/auditability matters. Prefer **paired columns** if the product scope is intentionally limited to Arabic + English and simple query performance is the priority.

No option is implemented until an explicit schema approval is provided by the project owner.
