import { useState } from "react";

interface Page3BehavioralProfileProps {
  onData: (data: { stressLevel: number; sleepHours: number; exerciseFrequency: string; dietQuality: string; smoking: boolean }) => void;
  initialData?: { stressLevel: number; sleepHours: number; exerciseFrequency: string; dietQuality: string; smoking: boolean };
}

export function Page3BehavioralProfile({ onData, initialData }: Page3BehavioralProfileProps) {
  const [form, setForm] = useState(initialData || { stressLevel: 5, sleepHours: 7, exerciseFrequency: "moderate", dietQuality: "average", smoking: false });

  const update = (field: string, value: string | number | boolean) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onData(next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2">Behavioral Profile</h2>
      <p className="text-slate-400 text-sm mb-6">Help us understand your lifestyle</p>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Stress Level (1-10)</label>
        <input type="range" min="1" max="10" value={form.stressLevel} onChange={(e) => update("stressLevel", parseInt(e.target.value))} className="w-full accent-emerald-500" />
        <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Low</span><span className="text-emerald-400 font-medium">{form.stressLevel}</span><span>High</span></div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Sleep Hours / Night</label>
        <input type="range" min="0" max="12" step="0.5" value={form.sleepHours} onChange={(e) => update("sleepHours", parseFloat(e.target.value))} className="w-full accent-emerald-500" />
        <div className="text-center text-sm text-emerald-400 mt-1">{form.sleepHours} hours</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Exercise</label>
          <select value={form.exerciseFrequency} onChange={(e) => update("exerciseFrequency", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="none">None</option>
            <option value="light">1-2x / week</option>
            <option value="moderate">3-4x / week</option>
            <option value="active">5+ / week</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Diet Quality</label>
          <select value={form.dietQuality} onChange={(e) => update("dietQuality", e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="poor">Poor</option>
            <option value="average">Average</option>
            <option value="good">Good</option>
            <option value="excellent">Excellent</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => update("smoking", !form.smoking)} className={`relative w-12 h-6 rounded-full transition-colors ${form.smoking ? "bg-red-500" : "bg-slate-700"}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.smoking ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
        <span className="text-sm text-slate-300">I smoke tobacco</span>
      </div>
    </div>
  );
}
