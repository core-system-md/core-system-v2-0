import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, User, Target, MessageSquare } from 'lucide-react';

interface SandlerScriptPanelProps {
  patientName?: string;
  discProfile?: string | null;
  patientClass?: string | null;
  parResult?: string | null;
  coreScore?: number | null;
}

interface ScriptItem {
  id: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const DEFAULT_SCRIPTS: ScriptItem[] = [
  {
    id: 'opening',
    title: 'فتح الجلسة',
    content: 'مرحباً [الاسم]، اليوم سنقوم بمراجعة وضعك الصحي بشكل شامل. هل هناك أي شيء محدد تود مناقشته في البداية؟',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'exploration',
    title: 'استكشاف الاحتياجات',
    content: 'أخبرني أكثر عن السبب الرئيسي للزيارة. منذ متى وأنت تعاني من هذا؟ هل جربت أي علاجات سابقة؟',
    icon: <Target className="h-4 w-4" />,
  },
  {
    id: 'objection',
    title: 'التعامل مع الاعتراضات',
    content: 'أفهم تماماً مخاوفك. دعني أوضح لك الخيارات المتاحة والنتائج المتوقعة لكل خيار، حتى تتمكن من اتخاذ قرار مبني على معلومات دقيقة.',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'closing',
    title: 'إغلاق الجلسة',
    content: 'شكراً لك [الاسم]. الخطة العلاجية واضحة، والموعد القادم محدد. هل لديك أي أسئلة إضافية قبل أن ننهي الجلسة؟',
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

const DISC_LABELS: Record<string, string> = {
  driver: 'قيادي',
  influencer: 'مؤثر',
  analytical: 'تحليلي',
  emotional: 'عاطفي',
};

const CLASS_LABELS: Record<string, string> = {
  hot_lead: 'فرصة ساخنة',
  qualified: 'مؤهل',
  high_priority: 'أولوية عالية',
  medium_priority: 'أولوية متوسطة',
  low_priority: 'أولوية منخفضة',
};

const PAR_LABELS: Record<string, string> = {
  full_acceptance: 'قبول كامل',
  partial_acceptance: 'قبول جزئي',
  deferred: 'مؤجل',
  rejection: 'رفض',
  no_decision: 'لا قرار',
};

export default function SandlerScriptPanel({
  patientName,
  discProfile,
  patientClass,
  parResult,
  coreScore,
}: SandlerScriptPanelProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['opening']));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scripts = DEFAULT_SCRIPTS.map((s) => ({
    ...s,
    content: patientName ? s.content.replace(/\[الاسم\]/g, patientName) : s.content,
  }));

  return (
    <div className="bg-white border border-amber-200/60 rounded-xl shadow-sm overflow-hidden" dir="rtl">
      <div className="bg-gradient-to-l from-amber-50 to-white border-b border-amber-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-amber-900">النصوص التكتيكية</h3>
        </div>
        <p className="text-xs text-amber-700/70 mt-0.5">Sandler Scripts — سياق الجلسة الحية</p>
      </div>

      <div className="px-4 py-3 border-b border-slate-100 space-y-2">
        {discProfile && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">ملف الشخصية:</span>
            <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs px-2 py-0.5 font-medium">
              {DISC_LABELS[discProfile] || discProfile}
            </span>
          </div>
        )}
        {patientClass && (
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">تصنيف المريض:</span>
            <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium border ${
              patientClass === 'hot_lead' ? 'bg-red-50 text-red-700 border-red-200' :
              patientClass === 'qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              patientClass === 'high_priority' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {CLASS_LABELS[patientClass] || patientClass}
            </span>
          </div>
        )}
        {parResult && (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">قرار القبول:</span>
            <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs px-2 py-0.5 font-medium">
              {PAR_LABELS[parResult] || parResult}
            </span>
          </div>
        )}
        {coreScore !== null && coreScore !== undefined && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Core Score:</span>
            <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium border ${
              coreScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              coreScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              {coreScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {scripts.map((script) => {
          const isOpen = openItems.has(script.id);
          return (
            <div key={script.id} className="bg-white">
              <button
                onClick={() => toggleItem(script.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-right"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-600">{script.icon}</span>
                  <span className="text-sm font-semibold text-slate-800">{script.title}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{script.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          المحتوى ثابت — قواعد اختيار النصوص حسب DISC/الفئة/القرار غير مثبتة في الوثائق الرسمية.
        </p>
      </div>
    </div>
  );
}
