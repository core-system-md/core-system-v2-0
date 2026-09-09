import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TenantDetailPanel, { type Tenant } from './TenantDetailPanel';
import { supabase } from '@/infrastructure/supabase/client';

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!tenantId) { setError('معرّف العيادة غير صالح.'); setLoading(false); return; }
      setLoading(true); setError(null);
      const { data, error: queryError } = await supabase.from('master_tenants').select('id, name, slug, clinic_name, clinic_name_ar, license_key, subscription_tier, subscription_start, subscription_end, trial_started_at, is_active, max_devices, max_users, max_patients, max_procedures_per_month, primary_phone, whatsapp_number, address, country_code, timezone, currency, currency_subunit, logo_url, primary_color, settings, created_at, updated_at').eq('id', tenantId).is('deleted_at', null).single();
      if (!active) return;
      if (queryError) setError(queryError.message); else setTenant(data as Tenant);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [tenantId]);

  if (loading) return <div className="p-6 text-sm text-slate-500" dir="rtl">جاري تحميل تفاصيل العيادة...</div>;
  if (error || !tenant) return <div className="p-6" dir="rtl"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? 'لم يتم العثور على العيادة.'}</div><button onClick={() => navigate('/super-admin')} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">العودة</button></div>;

  return <TenantDetailPanel tenant={tenant} isOpen onClose={() => navigate('/super-admin')} />;
}
