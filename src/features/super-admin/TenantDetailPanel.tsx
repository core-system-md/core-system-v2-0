// ============================================================
// CORE SYSTEM v2.1 — TenantDetailPanel
// FIXED: 2026-07-22 — P22 Phase 2C: Read-only tenant profile modal
// Constitution §3: Features fetch their own data. NO props drilling.
// ============================================================

import { useState } from 'react';
import {
  Building2, X, Phone, MapPin, Globe, CreditCard, Calendar,
  Users, Smartphone, Palette, Settings, Clock, Shield, FileText, Tag,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// LOCAL TYPE — Shared with TenantRegistry via export
// All 28 fields from master_tenants schema
// ────────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  clinic_name: string | null;
  clinic_name_ar: string | null;
  license_key: string | null;
  subscription_tier: string;
  subscription_start: string | null;
  subscription_end: string | null;
  trial_started_at: string | null;
  is_active: boolean;
  max_devices: number | null;
  max_users: number;
  max_patients: number;
  max_procedures_per_month: number;
  primary_phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  country_code: string | null;
  timezone: string | null;
  currency: string | null;
  currency_subunit: number | null;
  logo_url: string | null;
  primary_color: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TenantDetailPanelProps {
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  trial: 'تجريبي', essential: 'أساسي', professional: 'احترافي',
  enterprise: 'مؤسسي', suspended: 'موقوف',
};

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-800 border-gray-300',
  essential: 'bg-blue-100 text-blue-800 border-blue-300',
  professional: 'bg-purple-100 text-purple-800 border-purple-300',
  enterprise: 'bg-amber-100 text-amber-800 border-amber-300',
  suspended: 'bg-red-100 text-red-800 border-red-300',
};

export default function TenantDetailPanel({ tenant, isOpen, onClose }: TenantDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'limits' | 'branding' | 'system'>('overview');
  if (!isOpen || !tenant) return null;

  const tabs = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: Building2 },
    { id: 'subscription' as const, label: 'الاشتراك', icon: CreditCard },
    { id: 'limits' as const, label: 'الحدود', icon: Shield },
    { id: 'branding' as const, label: 'التصميم', icon: Palette },
    { id: 'system' as const, label: 'النظام', icon: Settings },
  ];

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderSettings(settings: Record<string, unknown>): React.ReactNode {
    if (!settings || typeof settings !== 'object') return <span className="text-gray-400">—</span>;
    const entries = Object.entries(settings);
    if (entries.length === 0) return <span className="text-gray-400">—</span>;
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-xs font-medium text-gray-600 min-w-[120px]">{key}:</span>
            <span className="text-sm text-gray-800 break-all">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1B2A4A]">{tenant.clinic_name_ar || tenant.clinic_name || '—'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIER_COLORS[tenant.subscription_tier] || TIER_COLORS.trial}`}>
                  {TIER_LABELS[tenant.subscription_tier] || tenant.subscription_tier}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${tenant.is_active ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                  {tenant.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 bg-white">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#1B2A4A] text-[#1B2A4A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon={Tag} label="الاسم الفني" value={tenant.name} />
                <InfoCard icon={FileText} label="المعرف (Slug)" value={tenant.slug} />
                <InfoCard icon={Building2} label="اسم العيادة (EN)" value={tenant.clinic_name || '—'} />
                <InfoCard icon={Phone} label="الهاتف الرئيسي" value={tenant.primary_phone || '—'} />
                <InfoCard icon={Smartphone} label="واتساب" value={tenant.whatsapp_number || '—'} />
                <InfoCard icon={MapPin} label="العنوان" value={tenant.address || '—'} />
                <InfoCard icon={Globe} label="رمز الدولة" value={tenant.country_code || '—'} />
                <InfoCard icon={Clock} label="المنطقة الزمنية" value={tenant.timezone || '—'} />
              </div>
            </div>
          )}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon={CreditCard} label="مفتاح الترخيص" value={tenant.license_key || '—'} monospace />
                <InfoCard icon={Tag} label="الخطة" value={TIER_LABELS[tenant.subscription_tier] || tenant.subscription_tier} />
                <InfoCard icon={Calendar} label="بداية الاشتراك" value={formatDate(tenant.subscription_start)} />
                <InfoCard icon={Calendar} label="نهاية الاشتراك" value={formatDate(tenant.subscription_end)} />
                <InfoCard icon={Calendar} label="بداية التجربة" value={formatDate(tenant.trial_started_at)} />
                <InfoCard icon={CreditCard} label="العملة" value={tenant.currency ? `${tenant.currency} (${tenant.currency_subunit} وحدة فرعية)` : '—'} />
              </div>
            </div>
          )}
          {activeTab === 'limits' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LimitCard icon={Smartphone} label="الأجهزة القصوى" value={tenant.max_devices ?? '—'} />
                <LimitCard icon={Users} label="المستخدمون القصوى" value={tenant.max_users} />
                <LimitCard label="المرضى القصوى" value={tenant.max_patients} />
                <LimitCard label="الإجراءات/الشهر" value={tenant.max_procedures_per_month} />
              </div>
            </div>
          )}
          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon={Palette} label="اللون الرئيسي" value={tenant.primary_color || '—'} colorSwatch={tenant.primary_color} />
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">الشعار</label>
                  {tenant.logo_url ? (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <img src={tenant.logo_url} alt="شعار العيادة" className="max-h-24 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ) : (
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-400 text-sm text-center">لا يوجد شعار</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <InfoCard icon={Clock} label="تاريخ الإنشاء" value={formatDateTime(tenant.created_at)} />
                <InfoCard icon={Clock} label="آخر تحديث" value={formatDateTime(tenant.updated_at)} />
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">الإعدادات (JSON)</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">{renderSettings(tenant.settings)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-slate-50 flex justify-between items-center">
          <span className="text-xs text-gray-400">معرّف العيادة: {tenant.id}</span>
          <button onClick={onClose} className="px-4 py-2 bg-[#1B2A4A] text-white text-sm font-medium rounded-lg hover:bg-[#2a3d66] transition-colors">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, monospace = false, colorSwatch }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | number | null; monospace?: boolean; colorSwatch?: string | null }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {colorSwatch && <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: colorSwatch }} />}
        <span className={`text-sm text-gray-800 ${monospace ? 'font-mono' : ''}`}>{value ?? '—'}</span>
      </div>
    </div>
  );
}

function LimitCard({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
      {Icon && <Icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />}
      <div className="text-2xl font-bold text-[#1B2A4A]">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
