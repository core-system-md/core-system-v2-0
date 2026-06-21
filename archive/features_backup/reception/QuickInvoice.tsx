import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

export function QuickInvoice({ sessionId, patientId }: { sessionId: string; patientId: string }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const collect = async () => {
    const subunits = Math.round(parseFloat(amount) * 1000);
    await supabase.rpc('create_invoice', {
      p_session_id: sessionId, p_patient_id: patientId,
      p_subtotal_subunits: subunits, p_payment_method: method
    });
    setAmount('');
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-white mb-3">Quick Invoice</h3>
      <div className="flex gap-2 mb-3">
        <input type="number" placeholder="JOD" className="flex-1 bg-slate-900 text-white rounded p-2 border border-slate-600"
          value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" />
        <select className="bg-slate-900 text-white rounded p-2 border border-slate-600" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="card_visa">Visa</option>
          <option value="card_mastercard">MC</option>
        </select>
      </div>
      <button onClick={collect} disabled={!amount} className="w-full px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">Collect</button>
    </div>
  );
}
