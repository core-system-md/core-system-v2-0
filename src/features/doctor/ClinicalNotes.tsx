import { useState } from "react";
import { useAuth } from "../../core/auth/useAuth";
import { formatDateTime } from '@/shared/utils/dateTime';

interface Note {
  id: string;
  content: string;
  type: "subjective" | "objective" | "assessment" | "plan";
  created_at: string;
  created_by: string;
}

interface ClinicalNotesProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, "id" | "created_at">) => void;
  onUpdateNote: (id: string, content: string) => void;
  patientName: string;
}

const tabs = [
  { key: "subjective" as const, label: "S", labelAr: "ذاتي", active: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "objective" as const, label: "O", labelAr: "موضوعي", active: "border-sky-200 bg-sky-50 text-sky-700" },
  { key: "assessment" as const, label: "A", labelAr: "تقييم", active: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "plan" as const, label: "P", labelAr: "خطة", active: "border-violet-200 bg-violet-50 text-violet-700" },
];

export function ClinicalNotes({ notes, onAddNote, onUpdateNote, patientName }: ClinicalNotesProps) {
  const [activeTab, setActiveTab] = useState<Note["type"]>("subjective");
  const [newContent, setNewContent] = useState("");
  const { user } = useAuth();
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.labelAr ?? "ملاحظة";
  const filteredNotes = notes.filter((note) => note.type === activeTab);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" dir="rtl">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
        <p className="text-xs font-medium text-slate-400">السجل السريري</p>
        <h2 className="mt-1 text-lg font-bold text-[#1B2A4A]">ملاحظات SOAP — {patientName}</h2>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="أنواع الملاحظات السريرية">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              title={tab.labelAr}
              onClick={() => setActiveTab(tab.key)}
              className={`h-10 w-10 rounded-xl border text-sm font-bold transition-colors ${activeTab === tab.key ? tab.active : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4 md:p-5">
        {filteredNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-500">لا توجد ملاحظات من نوع {activeLabel}</p>
            <p className="mt-1 text-xs text-slate-400">أضف الملاحظة من الحقل أدناه.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{formatDateTime(note.created_at)}</span>
                  <span>{note.created_by}</span>
                </div>
                <textarea
                  defaultValue={note.content}
                  onBlur={(event) => onUpdateNote(note.id, event.target.value)}
                  aria-label={`ملاحظة ${activeLabel}`}
                  className="min-h-[84px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#1B2A4A] focus:bg-white focus:ring-2 focus:ring-slate-200"
                  dir="rtl"
                />
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 md:p-5">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="doctor-new-clinical-note">
          إضافة ملاحظة {activeLabel}
        </label>
        <textarea
          id="doctor-new-clinical-note"
          value={newContent}
          onChange={(event) => setNewContent(event.target.value)}
          placeholder={`أضف ملاحظة ${activeLabel}...`}
          className="mt-2 min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#1B2A4A] focus:bg-white focus:ring-2 focus:ring-slate-200"
          dir="rtl"
        />
        <button
          type="button"
          onClick={() => {
            if (!newContent.trim()) return;
            onAddNote({ content: newContent.trim(), type: activeTab, created_by: user?.id ?? '' });
            setNewContent("");
          }}
          className="mt-3 w-full rounded-xl bg-[#1B2A4A] py-3 text-sm font-bold text-white transition-colors hover:bg-[#223A63]"
        >
          إضافة الملاحظة
        </button>
      </div>
    </section>
  );
}
