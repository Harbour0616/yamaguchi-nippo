import { useState, useMemo } from "react";
import { loadSavedRecords } from "../data/dailyRecords";

interface SiteSummary {
  site: string;
  sales: number;
  cost: number;
  profit: number;
  profitRate: number;
  count: number;
}

const ALERT_THRESHOLD = 20;

export default function Dashboard() {
  const records = useMemo(() => loadSavedRecords(), []);
  const [filterMonth, setFilterMonth] = useState("");

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.date) set.add(r.date.slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [records]);

  const filtered = useMemo(() => {
    if (!filterMonth) return records;
    return records.filter((r) => r.date?.startsWith(filterMonth));
  }, [records, filterMonth]);

  const summaries = useMemo<SiteSummary[]>(() => {
    const map = new Map<string, { sales: number; cost: number; count: number }>();
    for (const r of filtered) {
      const site = r.site || "（現場未設定）";
      const existing = map.get(site);
      const sales = Number(r.sales.totalAmount) || 0;
      const cost = Number(r.cost.paidSalary) || 0;
      if (existing) {
        existing.sales += sales;
        existing.cost += cost;
        existing.count += 1;
      } else {
        map.set(site, { sales, cost, count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([site, d]) => {
        const profit = d.sales - d.cost;
        const profitRate = d.sales > 0 ? (profit / d.sales) * 100 : 0;
        return { site, sales: d.sales, cost: d.cost, profit, profitRate, count: d.count };
      })
      .sort((a, b) => a.profitRate - b.profitRate);
  }, [filtered]);

  const totalSales = summaries.reduce((s, d) => s + d.sales, 0);
  const totalCost = summaries.reduce((s, d) => s + d.cost, 0);
  const totalProfit = totalSales - totalCost;
  const totalProfitRate = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const alertCount = summaries.filter((s) => s.profitRate < ALERT_THRESHOLD).length;

  const fmt = (v: number) => `¥${v.toLocaleString()}`;

  const [ymYear, ymMonth] = filterMonth
    ? filterMonth.split("-")
    : ["", ""];
  const monthLabel = filterMonth
    ? `${ymYear}年${Number(ymMonth)}月`
    : "全期間";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1e293b] mb-1">
          粗利ダッシュボード
        </h2>
        <p className="text-sm text-[#94a3b8]">
          現場別の売上・原価・粗利を一覧で確認できます
        </p>
      </div>

      {/* Filter & Summary Bar */}
      <div className="bg-[#0f172a] rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/60">対象期間:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-400 w-auto"
            >
              <option value="" className="text-[#1e293b]">全期間</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split("-");
                return (
                  <option key={ym} value={ym} className="text-[#1e293b]">
                    {y}年{Number(m)}月
                  </option>
                );
              })}
            </select>
            <span className="text-sm text-white/70">{monthLabel}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-1.5">
              <span className="text-red-300 text-sm font-medium">
                {alertCount} 件の粗利アラート（{ALERT_THRESHOLD}%未満）
              </span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-xs text-white/50 mb-1">売上合計</div>
            <div className="text-lg font-bold font-mono text-teal-300">{fmt(totalSales)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-xs text-white/50 mb-1">原価合計</div>
            <div className="text-lg font-bold font-mono text-orange-300">{fmt(totalCost)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-xs text-white/50 mb-1">粗利合計</div>
            <div className={`text-lg font-bold font-mono ${totalProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {fmt(totalProfit)}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-xs text-white/50 mb-1">粗利率</div>
            <div className={`text-lg font-bold font-mono ${totalProfitRate >= ALERT_THRESHOLD ? "text-emerald-300" : "text-red-300"}`}>
              {totalSales > 0 ? `${totalProfitRate.toFixed(1)}%` : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Site Cards */}
      {summaries.length === 0 ? (
        <p className="text-[#94a3b8] text-sm">データがありません。</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const isAlert = s.profitRate < ALERT_THRESHOLD;
            return (
              <div
                key={s.site}
                className={`rounded-xl border p-5 transition ${
                  isAlert
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-[#e2e8ef]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isAlert && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs font-bold">!</span>
                    )}
                    <div>
                      <div className="font-bold text-[#1e293b]">{s.site}</div>
                      <div className="text-xs text-[#94a3b8]">{s.count} 件</div>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    isAlert ? "text-red-500" : s.profitRate >= 30 ? "text-emerald-600" : "text-[#1e293b]"
                  }`}>
                    {s.profitRate.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-[#94a3b8] mb-0.5">売上</div>
                    <div className="font-mono font-medium text-[#1e293b]">{fmt(s.sales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94a3b8] mb-0.5">原価</div>
                    <div className="font-mono font-medium text-[#1e293b]">{fmt(s.cost)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94a3b8] mb-0.5">粗利</div>
                    <div className={`font-mono font-medium ${s.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(s.profit)}
                    </div>
                  </div>
                </div>
                {/* Profit bar */}
                <div className="mt-3 h-2 bg-[#e2e8ef] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isAlert ? "bg-red-400" : s.profitRate >= 30 ? "bg-emerald-400" : "bg-teal-400"
                    }`}
                    style={{ width: `${Math.min(Math.max(s.profitRate, 0), 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
