import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { Activity, Brain, Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface DecisionCardProps {
  sessionId: string;
}

interface SessionData {
  id: string;
  patient_id: string;
  core_score_display: number | null;
  patient_class: string | null;
  patient: {
    full_name: string;
    phone_primary: string;
    date_of_birth: string | null;
  } | null;
}

type DiscType = 'driver' | 'influencer' | 'analytical' | 'emotional';

const discConfig: Record<DiscType, { label: string; color: string; icon: typeof Activity; desc: string }> = {
  driver: { label: 'قائد', color: 'text-red-600', icon: Target, desc: 'يحب القرارات السريعة والنتائج' },
  influencer: { label: 'مؤثر', color: 'text-yellow-600', icon: TrendingUp, desc: 'اجتماعي، يحب التفاعل والإقناع' },
  analytical: { label: 'تحليلي', color: 'text-blue-600', icon: Brain, desc: 'يتأنى، يحب التفاصيل والأرقام' },
  emotional: { label: 'عاطفي', color: 'text-green-600', icon: Activity, desc: 'يتعاطف، يحب الأمان والعلاقات' },
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`px-2 py-1 rounded text-white text-xs font-medium ${className}`}>{children}</span>;
}

function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function DecisionCard({ sessionId }: DecisionCardProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select('id, patient_id, core_score_display, patient_class, patient:clinic_patients(full_name, phone_primary, date_of_birth)')
        .eq('id', sessionId)
        .eq('is_abandoned', false)
        .single();
      if (error) {
        setError(error.message);
      } else if (data) {
        const rawPatient = Array.isArray(data.patient) ? data.patient[0] : data.patient;
        const patient = rawPatient === undefined ? null : rawPatient;
        setSession({ ...data, patient });
      }
      setLoading(false);
    };
    fetch();
  }, [sessionId]);

  const getScoreRecommendation = (score: number | null) => {
    if (score === null) return { label: 'غير محسوب', color: 'bg-gray-500', action: '—' };
    if (score >= 90) return { label: 'hot_lead', color: 'bg-red-600', action: 'اعرض الخطة الكاملة فوراً' };
    if (score >= 80) return { label: 'مؤهل', color: 'bg-orange-500', action: 'اعرض التفاصيل والخيارات' };
    if (score >= 60) return { label: 'مرتفع', color: 'bg-yellow-600', action: 'يحتاج إقناع — اعرض القيمة' };
    if (score >= 40) return { label: 'متوسط', color: 'bg-blue-500', action: 'لا تضغط — ابدأ بالتعريف' };
    return { label: 'منخفض', color: 'bg-gray-600', action: 'ابدأ بأساسيات وبناء الثقة' };
  };

  const getDiscType = (profile: string | null): DiscType => {
    if (!profile) return 'emotional';
    const p = profile.toLowerCase();
    if (p.includes('driver') || p.includes('d')) return 'driver';
    if (p.includes('influencer') || p.includes('i')) return 'influencer';
    if (p.includes('analytical') || p.includes('c')) return 'analytical';
    return 'emotional';
  };

  if (loading) return <div className="p-6 text-center text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="p-6 flex items-center gap-2 text-red-600"><AlertTriangle size={20} /><span>خطأ: {error}</span></div>;
  if (!session) return <div className="p-6 text-center text-gray-500">لا توجد بيانات</div>;

  const score = session.core_score_display;
  const rec = getScoreRecommendation(score);
  const discType = getDiscType(session.patient_class);
  const disc = discConfig[discType];
  const DiscIcon = disc.icon;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Core Score</h2>
              <p className="text-sm text-gray-500">{session.patient?.full_name || 'مريض غير معروف'}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-primary">{score !== null ? score.toFixed(1) : '—'}</div>
              <div className="text-xs text-gray-400">من 100</div>
            </div>
          </div>
          <Progress value={score !== null ? score : 0} />
          <div className="flex items-center justify-between mt-4">
            <Badge className={rec.color}>{rec.label}</Badge>
            <span className="text-sm text-gray-600">{rec.action}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
              <DiscIcon className={disc.color} size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">DISC Profile</h3>
              <p className={`text-sm font-medium ${disc.color}`}>{disc.label}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{disc.desc}</p>
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
            <strong>نصيحة التواصل:</strong>{' '}
            {discType === 'driver' && 'كن مباشراً، اعرض النتائج والفوائد السريعة'}
            {discType === 'influencer' && 'كن متحمساً، اعرض قصص النجاح والتأثير الاجتماعي'}
            {discType === 'analytical' && 'قدم بيانات وأرقام، امنحه وقت للتفكير'}
            {discType === 'emotional' && 'كن دافئاً، اعرض الأمان والدعم المستمر'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition">
              كتابة ملاحظات
            </button>
            <button className="p-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              إصدار فاتورة
            </button>
            <button className="p-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              طلب أشعة
            </button>
            <button className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition">
              إغلاق الجلسة
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}