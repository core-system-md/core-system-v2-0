BEGIN;
CREATE TABLE currency_reference (
    code VARCHAR(3) PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    subunit INTEGER NOT NULL DEFAULT 100,
    symbol TEXT,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_crypto BOOLEAN NOT NULL DEFAULT FALSE,
    countries TEXT[],
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO currency_reference (code, name, name_ar, subunit, symbol, decimal_places, countries) VALUES
('USD', 'US Dollar', 'الدولار الأمريكي', 100, '$', 2, ARRAY['US']),
('EUR', 'Euro', 'اليورو', 100, '€', 2, ARRAY['EU']),
('GBP', 'British Pound', 'الجنيه الإسترليني', 100, '£', 2, ARRAY['GB']),
('JOD', 'Jordanian Dinar', 'الدينار الأردني', 1000, 'د.أ', 3, ARRAY['JO']),
('SAR', 'Saudi Riyal', 'الريال السعودي', 100, 'ر.س', 2, ARRAY['SA']),
('EGP', 'Egyptian Pound', 'الجنيه المصري', 100, 'ج.م', 2, ARRAY['EG']),
('AED', 'UAE Dirham', 'الدرهم الإماراتي', 100, 'د.إ', 2, ARRAY['AE']),
('KWD', 'Kuwaiti Dinar', 'الدينار الكويتي', 1000, 'د.ك', 3, ARRAY['KW']),
('QAR', 'Qatari Riyal', 'الريال القطري', 100, 'ر.ق', 2, ARRAY['QA']),
('BHD', 'Bahraini Dinar', 'الدينار البحريني', 1000, 'د.ب', 3, ARRAY['BH']),
('OMR', 'Omani Rial', 'الريال العماني', 1000, 'ر.ع', 3, ARRAY['OM']),
('TND', 'Tunisian Dinar', 'الدينار التونسي', 1000, 'د.ت', 3, ARRAY['TN']),
('LBP', 'Lebanese Pound', 'الليرة اللبنانية', 100, 'ل.ل', 2, ARRAY['LB']),
('IQD', 'Iraqi Dinar', 'الدينار العراقي', 1000, 'د.ع', 3, ARRAY['IQ']),
('MAD', 'Moroccan Dirham', 'الدرهم المغربي', 100, 'د.م', 2, ARRAY['MA']),
('YER', 'Yemeni Rial', 'الريال اليمني', 100, 'ر.ي', 2, ARRAY['YE']),
('SYP', 'Syrian Pound', 'الليرة السورية', 100, 'ل.س', 2, ARRAY['SY']),
('SDG', 'Sudanese Pound', 'الجنيه السوداني', 100, 'ج.س', 2, ARRAY['SD']);
ALTER TABLE master_tenants
    ALTER COLUMN currency TYPE VARCHAR(3),
    ADD CONSTRAINT fk_tenant_currency
        FOREIGN KEY (currency) REFERENCES currency_reference(code);
COMMIT;
