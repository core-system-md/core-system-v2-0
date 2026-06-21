import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

export function NewInquiryForm() {
  const [form, setForm] = useState({ name: '', phone: '', reason: '', type: 'walk_in' as const });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: tenant } = await supabase.rpc('get_current_tenant_id');
    await supabase.from('clinic_inquiries').insert({
      tenant_id: tenant, inquiry_type: form.type, temp_patient_name: form.name,
      temp_phone: form.phone, inquiry_reason: form.reason, status: 'pending'
    });
    setForm({ name: '', phone: '', reason: '', type: 'walk_in' });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
      <h3 className="text-sm font-semibold text-white">New Walk-in</h3>
      <input type="text" placeholder="Name" className="w-full bg-slate-900 text-white rounded p-2 border border-slate-600"
        value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
      <input type="tel" placeholder="Phone" className="w-full bg-slate-900 text-white rounded p-2 border border-slate-600"
        value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required />
      <textarea placeholder="Reason" className="w-full bg-slate-900 text-white rounded p-2 border border-slate-600"
        value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} />
      <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">
        {submitting ? 'Saving...' : 'Register'}
      </button>
    </form>
  );
}
