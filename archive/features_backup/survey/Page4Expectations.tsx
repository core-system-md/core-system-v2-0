import { useState } from "react";

interface Page4ExpectationsProps {
  onData: (data: { expectedOutcome: string; preferredCommunication: string; urgency: string; previousExperience: string }) => void;
  initialData?: { expectedOutcome: string; preferredCommunication: string; urgency: string; previousExperience: string };
}

export function Page4Expectations({ onData, initialData }: Page4ExpectationsProps) {
  const [form, setForm] = useState(initialData || { expectedOutcome: "", preferredCommunication: "email", urgency: "routine", previousExperience: "" });

  const update = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onData(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2">Expectations</h2>
      <p className="text-slate-400 text-sm mb-6">What do you expect from this visit?</p>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Expected Outcome</label>
        <textarea value={form.expectedOutcome} onChange={(e) => update("expectedOutcome", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none min-h-[100px]" placeholder="What would make this visit successful for you?" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Preferred Communication</label>
          <select value={form.preferredCommunication} onChange={(e) => update("preferredCommunication", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="phone">Phone Call</option>
            <option value="app">In-App</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Urgency</label>
          <select value={form.urgency} onChange={(e) => update("urgency", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="routine">Routine</option>
            <option value="soon">Within 2 weeks</option>
            <option value="urgent">Within 48 hours</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Previous Experience</label>
        <textarea value={form.previousExperience} onChange={(e) => update("previousExperience", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none min-h-[80px]" placeholder="Any previous treatments or visits?" />
      </div>
    </div>
  );
}
