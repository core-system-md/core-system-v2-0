import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

export function ParDecisionPanel({ sessionId }: { sessionId: string }) {
  const [decision, setDecision] = useState('no_decision');

  const submit = async () => {
    await supabase.from('clinic_visit_sessions').update({
      par_result: decision, updated_at: new Date().toISOString()
    }).eq('id', sessionId);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">PAR Decision</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {['full_acceptance', 'partial_acceptance', 'deferred', 'rejection'].map((d) => (
          <button key={d} onClick={() => setDecision(d)}
            className={`px-3 py-2 rounded text-sm ${decision === d ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            {d.replace('_', ' ')}
          </button>
        ))}
      </div>
      <button onClick={submit} className="w-full px-4 py-2 bg-slate-600 text-white rounded">Submit</button>
    </div>
  );
}
