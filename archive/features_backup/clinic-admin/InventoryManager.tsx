import { useState } from "react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  lastRestocked: string;
}

interface InventoryManagerProps {
  items: InventoryItem[];
  onRestock?: (id: string, amount: number) => void;
}

export function InventoryManager({ items, onRestock }: InventoryManagerProps) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const lowStock = items.filter((i) => i.quantity <= i.minThreshold);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Inventory</h2>
          {lowStock.length > 0 && <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">{lowStock.length} low stock</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...Array.from(new Set(items.map((i) => i.category)))].map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === cat ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>{cat === "all" ? "All" : cat}</button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {filtered.map((item) => (
          <div key={item.id} className={`p-4 flex items-center justify-between ${item.quantity <= item.minThreshold ? "bg-red-950/10" : ""}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{item.name}</p>
                {item.quantity <= item.minThreshold && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">LOW</span>}
              </div>
              <p className="text-xs text-slate-500">{item.category} • {item.quantity} {item.unit}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.quantity <= item.minThreshold ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 2)) * 100)}%` }} />
              </div>
              {onRestock && <button onClick={() => onRestock(item.id, item.minThreshold * 2)} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors">Restock</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
