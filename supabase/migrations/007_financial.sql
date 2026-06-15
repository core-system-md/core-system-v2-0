-- Clinic Invoices Table
-- Billing and invoice tracking for patient visits
-- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.

CREATE TABLE clinic_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES clinic_visit_sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES clinic_patients(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    
    -- Amount details (all in fils)
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    subtotal_fils INTEGER NOT NULL,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    tax_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    discount_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    total_fils INTEGER NOT NULL,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    paid_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    balance_fils INTEGER NOT NULL,
    
    -- Status and dates
    status TEXT NOT NULL DEFAULT 'draft',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Payment details
    payment_method TEXT,
    payment_reference TEXT,
    
    -- Metadata
    notes TEXT,
    invoice_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT clinic_invoices_number_tenant_unique UNIQUE (tenant_id, invoice_number),
    CONSTRAINT clinic_invoices_status_check CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled', 'refunded')),
    CONSTRAINT clinic_invoices_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'insurance', 'bank_transfer', 'mobile_payment', 'other')),
    CONSTRAINT clinic_invoices_amounts_positive CHECK (subtotal_fils >= 0 AND total_fils >= 0),
    CONSTRAINT clinic_invoices_balance_check CHECK (balance_fils >= 0)
);

-- Inventory Ledger Table
-- Tracks inventory transactions and stock levels
-- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.

CREATE TABLE inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    item_category TEXT,
    
    -- Transaction details
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL DEFAULT 'piece',
    
    -- Cost tracking
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    unit_cost_fils INTEGER NOT NULL,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    total_cost_fils INTEGER NOT NULL,
    
    -- References
    session_id UUID REFERENCES clinic_visit_sessions(id) ON DELETE SET NULL,
    supplier_name TEXT,
    
    -- Batch tracking
    batch_number TEXT,
    expiry_date DATE,
    
    -- Stock level after transaction
    quantity_after INTEGER NOT NULL,
    
    -- Audit
    performed_by UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT inventory_ledger_transaction_type_check CHECK (transaction_type IN ('purchase', 'use', 'adjustment', 'return', 'waste', 'transfer')),
    CONSTRAINT inventory_ledger_item_tenant_unique UNIQUE (tenant_id, item_code),
    CONSTRAINT inventory_ledger_quantity_check CHECK (quantity != 0),
    CONSTRAINT inventory_ledger_costs_positive CHECK (unit_cost_fils >= 0 AND total_cost_fils >= 0)
);

CREATE INDEX idx_clinic_invoices_tenant_id ON clinic_invoices(tenant_id);
CREATE INDEX idx_clinic_invoices_session_id ON clinic_invoices(session_id);
CREATE INDEX idx_clinic_invoices_patient_id ON clinic_invoices(patient_id);
CREATE INDEX idx_clinic_invoices_status ON clinic_invoices(status);
CREATE INDEX idx_clinic_invoices_issued_at ON clinic_invoices(issued_at);
CREATE INDEX idx_inventory_ledger_tenant_id ON inventory_ledger(tenant_id);
CREATE INDEX idx_inventory_ledger_item ON inventory_ledger(item_code);
CREATE INDEX idx_inventory_ledger_transaction_type ON inventory_ledger(transaction_type);
CREATE INDEX idx_inventory_ledger_session_id ON inventory_ledger(session_id);
CREATE INDEX idx_inventory_ledger_created_at ON inventory_ledger(created_at);
