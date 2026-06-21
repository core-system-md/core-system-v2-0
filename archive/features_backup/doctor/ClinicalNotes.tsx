import { useState } from "react";

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

export function ClinicalNotes({ notes, onAddNote, onUpdateNote, patientName }: ClinicalNotesProps) {
  const [activeTab, setActiveTab] = useState<Note["type"]>("subjective");
  const [newContent, setNewContent] = useState("");

  const tabs: { key: Note["type"]; label: string; color: string }[] = [
    { key: "subjective", label: "S", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    { key: "objective", label: "O", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
    { key: "assessment", label: "A", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    { key: "plan", label: "P", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  ];

  const filteredNotes = notes.filter((n) => n.type === activeTab);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">SOAP Notes — {patientName}</h2>
        <div className="flex gap-2 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${activeTab === tab.key ? tab.color : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredNotes.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">No {activeTab} notes yet</div>
        )}
        {filteredNotes.map((note) => (
          <div key={note.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</span>
              <span className="text-xs text-slate-500">by {note.created_by}</span>
            </div>
            <textarea
              defaultValue={note.content}
              onBlur={(e) => onUpdateNote(note.id, e.target.value)}
              className="w-full bg-transparent text-sm text-slate-300 resize-none focus:outline-none min-h-[60px]"
            />
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={`Add ${activeTab} note...`}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none min-h-[80px]"
        />
        <button
          onClick={() => {
            if (!newContent.trim()) return;
            onAddNote({ content: newContent, type: activeTab, created_by: "Current Doctor" });
            setNewContent("");
          }}
          className="w-full mt-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
        >
          Add Note
        </button>
      </div>
    </div>
  );
}
