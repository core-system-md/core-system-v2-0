import { useState } from "react";

interface Page5ConsentSignProps {
  onData: (data: { consentGiven: boolean; signature: string; date: string }) => void;
  onSubmit: () => void;
}

export function Page5ConsentSign({ onData, onSubmit }: Page5ConsentSignProps) {
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = () => {
    if (!consent || !signature.trim() || !agreed) return;
    onData({ consentGiven: consent, signature, date: new Date().toISOString() });
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-2">Consent & Signature</h2>
      <p className="text-slate-400 text-sm mb-6">Please review and confirm</p>
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
        <p className="text-sm text-slate-300">I consent to the collection and use of my health information for treatment purposes.</p>
        <p className="text-sm text-slate-300">I understand that my data will be stored securely and shared only with authorized medical staff.</p>
        <p className="text-sm text-slate-300">I acknowledge that I have read and understood the privacy policy.</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setConsent(!consent)} className={`relative w-12 h-6 rounded-full transition-colors ${consent ? "bg-emerald-500" : "bg-slate-700"}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${consent ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
        <span className="text-sm text-slate-300">I give my consent</span>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Digital Signature (type your full name)</label>
        <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors font-serif italic" placeholder="Type your name..." />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setAgreed(!agreed)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${agreed ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
          {agreed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </button>
        <span className="text-sm text-slate-300">I confirm all information is accurate</span>
      </div>
      <button onClick={handleSubmit} disabled={!consent || !signature.trim() || !agreed} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Complete Survey</button>
    </div>
  );
}
