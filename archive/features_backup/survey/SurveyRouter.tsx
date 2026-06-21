import { ReactNode } from "react";

interface SurveyRouterProps {
  currentPage: number;
  totalPages: number;
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}

export function SurveyRouter({ currentPage, totalPages, children, onNext, onPrev, onSubmit }: SurveyRouterProps) {
  const progress = ((currentPage) / totalPages) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Step {currentPage} of {totalPages}</span>
            <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-6">
          {children}
        </div>
        <div className="flex justify-between">
          <button onClick={onPrev} disabled={currentPage <= 1} className="px-6 py-3 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
          {currentPage < totalPages ? (
            <button onClick={onNext} className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors">Next</button>
          ) : (
            <button onClick={onSubmit} className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors">Submit</button>
          )}
        </div>
      </div>
    </div>
  );
}
