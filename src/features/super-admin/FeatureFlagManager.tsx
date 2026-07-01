import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { Shield, ToggleLeft, ToggleRight, Info, Save, RefreshCw } from 'lucide-react';

interface FeatureFlag {
  id: string;
  tenant_id: string | null;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  allowed_tiers: string[] | null;
  config_json: Record<string, unknown> | null;
}


interface Tenant {
  id: string;
  clinic_name: string;
  subscription_tier: string;
}

const ALL_TIERS = ['trial', 'essential', 'professional', 'enterprise'];

const PRESET_FLAGS = [
  { key: 'AI_REPORTS', name: 'AI-Generated Clinical Reports', desc: 'Generate AI clinical reports from session notes' },
  { key: 'MULTI_BRANCH', name: 'Multi-Branch Operations', desc: 'Manage multiple clinic branches' },
  { key: 'WHATSAPP_AUTOMATION', name: 'WhatsApp Automated Messaging', desc: 'Automated WhatsApp reminders and follow-ups' },
  { key: 'GHOST_TRACKER', name: 'Ghost Evaluation Detection', desc: 'Detect unauthorized changes to closed sessions' },
  { key: 'LTV_SCORING', name: '60/40 LTV Weighted Scoring', desc: 'Apply historical weighting to patient scores' },
  { key: 'AUDIT_TRAIL', name: 'Full Audit Trail Access', desc: 'View complete audit history' },
  { key: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics Dashboard', desc: 'LTV prediction, DISC distribution, churn analysis' },
  { key: 'VOICE_TO_TEXT', name: 'Voice-to-Text Notes', desc: 'Record voice notes and convert to text' },
];

export default function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all feature flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('id, tenant_id, flag_key, flag_name, description, is_enabled, allowed_tiers, config_json')
        .order('flag_key');

      if (flagsError) throw flagsError;
      const flagRows: any[] = (flagsData || []) as any[];
      setFlags(flagRows.map(r => ({
        id: r.id,
        tenant_id: r.tenant_id ?? null,
        flag_key: r.flag_key,
        flag_name: r.flag_name,
        description: r.description ?? null,
        is_enabled: !!r.is_enabled,
        allowed_tiers: r.allowed_tiers ?? null,
        config_json: r.config_json ?? null,
      })));

      // Fetch tenants for dropdown
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('master_tenants')
        .select('id, clinic_name, subscription_tier')
        .is('deleted_at', null)
        .order('clinic_name');

      if (tenantsError) throw tenantsError;
      const tenantRows: any[] = (tenantsData || []) as any[];
      setTenants(tenantRows.map(t => ({ id: t.id, clinic_name: t.clinic_name, subscription_tier: t.subscription_tier })));

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagId: string, currentState: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !currentState, updated_at: new Date().toISOString() })
        .eq('id', flagId);

      if (error) throw error;

      setFlags(prev => prev.map(f => 
        f.id === flagId ? { ...f, is_enabled: !currentState } : f
      ));

      toast.success(`تم ${!currentState ? 'تفعيل' : 'تعطيل'} الميزة`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل في التحديث');
    } finally {
      setSaving(false);
    }
  };

  const updateTiers = async (flagId: string, newTiers: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ allowed_tiers: newTiers, updated_at: new Date().toISOString() })
        .eq('id', flagId);

      if (error) throw error;

      setFlags(prev => prev.map(f => 
        f.id === flagId ? { ...f, allowed_tiers: newTiers } : f
      ));

      toast.success('تم تحديث الصلاحيات');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل في التحديث');
    } finally {
      setSaving(false);
    }
  };

  const seedMissingFlags = async () => {
    setSaving(true);
    try {
      const tenantId = selectedTenant === 'global' ? null : selectedTenant;

      for (const preset of PRESET_FLAGS) {
        const exists = flags.some(f => 
          f.flag_key === preset.key && 
          (selectedTenant === 'global' ? f.tenant_id === null : f.tenant_id === tenantId)
        );

        if (!exists) {
          await supabase.from('feature_flags').insert({
            tenant_id: tenantId,
            flag_key: preset.key,
            flag_name: preset.name,
            description: preset.desc,
            is_enabled: false,
            allowed_tiers: ['professional', 'enterprise'],
            config_json: {}
          });
        }
      }

      toast.success('تم إضافة الميزات المفقودة');
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل في الإضافة');
    } finally {
      setSaving(false);
    }
  };

  // Filter flags by selected tenant
  const filteredFlags = flags.filter(f => {
    if (selectedTenant === 'global') return f.tenant_id === null;
    return f.tenant_id === selectedTenant;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-white/10 rounded w-1/3 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/10 rounded animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" /> إدارة الميزات
          </h1>
          <p className="text-white/50 text-sm mt-1">التحكم في الميزات حسب الاشتراك</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading}
            className="px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
          <button onClick={seedMissingFlags} disabled={saving}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" /> إضافة ميزات مفقودة
          </button>
        </div>
      </div>

      {/* Tenant Selector */}
      <div className="mb-6">
        <label className="block text-white/70 text-sm mb-2">اختر المستأجر</label>
        <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30">
          <option value="global" className="bg-[#1B2A4A]">🌍 إعدادات عامة (Global)</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id} className="bg-[#1B2A4A]">
              {t.clinic_name} ({t.subscription_tier})
            </option>
          ))}
        </select>
      </div>

      {/* Flags Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-right text-white/70 text-sm font-medium p-4">الميزة</th>
              <th className="text-right text-white/70 text-sm font-medium p-4">الحالة</th>
              <th className="text-right text-white/70 text-sm font-medium p-4">الخطط المسموحة</th>
              <th className="text-right text-white/70 text-sm font-medium p-4">وصف</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlags.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-white/50 py-12">
                  لا توجد ميزات محددة — اضغط "إضافة ميزات مفقودة"
                </td>
              </tr>
            ) : (
              filteredFlags.map(flag => (
                <tr key={flag.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="text-white font-medium">{flag.flag_name}</p>
                      <p className="text-white/40 text-xs">{flag.flag_key}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleFlag(flag.id, flag.is_enabled)} disabled={saving}
                      className="flex items-center gap-2 transition-colors">
                      {flag.is_enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-white/30" />
                      )}
                      <span className={`text-sm ${flag.is_enabled ? 'text-green-400' : 'text-white/50'}`}>
                        {flag.is_enabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {ALL_TIERS.map(tier => (
                        <button key={tier} onClick={() => {
                          const current = Array.isArray(flag.allowed_tiers) ? flag.allowed_tiers : [];
                          const newTiers = current.includes(tier)
                            ? current.filter(t => t !== tier)
                            : [...current, tier];
                          updateTiers(flag.id, newTiers);
                        }} disabled={saving}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            (Array.isArray(flag.allowed_tiers) && flag.allowed_tiers.includes(tier))
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-white/5 text-white/30 border border-white/10'
                          }`}>
                          {tier}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-white/30" />
                      <span className="text-white/50 text-sm">{flag.description || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Preset Reference */}
      <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <h3 className="text-white font-medium mb-2">الميزات المتاحة للإضافة:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESET_FLAGS.map(preset => (
            <div key={preset.key} className="text-xs text-white/50 bg-white/5 rounded px-2 py-1">
              {preset.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}