BEGIN;
-- 1. clinic_procedures
ALTER TABLE clinic_procedures 
    RENAME COLUMN base_price_fils TO base_price_subunits;
-- 2. clinic_visit_sessions
ALTER TABLE clinic_visit_sessions 
    RENAME COLUMN base_charge_fils TO base_charge_subunits;
ALTER TABLE clinic_visit_sessions 
    RENAME COLUMN additional_charges_fils TO additional_charges_subunits;
ALTER TABLE clinic_visit_sessions 
    RENAME COLUMN discount_fils TO discount_subunits;
ALTER TABLE clinic_visit_sessions 
    RENAME COLUMN total_charge_fils TO total_charge_subunits;
-- 3. clinic_invoices
ALTER TABLE clinic_invoices 
    RENAME COLUMN subtotal_fils TO subtotal_subunits;
ALTER TABLE clinic_invoices 
    RENAME COLUMN tax_fils TO tax_subunits;
ALTER TABLE clinic_invoices 
    RENAME COLUMN discount_fils TO discount_subunits;
ALTER TABLE clinic_invoices 
    RENAME COLUMN total_fils TO total_subunits;
ALTER TABLE clinic_invoices 
    RENAME COLUMN paid_fils TO paid_subunits;
ALTER TABLE clinic_invoices 
    RENAME COLUMN balance_fils TO balance_subunits;
-- 4. inventory_ledger
ALTER TABLE inventory_ledger 
    RENAME COLUMN unit_cost_fils TO unit_cost_subunits;
ALTER TABLE inventory_ledger 
    RENAME COLUMN total_cost_fils TO total_cost_subunits;
-- 5. billing_events
ALTER TABLE billing_events 
    RENAME COLUMN amount_fils TO amount_subunits;
ALTER TABLE billing_events 
    RENAME COLUMN tax_fils TO tax_subunits;
ALTER TABLE billing_events 
    RENAME COLUMN discount_fils TO discount_subunits;
ALTER TABLE billing_events 
    RENAME COLUMN total_fils TO total_subunits;
ALTER TABLE billing_events 
    RENAME COLUMN credits_applied_fils TO credits_applied_subunits;
ALTER TABLE billing_events 
    RENAME COLUMN balance_fils TO balance_subunits;
-- 6. tenant_health_scores
ALTER TABLE tenant_health_scores 
    RENAME COLUMN total_revenue_lifetime_fils TO total_revenue_lifetime_subunits;
-- 7. Update triangulation trigger to reference new column names
CREATE OR REPLACE FUNCTION fn_verify_triangulation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.doctor_par_confirmed = true
        AND NEW.collected_reception = true
        AND NEW.paid_subunits >= (NEW.total_subunits * 0.80) THEN
        NEW.match_triangulation := true;
    ELSE
        NEW.match_triangulation := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMIT;
