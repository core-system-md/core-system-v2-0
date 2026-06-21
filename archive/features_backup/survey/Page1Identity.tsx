import { useState } from "react";

interface Page1IdentityProps {
  onData: (data: { fullName: string; phone: string; email: string; dob: string; gender: string }) => void;
  initialData?: { fullName: string; phone: string; email: string; dob: string; gender: string };
}

export function Page1Identity({ onData, initialData }: Page1IdentityProps) {
  const [form, setForm] = useState(initialData || { fullName: "", phone: "", email: "", dob: "", gender: "" });

  const update = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onData(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2">Identity</h2>
      <p className="text-slate-400 text-sm mb-6">Please verify your personal information</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Full Name</label>
          <input type="text" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="John Doe" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="+1 234 567 890" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="john@example.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Gender</label>
            <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
