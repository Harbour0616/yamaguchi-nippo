interface KpiCard {
  label: string;
  value: string | number;
  color: string;
}

export default function KpiCards({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-surface border border-border rounded-lg p-4"
        >
          <div className="text-muted text-xs mb-1">{c.label}</div>
          <div className={`font-mono text-2xl font-bold ${c.color}`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
