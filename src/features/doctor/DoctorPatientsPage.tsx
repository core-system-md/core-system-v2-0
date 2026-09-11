import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Edit3, RefreshCw, Search, UserRound, X, Save } from 'lucide-react';

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  phone_primary: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  notes: string | null;
};

type PatientDraft = Pick<Patient, 'first_name' | 'last_name' | 'first_name_ar' | 'last_name_ar' | 'phone_primary' | 'date_of_birth' | 'gender' | 'notes'>;

export default function DoctorPatientsPage() {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [draft, setDraft] = useState<PatientDraft | null>(null);

  const loadPatients = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      setError('لم تتم تهيئة العيادة بعد');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('clinic_patients')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, phone_primary, date_of_birth, gender, notes')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (dbError) setError(dbError.message);
    else setPatients((data ?? []) as Patient[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { void loadPatients(); }, [loadPatients]);

  const openEdit = (patient: Patient) => {
    setEditing(patient);
    setDraft({
      first_name: patient.first_name,
      last_name: patient.last_name,
      first_name_ar: patient.first_name_ar,
      last_name_ar: patient.last_name_ar,
      phone_primary: patient.phone_primary,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      notes: patient.notes,
    });
  };

  const savePatient = async () => {
    if (!tenantId || !editing || !draft) return;
    if (!draft.first_name.trim() || !draft.last_name.trim() || !draft.phone_primary.trim()) {
      setError('الاسم الأول واسم العائلة ورقم الهاتف حقول مطلوبة');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase
      .from('clinic_patients')
      .update({ ...draft, first_name: draft.first_name.trim(), last_name: draft.last_name.trim(), phone_primary: draft.phone_primary.trim(), updated_at: new Date().toISOString() })
      .eq('id', editing.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);
    if (dbError) setError(dbError.message);
    else {
      setEditing(null);
      setDraft(null);
      await loadPatients();
    }
    setSaving(false);
  };

  const filtered = patients.filter((patient) => {
    const haystack = `${patient.first_name} ${patient.last_name} ${patient.first_name_ar ?? ''} ${patient.last_name_ar ?? ''} ${patient.phone_primary}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <PermissionGuard required="view_patients">
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6" dir="rtl">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">CORE SYSTEM • ملف المرضى</p>
              <h2 className="mt-1 text-2xl font-bold text-[#1B2A4A]">مرضى العيادة</h2>
              <p className="mt-1 text-sm text-slate-500">عرض بيانات المرضى وتحديث البيانات الأساسية ضمن صلاحيات الطبيب.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <UserRound className="h-5 w-5 text-[#1B2A4A]" />
              <span className="text-sm font-semibold text-slate-700">{patients.length} مريض</span>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm outline-none focus:border-[#1B2A4A] focus:ring-2 focus:ring-slate-100" />
            </label>
            <Button type="button" variant="outline" onClick={() => void loadPatients()} disabled={loading}>
              <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
            </Button>
          </div>
        </section>

        {error && (
          <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center gap-3 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</CardContent></Card>
        )}

        {loading ? (
          <div className="space-y-3"><div className="h-20 animate-pulse rounded-xl bg-slate-200" /><div className="h-20 animate-pulse rounded-xl bg-slate-200" /><div className="h-20 animate-pulse rounded-xl bg-slate-200" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-slate-500">لا توجد نتائج مطابقة.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((patient) => (
              <Card key={patient.id} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A] text-lg font-bold text-white">{(patient.first_name_ar || patient.first_name).charAt(0)}</div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">{patient.first_name_ar && patient.last_name_ar ? `${patient.first_name_ar} ${patient.last_name_ar}` : `${patient.first_name} ${patient.last_name}`}</h3>
                      <p className="mt-1 text-sm text-slate-500">{patient.phone_primary}</p>
                    </div>
                  </div>
                  <PermissionGuard required="edit_patients">
                    <Button type="button" variant="outline" onClick={() => openEdit(patient)} className="shrink-0"><Edit3 className="ml-2 h-4 w-4" />تعديل البيانات</Button>
                  </PermissionGuard>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {editing && draft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="تعديل بيانات المريض">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" dir="rtl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div><h3 className="text-lg font-bold text-[#1B2A4A]">تعديل بيانات المريض</h3><p className="text-xs text-slate-500">تعديل البيانات الأساسية فقط</p></div>
                <button type="button" onClick={() => { setEditing(null); setDraft(null); }} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {([['first_name','الاسم الأول'],['last_name','اسم العائلة'],['first_name_ar','الاسم الأول بالعربية'],['last_name_ar','اسم العائلة بالعربية'],['phone_primary','رقم الهاتف']] as const).map(([key,label]) => (
                  <label key={key} className="space-y-1 text-sm font-semibold text-slate-700">{label}<input value={draft[key] ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, [key]: event.target.value } : current)} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-[#1B2A4A]" /></label>
                ))}
                <label className="space-y-1 text-sm font-semibold text-slate-700">تاريخ الميلاد<input type="date" value={draft.date_of_birth ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, date_of_birth: event.target.value || null } : current)} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" /></label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">الجنس<select value={draft.gender ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, gender: (event.target.value || null) as Patient['gender'] } : current)} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"><option value="">غير محدد</option><option value="male">ذكر</option><option value="female">أنثى</option></select></label>
                <label className="space-y-1 text-sm font-semibold text-slate-700 sm:col-span-2">ملاحظات<textarea value={draft.notes ?? ''} onChange={(event) => setDraft((current) => current ? { ...current, notes: event.target.value || null } : current)} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" /></label>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
                <Button type="button" variant="outline" onClick={() => { setEditing(null); setDraft(null); }} disabled={saving}>إلغاء</Button>
                <Button type="button" onClick={() => void savePatient()} disabled={saving} className="bg-[#1B2A4A] hover:bg-[#223A63]"><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
