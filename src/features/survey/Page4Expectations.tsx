import { useState } from 'react';
import { AlertCircle, ListChecks, MessageCircle, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Page4Data {
  top_priorities: string[];
  main_concern: string;
  openness_to_proceed: number;
}

interface Page4ExpectationsProps {
  sessionId: string;
  initialData?: Partial<Page4Data> | undefined;
  onNext: (data: Page4Data) => void;
  onBack: () => void;
}

const PRIORITIES = ['النتيجة العلاجية', 'الأمان والثقة', 'الراحة', 'التكلفة', 'سرعة الإنجاز', 'المتابعة'];
const OPENNESS = [
  { value: 1, label: 'غير مستعد حالياً' },
  { value: 2, label: 'قد أتابع بعد التوضيح' },
  { value: 3, label: 'مستعد للمتابعة' },
];

export default function Page4Expectations({ sessionId, initialData, onNext, onBack }: Page4ExpectationsProps) {
  const [data, setData] = useState<Page4Data>({
    top_priorities: initialData?.top_priorities ?? [],
    main_concern: initialData?.main_concern ?? '',
    openness_to_proceed: initialData?.openness_to_proceed ?? 2,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePriority = (priority: string) => {
    setData((prev) => ({
      ...prev,
      top_priorities: prev.top_priorities.includes(priority)
        ? prev.top_priorities.filter((item) => item !== priority)
        : prev.top_priorities.length < 2 ? [...prev.top_priorities, priority] : prev.top_priorities,
    }));
    setErrors((prev) => ({ ...prev, top_priorities: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (data.top_priorities.length === 0) next.top_priorities = 'اختر أولوية واحدة على الأقل';
    if (!data.main_concern.trim()) next.main_concern = 'يرجى ذكر أهم ما يقلقك';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" dir="rtl">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><ListChecks className="h-5 w-5 text-emerald-700" /></div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">الصفحة 4 من 5 — التوقعات والمخاوف</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">رقم الجلسة: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><ListChecks className="h-4 w-4 text-slate-400" /> اختر أهم أولويتين لديك كحد أقصى</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIORITIES.map((priority) => {
                const selected = data.top_priorities.includes(priority);
                return <button key={priority} type="button" onClick={() => togglePriority(priority)} className={`p-3 rounded-xl border text-sm text-right transition-all ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{priority}</button>;
              })}
            </div>
            {errors.top_priorities && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.top_priorities}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-slate-400" /> ما أهم ما يقلقك أو تريد توضيحه قبل المتابعة؟ <span className="text-red-500">*</span></label>
            <textarea value={data.main_concern} onChange={(e) => { setData((prev) => ({ ...prev, main_concern: e.target.value })); setErrors((prev) => ({ ...prev, main_concern: '' })); }} rows={4} placeholder="اكتب سؤالك أو مخاوفك هنا..." className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
            {errors.main_concern && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.main_concern}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Scale className="h-4 w-4 text-slate-400" /> مدى استعدادك للمتابعة بعد الاستشارة</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {OPENNESS.map((option) => <button key={option.value} type="button" onClick={() => setData((prev) => ({ ...prev, openness_to_proceed: option.value }))} className={`p-3 rounded-xl border text-sm transition-all ${data.openness_to_proceed === option.value ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{option.label}</button>)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onBack} className="border-slate-300 text-slate-700">العودة</Button>
            <span className="text-xs text-slate-400">الصفحة 4 من 5</span>
            <Button onClick={() => validate() && onNext(data)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">التالي — الصفحة 5</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
