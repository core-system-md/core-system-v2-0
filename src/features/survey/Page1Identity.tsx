import { useState } from 'react';
import { CheckCircle, AlertCircle, Stethoscope, FileText, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Page1Data {
  visit_type_selection: 'first_time' | 'returning' | '';
  service_reason: string;
  procedures_requested: string[];
  consent_accepted: boolean;
}

interface Page1IdentityProps {
  sessionId: string;
  initialData?: Partial<Page1Data> | undefined;
  onNext: (data: Page1Data) => void;
}

const VISIT_TYPE_OPTIONS = [
  { value: 'first_time' as const, label: 'زيارة أولى', description: 'أول زيارة للعيادة' },
  { value: 'returning' as const, label: 'زيارة متابعة', description: 'زيارة متابعة لحالة سابقة' },
];

const PLACEHOLDER_PROCEDURES = [
  'فحص عام', 'تنظيف أسنان', 'حشوة', 'قلع سن', 'تبييض', 'تقويم', 'زراعة أسنان', 'تجميل'
];

export default function Page1Identity({ sessionId, initialData, onNext }: Page1IdentityProps) {
  const [data, setData] = useState<Page1Data>({
    visit_type_selection: initialData?.visit_type_selection ?? '',
    service_reason: initialData?.service_reason ?? '',
    procedures_requested: initialData?.procedures_requested ?? [],
    consent_accepted: initialData?.consent_accepted ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof Page1Data>(field: K, value: Page1Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const toggleProcedure = (procedure: string) => {
    setData((prev) => {
      const has = prev.procedures_requested.includes(procedure);
      return {
        ...prev,
        procedures_requested: has
          ? prev.procedures_requested.filter((p) => p !== procedure)
          : [...prev.procedures_requested, procedure],
      };
    });
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!data.visit_type_selection) nextErrors.visit_type_selection = 'يرجى اختيار نوع الزيارة';
    if (!data.service_reason.trim()) nextErrors.service_reason = 'يرجى ذكر سبب الزيارة';
    if (data.procedures_requested.length === 0) nextErrors.procedures_requested = 'يرجى اختيار إجراء واحد على الأقل';
    if (!data.consent_accepted) nextErrors.consent_accepted = 'يجب الموافقة على الشروط للمتابعة';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext(data);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5" dir="rtl">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">الصفحة 1 من 5 — الهوية والمعلومات الأساسية</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">رقم الجلسة: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              نوع الزيارة <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VISIT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('visit_type_selection', opt.value)}
                  className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-right ${
                    data.visit_type_selection === opt.value
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`font-bold text-sm ${
                    data.visit_type_selection === opt.value ? 'text-emerald-800' : 'text-slate-700'
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">{opt.description}</span>
                  {data.visit_type_selection === opt.value && (
                    <CheckCircle className="absolute top-3 left-3 h-5 w-5 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
            {errors.visit_type_selection && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.visit_type_selection}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              سبب الزيارة <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.service_reason}
              onChange={(e) => updateField('service_reason', e.target.value)}
              placeholder="اشرح سبب زيارتك باختصار..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            {errors.service_reason && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.service_reason}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-slate-400" />
              الإجراءات المطلوبة <span className="text-red-500">*</span>
              <span className="text-[10px] text-slate-400 font-normal">(قائمة مؤقتة — سيتم ربطها بقاعدة البيانات لاحقًا)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDER_PROCEDURES.map((proc) => {
                const selected = data.procedures_requested.includes(proc);
                return (
                  <button
                    key={proc}
                    type="button"
                    onClick={() => toggleProcedure(proc)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {selected && <CheckCircle className="h-3 w-3 inline-block ml-1" />}
                    {proc}
                  </button>
                );
              })}
            </div>
            {errors.procedures_requested && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.procedures_requested}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={data.consent_accepted}
                  onChange={(e) => updateField('consent_accepted', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <div className="text-sm leading-relaxed">
                <span className="font-medium text-slate-800">أقر بأنني أقدم هذه المعلومات طوعاً</span>
                <p className="text-slate-500 text-xs mt-0.5">
                  أوافق على جمع ومعالجة بياناتي الشخصية وفقاً لسياسة الخصوصية الخاصة بالعيادة. أدرك أن هذه البيانات تُستخدم لأغراض تشخيصية وعلاجية فقط.
                </p>
              </div>
            </label>
            {errors.consent_accepted && (
              <p className="text-xs text-red-600 flex items-center gap-1 mr-8">
                <AlertCircle className="h-3 w-3" />{errors.consent_accepted}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">الصفحة 1 من 5</span>
            <Button
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            >
              التالي — الصفحة 2
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
        البيانات تُحفظ محلياً فقط في هذه المرحلة — لا يوجد اتصال بقاعدة البيانات (P43-A UI Foundation)
      </p>
    </div>
  );
}
