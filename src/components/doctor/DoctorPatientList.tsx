import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { AlertCircle, Clock, User } from 'lucide-react';

interface PatientSession {
  id: string;
  patient_id: string;
  session_status: string;
  core_score_display: number | null;
  scheduled_start: string;
  patient: { full_name: string; phone_primary: string } | null;
}

function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} onClick={onClick}>{children}</div>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-1 rounded text-white text-xs font-medium ${className}`}>{children}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded ${className}`} />;
}

export function DoctorPatientList() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FIX: Read tenant_id from core_pin_auth (set by AuthProvider.tsx during login)
    const pinData = localStorage.getItem("core_pin_auth");
    const tid = pinData ? JSON.parse(pinData).tenant_id : null;
    setTenantId(tid || null);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select('id, patient_id, session_status, core_score_display, scheduled_start, patient:clinic_patients(full_name, phone_primary)')
        .eq('tenant_id', tenantId)
        .in('session_status', ['waiting', 'scheduled', 'in_progress'])
        .gte('scheduled_start', `${today}T00:00:00`)
        .lte('scheduled_start', `${today}T23:59:59`)
        .eq('is_abandoned', false)
        .order('scheduled_start', { ascending: true });
      if (error) setError(error.message);
      else setSessions((data || []).map((s: any) => ({ ...s, patient: Array.isArray(s.patient) ? s.patient[0] : s.patient })));
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const statusColor = (s: string) => ({ waiting: 'bg-amber-500', scheduled: 'bg-blue-500', in_progress: 'bg-green-500' }[s] || 'bg-gray-500');
  const statusLabel = (s: string) => ({ waiting: 'في الانتظار', scheduled: 'مجدول', in_progress: 'جارية' }[s] || s);
  const scoreRec = (score: number | null) => {
    if (score === null) return { label: 'غير محسوب', color: 'text-gray-500' };
    if (score >= 90) return { label: 'hot_lead', color: 'text-red-600' };
    if (score >= 80) return { label: 'مؤهل', color: 'text-orange-500' };
    if (score >= 60) return { label: 'مرتفع', color: 'text-yellow-600' };
    if (score >= 40) return { label: 'متوسط', color: 'text-blue-500' };
    return { label: 'منخفض', color: 'text-gray-600' };
  };

  if (!tenantId) return <div className="p-6 text-center text-gray-500">جاري التحقق من الجلسة...</div>;
  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (error) return <div className="p-6 flex items-center gap-2 text-red-600"><AlertCircle size={20} /><span>خطأ: {error}</span></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">مرضى اليوم</h1>
      {sessions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500"><Clock className="mx-auto mb-2" size={32} /><p>لا يوجد مرضى مجدولون</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(s => {
            const rec = scoreRec(s.core_score_display);
            return (
              <Card key={s.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/doctor/session/${s.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="text-primary" size={24} /></div>
                      <div>
                        <h3 className="font-semibold text-lg">{s.patient?.full_name || 'مريض غير معروف'}</h3>
                        <p className="text-sm text-gray-500">{s.patient?.phone_primary || '—'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusColor(s.session_status)}>{statusLabel(s.session_status)}</Badge>
                          <span className="text-xs text-gray-400">{new Date(s.scheduled_start).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      {s.core_score_display !== null && <div className="text-right"><div className="text-3xl font-bold text-primary">{s.core_score_display.toFixed(1)}</div><div className="text-xs text-gray-400">Core Score</div></div>}
                      <div className={`text-sm mt-1 ${rec.color}`}>{rec.label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
