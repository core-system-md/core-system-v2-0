-- 018_taxonomy_seed.sql
-- Seed reference medical procedures for 7 regional specialties
-- IDEMPOTENT: Safe to re-run. Skips existing records by (specialty, name).

BEGIN;

WITH seed_data(medical_specialty, procedure_name, procedure_name_ar, category, standard_duration_minutes) AS (
    VALUES
    -- Dermatology
    ('dermatology', 'Skin Consultation', 'استشارة جلدية', 'consultation', 15),
    ('dermatology', 'Chemical Peel Superficial', 'تقشير كيميائي سطحي', 'non_invasive', 30),
    ('dermatology', 'Acne Treatment Session', 'جلسة علاج حب الشباب', 'therapeutic', 20),
    ('dermatology', 'Mole Removal', 'إزالة الشامة', 'minor_surgical', 30),
    ('dermatology', 'Eczema Management', 'علاج الأكزيما', 'therapeutic', 15),
    ('dermatology', 'Psoriasis Treatment', 'علاج الصدفية', 'therapeutic', 15),
    ('dermatology', 'Skin Biopsy', 'خزعة جلدية', 'diagnostic', 20),
    ('dermatology', 'Wart Cauterization', 'كي الثآليل', 'minor_surgical', 15),

    -- Non-Surgical Cosmetic
    ('non_surgical_cosmetic', 'Botox Injection', 'حقن البوتوكس', 'injectable', 15),
    ('non_surgical_cosmetic', 'Dermal Filler Injection', 'حقن الفيلر', 'injectable', 30),
    ('non_surgical_cosmetic', 'Laser Hair Removal Session', 'جلسة إزالة الشعر بالليزر', 'laser', 30),
    ('non_surgical_cosmetic', 'Laser Skin Resurfacing', 'تجديد البشرة بالليزر', 'laser', 45),
    ('non_surgical_cosmetic', 'Hydrafacial', 'هيدرافيشل', 'skincare', 60),
    ('non_surgical_cosmetic', 'Microneedling', 'الإبر الدقيقة', 'skincare', 45),
    ('non_surgical_cosmetic', 'PRP Face Injection', 'حقن البلازما للوجه', 'injectable', 45),
    ('non_surgical_cosmetic', 'HIFU Face Lifting', 'شد الوجه بالهايفو', 'energy_device', 60),
    ('non_surgical_cosmetic', 'Thread Lifting', 'شد الوجه بالخيوط', 'minimally_invasive', 45),
    ('non_surgical_cosmetic', 'CoolSculpting', 'تجميد الدهون', 'energy_device', 60),

    -- Dental
    ('dental', 'Dental Consultation', 'استشارة أسنان', 'consultation', 15),
    ('dental', 'Teeth Cleaning & Scaling', 'تنظيف الأسنان والتقشير', 'hygiene', 30),
    ('dental', 'Dental Filling', 'حشوة أسنان', 'restorative', 30),
    ('dental', 'Root Canal Treatment', 'علاج العصب', 'endodontic', 60),
    ('dental', 'Tooth Extraction', 'خلع سن', 'surgical', 30),
    ('dental', 'Crown Installation', 'تركيب تاج', 'prosthodontic', 45),
    ('dental', 'Dental Implant Consultation', 'استشارة زراعة أسنان', 'consultation', 20),
    ('dental', 'Orthodontic Adjustment', 'تعديل تقويم', 'orthodontic', 20),
    ('dental', 'Wisdom Tooth Extraction', 'خلع ضرس العقل', 'surgical', 45),
    ('dental', 'Teeth Whitening', 'تبييض الأسنان', 'cosmetic', 45),

    -- General Practice
    ('general_practice', 'General Medical Consultation', 'استشارة طبية عامة', 'consultation', 15),
    ('general_practice', 'Emergency Triage', 'فرز الطوارئ', 'emergency', 10),
    ('general_practice', 'Family Medicine Consultation', 'استشارة طب الأسرة', 'consultation', 20),
    ('general_practice', 'Chronic Disease Follow-up', 'متابعة الأمراض المزمنة', 'follow_up', 15),
    ('general_practice', 'Blood Pressure Monitoring', 'مراقبة ضغط الدم', 'diagnostic', 10),
    ('general_practice', 'Wound Dressing', 'تغيير ضماد', 'therapeutic', 15),
    ('general_practice', 'Vaccination', 'تطعيم', 'preventive', 10),
    ('general_practice', 'Nebulizer Session', 'جلسة بخاخ', 'therapeutic', 20),
    ('general_practice', 'Ear Irrigation', 'غسل الأذن', 'minor_procedure', 15),
    ('general_practice', 'General Physical Exam', 'الفحص الطبي العام', 'diagnostic', 30),

    -- Internal Medicine & General Surgery
    ('internal_medicine', 'Internal Medicine Consultation', 'استشارة باطنية', 'consultation', 20),
    ('internal_medicine', 'Gastroscopy', 'منظار علوي', 'endoscopic', 30),
    ('internal_medicine', 'Colonoscopy', 'منظار قولون', 'endoscopic', 45),
    ('internal_medicine', 'Abdominal Ultrasound', 'سونار بطن', 'diagnostic', 20),
    ('general_surgery', 'Pre-operative Assessment', 'تقييم ما قبل العملية', 'preoperative', 30),
    ('general_surgery', 'Appendectomy', 'استئصال الزائدة', 'surgical', 90),
    ('general_surgery', 'Hernia Repair', 'إصلاح الفتق', 'surgical', 60),
    ('general_surgery', 'Gallbladder Removal', 'استئصال المرارة', 'surgical', 90),
    ('general_surgery', 'Lipoma Removal', 'إزالة ورم دهني', 'minor_surgical', 30),
    ('internal_medicine', 'Diabetes Management', 'إدارة السكري', 'chronic_care', 20),

    -- Gynecology & Obstetrics
    ('gynecology_obstetrics', 'Gynecology Consultation', 'استشارة نسائية', 'consultation', 20),
    ('gynecology_obstetrics', 'Obstetric Follow-up', 'متابعة حمل', 'follow_up', 15),
    ('gynecology_obstetrics', 'Pap Smear', 'مسحة عنق الرحم', 'screening', 15),
    ('gynecology_obstetrics', 'Pelvic Ultrasound', 'سونار حوض', 'diagnostic', 20),
    ('gynecology_obstetrics', 'Prenatal Screening', 'فحص ما قبل الولادة', 'screening', 30),
    ('gynecology_obstetrics', 'IUD Insertion', 'تركيب لولب', 'minor_procedure', 20),
    ('gynecology_obstetrics', 'IUD Removal', 'إزالة لولب', 'minor_procedure', 15),
    ('gynecology_obstetrics', 'Normal Delivery', 'ولادة طبيعية', 'obstetric', 180),
    ('gynecology_obstetrics', 'Cesarean Section', 'ولادة قيصرية', 'surgical', 120),
    ('gynecology_obstetrics', 'Postpartum Check', 'فحص ما بعد الولادة', 'follow_up', 20),

    -- Physiotherapy
    ('physiotherapy', 'Physiotherapy Consultation', 'استشارة علاج طبيعي', 'consultation', 20),
    ('physiotherapy', 'Sports Injury Rehabilitation', 'إعادة تأهيل إصابات رياضية', 'rehabilitation', 45),
    ('physiotherapy', 'Post-operative Physiotherapy', 'علاج طبيعي ما بعد العملية', 'rehabilitation', 30),
    ('physiotherapy', 'Manual Therapy', 'العلاج اليدوي', 'manual', 30),
    ('physiotherapy', 'Electrotherapy Session', 'جلسة العلاج الكهربائي', 'electrotherapy', 20),
    ('physiotherapy', 'Ultrasound Therapy', 'العلاج بالموجات فوق الصوتية', 'electrotherapy', 15),
    ('physiotherapy', 'Shockwave Therapy', 'العلاج بالموجات الصادمة', 'advanced', 20),
    ('physiotherapy', 'Spinal Traction', 'شد العمود الفقري', 'mechanical', 30),
    ('physiotherapy', 'Dry Needling', 'الإبر الجافة', 'manual', 20),
    ('physiotherapy', 'Gait Training', 'تدريب المشي', 'rehabilitation', 30)
)

INSERT INTO medical_procedure_taxonomy (medical_specialty, procedure_name, procedure_name_ar, category, standard_duration_minutes)
SELECT s.medical_specialty, s.procedure_name, s.procedure_name_ar, s.category, s.standard_duration_minutes
FROM seed_data s
WHERE NOT EXISTS (
    SELECT 1 
    FROM medical_procedure_taxonomy t 
    WHERE t.medical_specialty = s.medical_specialty 
    AND t.procedure_name = s.procedure_name
);

COMMIT;
