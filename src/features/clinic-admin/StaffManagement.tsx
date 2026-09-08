import { useEffect, useState } from 'react';
import { Pencil, Save, UserCog, X } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

type StaffRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

type StaffRow = {
  id: string;
  full_name: string | null;
  full_name_ar: string | null;
  email: string | null;
  employee_code: string | null;
  phone: string | null;
  specialization: string | null;
  role: StaffRole;
  is_active: boolean;
};

type StaffDraft = Pick<StaffRow, 'full_name' | 'full_name_ar' | 'phone' | 'specialization' | 'role' | 'is_active'>;

const roles: Array<{ value: StaffRole; label: string }> = [
  { value: 'clinic_admin', label: 'مدير العيادة' },
  { value: 'doctor', label: 'طبيب' },
  { value: 'receptionist', label: 'استقبال' },
  { value: 'super_admin', label: 'مدير النظام' },
];

export default function StaffManagement() {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadStaff() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('clinic_users')
      .select('id, full_name, full_name_ar, email, employee_code, phone, specialization, role, is_active')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setStaff([]);
    } else {
      setStaff((data ?? []) as StaffRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadStaff();
  }, [tenantId]);

  function startEdit(member: StaffRow) {
    setEditingId(member.id);
    setDraft({
      full_name: member.full_name,
      full_name_ar: member.full_name_ar,
      phone: member.phone,
      specialization: member.specialization,
      role: member.role,
      is_active: member.is_active,
    });
    setError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !tenantId || !draft) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from('clinic_users')
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq('id', editingId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice('تم حفظ بيانات الموظف.');
      cancelEdit();
      await loadStaff();
    }
    setSaving(false);
  }

  return (
    <PermissionGuard required="edit_staff">
      <section className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <UserCog className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">إدارة الطاقم</h2>
            <p className="text-sm text-slate-500">تعديل بيانات الموظفين وحالتهم ودورهم ضمن العيادة الحالية.</p>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">جاري تحميل الطاقم...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-right text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">الموظف</th>
                  <th className="px-4 py-3 font-semibold">الكود</th>
                  <th className="px-4 py-3 font-semibold">الهاتف</th>
                  <th className="px-4 py-3 font-semibold">التخصص</th>
                  <th className="px-4 py-3 font-semibold">الدور</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">لا يوجد موظفون نشطون ضمن هذا tenant.</td></tr>
                ) : staff.map((member) => {
                  const isEditing = editingId === member.id && draft !== null;
                  const displayName = member.full_name_ar || member.full_name || member.email || '—';
                  const roleLabel = roles.find((role) => role.value === member.role)?.label ?? member.role;

                  return (
                    <tr key={member.id} className="align-top">
                      {isEditing ? (
                        <>
                          <td className="space-y-2 px-4 py-3">
                            <input value={draft.full_name ?? ''} onChange={(event) => setDraft({ ...draft, full_name: event.target.value || null })} placeholder="الاسم" className="w-full rounded border border-slate-200 px-3 py-2" />
                            <input value={draft.full_name_ar ?? ''} onChange={(event) => setDraft({ ...draft, full_name_ar: event.target.value || null })} placeholder="الاسم بالعربية" className="w-full rounded border border-slate-200 px-3 py-2" />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{member.employee_code || '—'}</td>
                          <td className="px-4 py-3">
                            <input value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value || null })} placeholder="الهاتف" className="w-full rounded border border-slate-200 px-3 py-2" />
                          </td>
                          <td className="px-4 py-3">
                            <input value={draft.specialization ?? ''} onChange={(event) => setDraft({ ...draft, specialization: event.target.value || null })} placeholder="التخصص" className="w-full rounded border border-slate-200 px-3 py-2" />
                          </td>
                          <td className="px-4 py-3">
                            <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as StaffRole })} className="rounded border border-slate-200 px-3 py-2">
                              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
                              <span>{draft.is_active ? 'نشط' : 'معطل'}</span>
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button type="button" disabled={saving} onClick={() => void saveEdit()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-50"><Save className="h-4 w-4" />حفظ</button>
                              <button type="button" disabled={saving} onClick={cancelEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-700"><X className="h-4 w-4" />إلغاء</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-900">{displayName}</td>
                          <td className="px-4 py-3 text-slate-600">{member.employee_code || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{member.phone || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{member.specialization || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{roleLabel}</td>
                          <td className="px-4 py-3 text-slate-600">{member.is_active ? 'نشط' : 'معطل'}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => startEdit(member)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                              <Pencil className="h-4 w-4" />تعديل
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {currentUserId && <p className="text-xs text-slate-400">تغييرات الدور على حساب مدير العيادة نفسه مرفوضة من قاعدة البيانات كطبقة أمان إضافية.</p>}
      </section>
    </PermissionGuard>
  );
}
