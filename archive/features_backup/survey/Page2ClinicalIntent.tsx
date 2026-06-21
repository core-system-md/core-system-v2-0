import { useState } from "react";

interface Page2ClinicalIntentProps {
  onData: (data: { chiefComplaint: string; symptoms: string[]; duration: string; severity: number }) => void;
  initialData?: { chiefComplaint: string; symptoms: string[]; duration: string; severity: number };
}

const symptomOptions = ["Pain", "Fever", "Fatigue", "Nausea", "Dizziness", "Shortness of breath", "Swelling", "Rash"];

export function Page2ClinicalIntent({ onData, initialData }: Page2ClinicalIntentProps) {
  const [form, setForm] = useState(initialData || { chiefComplaint: "", symptoms: [] as string[], duration: "", severity: 5 });

  const toggleSymptom = (symptom: string) => {
    const next = { ...form, symptoms: form.symptoms.includes(symptom) ? form.symptoms.filter((s) => s !== symptom) : [...form.symptoms, symptom] };
    setForm(next);
    onData(next);
  };

  const update = (field: string, value: string | number) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onData(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2">Clinical Intent</h2>
      <p className="text-slate-400 text-sm mb-6">Tell us about your symptoms</p>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Chief Complaint</label>
        <input type="text" value={form.chiefComplaint} onChange={(e) => update("chiefComplaint", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="What brings you in today?" />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-2">Symptoms</label>
        <div className="flex flex-wrap gap-2">
          {symptomOptions.map((symptom) => (
            <button key={symptom} onClick={() => toggleSymptom(symptom)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${form.symptoms.includes(symptom) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"}`}>{symptom}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Duration</label>
          <input type="text" value={form.duration} onChange={(e) => update("duration", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="e.g. 3 days" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Severity (1-10)</label>
          <input type="range" min="1" max="10" value={form.severity} onChange={(e) => update("severity", parseInt(e.target.value))} className="w-full accent-emerald-500 mt-3" />
          <div className="text-center text-sm text-emerald-400 mt-1">{form.severity}/10</div>
        </div>
      </div>
    </div>
  );
}
