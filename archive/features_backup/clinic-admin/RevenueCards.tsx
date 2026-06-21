interface RevenueCard {
  title: string;
  amount: number;
  change: number;
  period: string;
  icon: string;
}

interface RevenueCardsProps {
  cards: RevenueCard[];
}

export function RevenueCards({ cards }: RevenueCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{card.icon}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {card.change >= 0 ? "+" : ""}{card.change}%
            </span>
          </div>
          <h3 className="text-sm text-slate-400 mb-1">{card.title}</h3>
          <p className="text-2xl font-bold text-white">${card.amount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{card.period}</p>
        </div>
      ))}
    </div>
  );
}
