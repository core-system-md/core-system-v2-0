import { useState } from "react";

interface ScriptItem {
  id: string;
  title: string;
  content: string;
  category: "greeting" | "closing" | "objection" | "followup";
  isFavorite: boolean;
}

interface SandlerScriptPanelProps {
  scripts: ScriptItem[];
  onInsert: (content: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function SandlerScriptPanel({ scripts, onInsert, onToggleFavorite }: SandlerScriptPanelProps) {
  const [filter, setFilter] = useState<"all" | ScriptItem["category"]>("all");
  const [search, setSearch] = useState("");

  const filtered = scripts.filter((s) => {
    const matchesFilter = filter === "all" || s.category === filter;
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "greeting": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "closing": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "objection": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "followup": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-3">Sandler Scripts</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scripts..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors mb-3"
        />
        <div className="flex gap-2 flex-wrap">
          {(["all", "greeting", "closing", "objection", "followup"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === cat ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filtered.length === 0 && <div className="text-center text-slate-500 text-sm py-8">No scripts found</div>}
        {filtered.map((script) => (
          <div key={script.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getCategoryColor(script.category)}`}>{script.category}</span>
              <button
                onClick={() => onToggleFavorite(script.id)}
                className={`text-sm transition-colors ${script.isFavorite ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
              >
                {script.isFavorite ? "★" : "☆"}
              </button>
            </div>
            <h3 className="text-sm font-medium text-white mb-1">{script.title}</h3>
            <p className="text-xs text-slate-400 line-clamp-3 mb-3">{script.content}</p>
            <button
              onClick={() => onInsert(script.content)}
              className="w-full py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            >
              Insert into Notes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
