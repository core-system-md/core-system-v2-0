import { useEffect, useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuth } from '../../core/auth/useAuth';

interface QueueItem {
  id: string;
  patient_name: string;
  procedure_name: string;
  session_status: string;
  core_score_display: number;
  is_insured: boolean;
  waiting_time_minutes: number;
}

export function MyQueueView() {
  const { userId } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      const { data } = await supabase
        .from('clinic_visit_sessions')
        .select('id, session_status, core_score_display, is_insured, waiting_time_minutes, clinic_patients(full_name), clinic_procedures(name)')
        .eq('doctor_id', userId)
        .in('session_status', ['checked_in', 'in_consultation', 'waiting'])
        .order('actual_check_in', { ascending: true });
      setQueue(data?.map((item: any) => ({
        id: item.id,
        patient_name: item.clinic_patients?.full_name || 'Unknown',
        procedure_name: item.clinic_procedures?.name || 'General',
        session_status: item.session_status,
        core_score_display: item.core_score_display,
        is_insured: item.is_insured,
        waiting_time_minutes: item.waiting_time_minutes,
      })) || []);
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-white">My Queue ({queue.length})</h2>
      {queue.map((item) => (
        <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex justify-between">
            <div>
              <h3 className="font-semibold text-white">{item.patient_name}</h3>
              <p className="text-sm text-slate-400">{item.procedure_name}</p>
              {item.is_insured && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded mt-1 inline-block">Insured</span>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{item.core_score_display?.toFixed(1) || '0.0'}</div>
              <div className="text-xs text-slate-400">{item.waiting_time_minutes || 0} min wait</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
