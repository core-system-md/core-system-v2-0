import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { AlertCircle, CheckCircle2, Eraser, FileSignature, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Page5Data {
  digital_signature_svg: string;
  signature_timestamp: string;
}

interface Page5ConsentSignProps {
  sessionId: string;
  initialData?: Partial<Page5Data> | undefined;
  onComplete: (data: Page5Data) => void;
  onBack: () => void;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 220;

export default function Page5ConsentSign({ sessionId, initialData, onComplete, onBack }: Page5ConsentSignProps) {
  const [path, setPath] = useState(initialData?.digital_signature_svg ?? '');
  const [consent, setConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const drawing = useRef(false);

  const pointFromEvent = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * SVG_WIDTH, y: ((event.clientY - rect.top) / rect.height) * SVG_HEIGHT };
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    drawing.current = true;
    setPath(`M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const point = pointFromEvent(event);
    setPath((current) => `${current} L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
  };

  const stopDrawing = () => { drawing.current = false; };

  const submit = () => {
    if (!consent || !agreed || !path.trim()) return;
    onComplete({ digital_signature_svg: path, signature_timestamp: new Date().toISOString() });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" dir="rtl">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FileSignature className="h-5 w-5 text-emerald-700" /></div><div><CardTitle className="text-lg font-bold text-slate-900">الصفحة 5 من 5 — الموافقة والتوقيع</CardTitle><p className="text-sm text-slate-500 mt-0.5">رقم الجلسة: {sessionId.slice(0, 8)}...</p></div></div></CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"><div className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /><p className="text-sm leading-6 text-slate-700">أوافق على معالجة المعلومات التي قدمتها ضمن هذا الاستبيان لأغراض الرعاية والتواصل المرتبط بزيارتي.</p></div><div className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /><p className="text-sm leading-6 text-slate-700">أفهم أن المعلومات الصحية تُتعامل معها وفق الصلاحيات والسياسات المعتمدة في العيادة.</p></div></div>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /><span className="text-sm text-slate-800">أوافق على جمع ومعالجة بياناتي وفقاً للأغراض الموضحة أعلاه. <span className="text-red-500">*</span></span></label>
          <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-sm font-semibold text-slate-800">التوقيع الإلكتروني <span className="text-red-500">*</span></label><button type="button" onClick={() => setPath('')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><Eraser className="h-3.5 w-3.5" />مسح</button></div><div className="rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden touch-none"><svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-52 cursor-crosshair" role="img" aria-label="منطقة التوقيع" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing}><rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="white" />{path && <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800" />}{!path && <text x={SVG_WIDTH / 2} y={SVG_HEIGHT / 2} textAnchor="middle" className="fill-slate-400 text-sm">ارسم توقيعك هنا</text>}<line x1="40" y1="180" x2="560" y2="180" stroke="currentColor" strokeWidth="1" className="text-slate-200" /></svg></div></div>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /><span className="text-sm text-slate-800">أؤكد أن المعلومات التي قدمتها صحيحة حسب علمي. <span className="text-red-500">*</span></span></label>
          {!consent || !agreed || !path.trim() ? <p className="text-xs text-slate-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />يجب الموافقة والتوقيع والتأكيد قبل إكمال الاستبيان.</p> : <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />كل المتطلبات مكتملة.</p>}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100"><Button variant="outline" onClick={onBack} className="border-slate-300 text-slate-700">العودة</Button><Button onClick={submit} disabled={!consent || !agreed || !path.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">إكمال الاستبيان</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
