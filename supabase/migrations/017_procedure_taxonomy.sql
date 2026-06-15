BEGIN;
CREATE TABLE medical_procedure_taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_specialty TEXT NOT NULL,
    category TEXT,
    procedure_name TEXT NOT NULL,
    procedure_name_ar TEXT,
    standard_code TEXT,
    standard_code_type TEXT,
    standard_duration_minutes INTEGER DEFAULT 30,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_regional_standard BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_taxonomy_standard_code UNIQUE (standard_code_type, standard_code) 
        WHERE standard_code IS NOT NULL AND standard_code_type IS NOT NULL
);
CREATE INDEX idx_taxonomy_specialty ON medical_procedure_taxonomy(medical_specialty, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_taxonomy_category ON medical_procedure_taxonomy(category);
CREATE INDEX idx_taxonomy_name ON medical_procedure_taxonomy(procedure_name);
CREATE INDEX idx_taxonomy_regional ON medical_procedure_taxonomy(is_regional_standard) 
    WHERE is_regional_standard = TRUE;
CREATE INDEX idx_taxonomy_code_lookup ON medical_procedure_taxonomy(standard_code_type, standard_code) 
    WHERE standard_code IS NOT NULL;
ALTER TABLE medical_procedure_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxonomy_global_select" ON medical_procedure_taxonomy 
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "taxonomy_super_admin_insert" ON medical_procedure_taxonomy 
    FOR INSERT TO authenticated WITH CHECK (auth.is_super_admin() = TRUE);
CREATE POLICY "taxonomy_super_admin_update" ON medical_procedure_taxonomy 
    FOR UPDATE TO authenticated USING (auth.is_super_admin() = TRUE);
CREATE POLICY "taxonomy_super_admin_delete" ON medical_procedure_taxonomy 
    FOR DELETE TO authenticated USING (auth.is_super_admin() = TRUE);
ALTER TABLE clinic_procedures
    ADD COLUMN taxonomy_id UUID REFERENCES medical_procedure_taxonomy(id) ON DELETE SET NULL,
    ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_clinic_procedures_taxonomy ON clinic_procedures(taxonomy_id) 
    WHERE taxonomy_id IS NOT NULL;
CREATE INDEX idx_clinic_procedures_custom ON clinic_procedures(tenant_id, is_custom);
COMMIT;
