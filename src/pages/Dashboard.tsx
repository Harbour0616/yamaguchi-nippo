import { useState, useMemo, useEffect, useRef } from "react";
import type { DailyRecord } from "../types/journal";
import type { Site } from "../data/sites";
import { loadSavedRecords } from "../data/dailyRecords";
import { loadSites } from "../data/sites";
import { calcSalesBySite } from "../utils/calcSales";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
} from "recharts";

/* ───── types ───── */
interface SiteRow {
  site: string;
  customer: string;
  sales: number;
  cost: number;
  profit: number;
  rate: number;
  count: number;
  alertLevel: string;
  alertReason: string;
}

interface CustomerGroup {
  customer: string;
  count: number;
  sales: number;
  cost: number;
  profit: number;
  rate: number;
}

/* ───── helpers ───── */
const rateColor = (r: number) =>
  r >= 30 ? "text-[#10b981]" : r >= 20 ? "text-[#0f172a]" : "text-[#ef4444]";

function alertFor(rate: number, profit: number): { level: string; reason: string } {
  if (profit < 0) return { level: "赤字", reason: "売上<原価" };
  if (rate < 20) return { level: "要改善", reason: "粗利率20%未満" };
  if (rate < 30) return { level: "標準", reason: "" };
  return { level: "優良", reason: "" };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="rounded-full"
        style={{ width: 4, height: 20, background: "#14b8a6" }}
      />
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {children}
      </h2>
    </div>
  );
}

function AlertBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    優良: { bg: "#ccfbf1", color: "#0d9488" },
    標準: { bg: "#dbeafe", color: "#1e40af" },
    要改善: { bg: "#fee2e2", color: "#b91c1c" },
    赤字: { bg: "#fee2e2", color: "#dc2626" },
  };
  const c = cfg[level] ?? cfg["標準"];
  return (
    <span
      style={{
        display: "inline-flex",
        justifyContent: "center",
        minWidth: 44,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
      }}
    >
      {level}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        border: "1px solid #1e3a5f",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#e2e8f0",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #334155",
        }}
      >
        {label}
      </div>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 12,
            color: "#e2e8f0",
            marginBottom: 3,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color,
                display: "inline-block",
              }}
            />
            {p.name}
          </span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {p.name === "粗利率"
              ? `${p.value.toFixed(1)}%`
              : `¥${Math.abs(p.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ───── useCountUp hook ───── */
function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + diff * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ───── KPI card hover ───── */
const kpiCardStyle: React.CSSProperties = {
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
  border: "1px solid rgba(13,27,42,0.06)",
  position: "relative",
  overflow: "hidden",
  cursor: "default",
  transition:
    "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease",
};
const kpiEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
  e.currentTarget.style.boxShadow = "0 12px 32px rgba(12,27,51,0.13)";
  const line = e.currentTarget.querySelector("[data-kpi-line]") as HTMLElement;
  if (line) line.style.opacity = "1";
};
const kpiLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transform = "none";
  e.currentTarget.style.boxShadow = "0 4px 24px rgba(12,27,51,0.08)";
  const line = e.currentTarget.querySelector("[data-kpi-line]") as HTMLElement;
  if (line) line.style.opacity = "0";
};
const KpiLine = () => (
  <div
    data-kpi-line=""
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: "#14b8a6",
      opacity: 0,
      transition: "opacity 0.18s",
    }}
  />
);

type ViewTab = "monthly" | "customer" | "site";

/* ═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [siteMaster, setSiteMaster] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadSavedRecords(), loadSites()])
      .then(([r, s]) => { setRecords(r); setSiteMaster(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [filterMonth, setFilterMonth] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("monthly");
  const [unit, setUnit] = useState<"yen" | "k">("yen");
  const [personFilter, setPersonFilter] = useState("全員");
  const [alertFilterSel, setAlertFilterSel] = useState("すべて");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  /* available months */
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) if (r.date) set.add(r.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [records]);

  /* persons */
  const persons = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) if (r.staff) set.add(r.staff);
    return Array.from(set).sort();
  }, [records]);

  /* filtered records */
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterMonth && !r.date?.startsWith(filterMonth)) return false;
      if (personFilter !== "全員" && r.staff !== personFilter) return false;
      return true;
    });
  }, [records, filterMonth, personFilter]);

  /* aggregate by site */
  const siteRows = useMemo<SiteRow[]>(() => {
    // 売上: calcSalesBySite で常用/自社受・出来高を区別
    const salesBySite = calcSalesBySite(filteredRecords, siteMaster);
    // 原価・件数・顧客は従来通り積み上げ
    const costMap = new Map<string, { customer: string; cost: number; count: number }>();
    for (const r of filteredRecords) {
      const site = r.site || "（現場未設定）";
      const cost = Number(r.cost.paidSalary) || 0;
      const existing = costMap.get(site);
      if (existing) {
        existing.cost += cost;
        existing.count += 1;
      } else {
        costMap.set(site, { customer: r.customer || "（未設定）", cost, count: 1 });
      }
    }
    // マージ
    const allSites = new Set([...salesBySite.keys(), ...costMap.keys()]);
    return Array.from(allSites)
      .map((site) => {
        const sales = salesBySite.get(site) || 0;
        const c = costMap.get(site) || { customer: "（未設定）", cost: 0, count: 0 };
        const profit = sales - c.cost;
        const rate = sales > 0 ? (profit / sales) * 100 : 0;
        const { level, reason } = alertFor(rate, profit);
        return {
          site,
          customer: c.customer,
          sales,
          cost: c.cost,
          profit,
          rate,
          count: c.count,
          alertLevel: level,
          alertReason: reason,
        };
      })
      .sort((a, b) => a.rate - b.rate);
  }, [filteredRecords, siteMaster]);

  /* alert filter */
  const filtered = useMemo(() => {
    if (alertFilterSel === "すべて") return siteRows;
    return siteRows.filter((s) => s.alertLevel === alertFilterSel);
  }, [siteRows, alertFilterSel]);

  /* KPI totals */
  const totalSales = filtered.reduce((s, d) => s + d.sales, 0);
  const totalCost = filtered.reduce((s, d) => s + d.cost, 0);
  const totalProfit = totalSales - totalCost;
  const avgRate = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const animSales = useCountUp(totalSales);
  const animCost = useCountUp(totalCost);
  const animProfit = useCountUp(Math.abs(totalProfit));
  const animRate = useCountUp(Math.round(avgRate * 10));

  /* alert counts */
  const alertCounts = useMemo(() => {
    const c: Record<string, number> = { 優良: 0, 標準: 0, 要改善: 0, 赤字: 0 };
    for (const s of siteRows) c[s.alertLevel] = (c[s.alertLevel] || 0) + 1;
    return c;
  }, [siteRows]);

  const alertItems = useMemo(
    () => siteRows.filter((s) => s.alertLevel === "要改善" || s.alertLevel === "赤字"),
    [siteRows]
  );

  /* distribution */
  const high = filtered.filter((s) => s.rate >= 30);
  const mid = filtered.filter((s) => s.rate >= 20 && s.rate < 30);
  const low = filtered.filter((s) => s.rate < 20);
  const sorted = [...filtered].sort((a, b) => b.rate - a.rate);
  const best = sorted[0] || null;
  const worst = sorted[sorted.length - 1] || null;

  /* chart data */
  const chartData = useMemo(() => {
    return filtered.map((s) => ({
      name: s.site.length > 8 ? s.site.slice(0, 8) + "…" : s.site,
      原価: unit === "k" ? Math.round(s.cost / 1000) : s.cost,
      粗利: s.profit >= 0 ? (unit === "k" ? Math.round(s.profit / 1000) : s.profit) : 0,
      赤字: s.profit < 0 ? (unit === "k" ? Math.round(Math.abs(s.profit) / 1000) : Math.abs(s.profit)) : 0,
      粗利率: Math.round(s.rate * 10) / 10,
    }));
  }, [filtered, unit]);

  const chartUnit = unit === "k" ? "千" : "";

  /* customer groups */
  const customerGroups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, { sales: number; cost: number; count: number }>();
    for (const s of siteRows) {
      const cust = s.customer;
      const existing = map.get(cust);
      if (existing) {
        existing.sales += s.sales;
        existing.cost += s.cost;
        existing.count += s.count;
      } else {
        map.set(cust, { sales: s.sales, cost: s.cost, count: s.count });
      }
    }
    return Array.from(map.entries())
      .map(([customer, d]) => {
        const profit = d.sales - d.cost;
        const rate = d.sales > 0 ? (profit / d.sales) * 100 : 0;
        return { customer, count: d.count, sales: d.sales, cost: d.cost, profit, rate };
      })
      .sort((a, b) => b.sales - a.sales);
  }, [siteRows]);

  const custChartData = useMemo(() => {
    const data = customerGroups.map((g) => ({
      name: g.customer.length > 8 ? g.customer.slice(0, 8) + "…" : g.customer,
      売上: unit === "k" ? Math.round(g.sales / 1000) : g.sales,
      粗利: unit === "k" ? Math.round(g.profit / 1000) : g.profit,
    }));
    return { data, unit: unit === "k" ? "千" : "" };
  }, [customerGroups, unit]);

  /* fmt */
  const fmtVal = (v: number) => {
    if (unit === "k") return `¥${Math.round(Math.abs(v) / 1000).toLocaleString()}千`;
    return `¥${Math.abs(v).toLocaleString()}`;
  };

  /* month tabs */
  const monthTabs = useMemo(() => {
    return availableMonths.map((ym) => {
      const [y, m] = ym.split("-");
      return { key: ym, label: `${y}年${Number(m)}月` };
    });
  }, [availableMonths]);

  /* view tab config */
  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: "monthly", label: "月次・現場別" },
    { key: "customer", label: "顧客先別" },
    { key: "site", label: "現場一覧" },
  ];

  /* table header style */
  const thStyle = (align: "left" | "right" | "center"): React.CSSProperties => ({
    padding: "11px 14px",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
    background: "linear-gradient(135deg, #1e3a5f 0%, #162d4f 100%)",
    borderBottom: "2px solid #14b8a6",
    whiteSpace: "nowrap",
    textAlign: align,
  });

  const tdNum: React.CSSProperties = {
    padding: "11px 14px",
    fontSize: 13,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "#0f172a",
  };

  if (loading) return <div className="text-sm text-muted p-4">読み込み中...</div>;

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#14b8a6",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            PROFIT DASHBOARD
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 4,
            }}
          >
            粗利ダッシュボード
          </h1>
        </div>
      </div>

      {/* View Tabs */}
      <div className="mb-5">
        <div
          className="inline-flex rounded-xl p-1"
          style={{ background: "#f1f5f9" }}
        >
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewTab(tab.key)}
              className="cursor-pointer"
              style={{
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                background: viewTab === tab.key ? "#fff" : "transparent",
                color: viewTab === tab.key ? "#0f172a" : "#64748b",
                boxShadow:
                  viewTab === tab.key
                    ? "0 2px 8px rgba(0,0,0,0.08)"
                    : "none",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month tabs */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 mb-5"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <button
          onClick={() => setFilterMonth("")}
          className="shrink-0 cursor-pointer"
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            background: filterMonth === "" ? "#0d2443" : "#fff",
            color: filterMonth === "" ? "#fff" : "#64748b",
            border: filterMonth === "" ? "none" : "1px solid #e2e8f0",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          全期間
        </button>
        {monthTabs.map((tab) => {
          const active = filterMonth === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterMonth(tab.key)}
              className="shrink-0 cursor-pointer"
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                background: active ? "#0d2443" : "#fff",
                color: active ? "#fff" : "#64748b",
                border: active ? "none" : "1px solid #e2e8f0",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <SectionTitle>フィルタ</SectionTitle>
      <div className="bg-white rounded-xl shadow-sm border border-[#e8edf3] p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#64748b] font-semibold whitespace-nowrap">
              担当者
            </span>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="px-3 py-1.5 text-[13px] rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] focus:outline-none focus:border-[#14b8a6]"
            >
              <option value="全員">全員</option>
              {persons.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#64748b] font-semibold whitespace-nowrap">
              判定
            </span>
            <select
              value={alertFilterSel}
              onChange={(e) => setAlertFilterSel(e.target.value)}
              className="px-3 py-1.5 text-[13px] rounded-lg border border-[#e2e8f0] bg-white text-[#0f172a] focus:outline-none focus:border-[#14b8a6]"
            >
              <option value="すべて">すべて</option>
              <option value="優良">優良</option>
              <option value="標準">標準</option>
              <option value="要改善">要改善</option>
              <option value="赤字">赤字</option>
            </select>
          </div>
          <div className="ml-auto flex rounded-lg overflow-hidden border border-[#e2e8f0]">
            <button
              onClick={() => setUnit("yen")}
              className={`px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-colors ${
                unit === "yen"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              円表示
            </button>
            <button
              onClick={() => setUnit("k")}
              className={`px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-colors border-l border-[#e2e8f0] ${
                unit === "k"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              千円
            </button>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          {/* ═══ MONTHLY TAB ═══ */}
          {viewTab === "monthly" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                <div
                  className="bg-white p-6"
                  style={kpiCardStyle}
                  onMouseEnter={kpiEnter}
                  onMouseLeave={kpiLeave}
                >
                  <KpiLine />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    売上合計
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: "#0d1b2a",
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtVal(animSales)}
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}
                  >
                    現場数: {filtered.length} 件
                  </div>
                </div>

                <div
                  className="bg-white p-6"
                  style={kpiCardStyle}
                  onMouseEnter={kpiEnter}
                  onMouseLeave={kpiLeave}
                >
                  <KpiLine />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    原価合計
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: "#0d1b2a",
                      lineHeight: 1.1,
                    }}
                  >
                    {fmtVal(animCost)}
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}
                  >
                    売上比:{" "}
                    {totalSales > 0
                      ? ((totalCost / totalSales) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div
                  className="bg-white p-6"
                  style={{
                    ...kpiCardStyle,
                    borderLeft: "3px solid #14b8a6",
                  }}
                  onMouseEnter={kpiEnter}
                  onMouseLeave={kpiLeave}
                >
                  <KpiLine />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    粗利合計
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: totalProfit >= 0 ? "#14b8a6" : "#ef4444",
                      lineHeight: 1.1,
                    }}
                  >
                    {totalProfit < 0 ? "-" : ""}
                    {fmtVal(animProfit)}
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}
                  >
                    売上 - 原価
                  </div>
                </div>

                <div
                  className="bg-white p-6"
                  style={kpiCardStyle}
                  onMouseEnter={kpiEnter}
                  onMouseLeave={kpiLeave}
                >
                  <KpiLine />
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    平均粗利率
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color:
                        avgRate >= 30
                          ? "#10b981"
                          : avgRate >= 20
                          ? "#2563eb"
                          : "#ef4444",
                      lineHeight: 1.1,
                    }}
                  >
                    {(animRate / 10).toFixed(1)}
                    <span style={{ fontSize: 20, fontWeight: 600, marginLeft: 2 }}>
                      %
                    </span>
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}
                  >
                    {avgRate >= 30
                      ? "優良水準"
                      : avgRate >= 20
                      ? "標準水準"
                      : "要改善"}
                  </div>
                </div>
              </div>

              {/* Alert count cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {(
                  [
                    {
                      key: "標準",
                      border: "#3b82f6",
                      numColor: "#1e40af",
                      sub: "粗利率 20〜30%",
                    },
                    {
                      key: "要改善",
                      border: "#ef4444",
                      numColor: "#b91c1c",
                      sub: "粗利率 20%未満",
                    },
                    {
                      key: "赤字",
                      border: "#ef4444",
                      numColor: "#dc2626",
                      sub: "売上 < 原価",
                    },
                  ] as const
                ).map((a) => (
                  <div
                    key={a.key}
                    className="bg-white"
                    style={{
                      borderRadius: 14,
                      boxShadow: "0 2px 12px rgba(12,27,51,0.07)",
                      borderLeft: `4px solid ${a.border}`,
                      padding: "18px 18px",
                      cursor: "default",
                      transition:
                        "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(-3px) scale(1.01)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 28px rgba(12,27,51,0.11)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(12,27,51,0.07)";
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {a.key}
                    </div>
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        color: a.numColor,
                        lineHeight: 1,
                      }}
                    >
                      {alertCounts[a.key]}
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#94a3b8",
                          marginLeft: 2,
                        }}
                      >
                        件
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 6,
                        fontWeight: 500,
                      }}
                    >
                      {a.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alert sites list */}
              {alertItems.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-[#e8edf3] p-5 mb-6">
                  <div className="text-[13px] font-bold text-[#0f172a] mb-3 flex items-center gap-1.5">
                    <span className="text-[#f59e0b]">&#9888;</span> 要確認現場
                  </div>
                  <div className="space-y-2.5">
                    {alertItems.slice(0, 5).map((r) => (
                      <div key={r.site} className="flex items-center gap-3">
                        <AlertBadge level={r.alertLevel} />
                        <span className="text-[13px] text-[#0f172a] font-semibold flex-1 truncate">
                          {r.site}
                        </span>
                        <span
                          className={`text-[13px] font-mono font-bold ${rateColor(
                            r.rate
                          )}`}
                        >
                          {r.rate.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-[#94a3b8] w-20 text-right">
                          {r.alertReason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart + Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                <div className="lg:col-span-2">
                  <SectionTitle>現場別利益</SectionTitle>
                  <div
                    className="bg-white"
                    style={{
                      borderRadius: 16,
                      boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                      border: "1px solid rgba(13,27,42,0.06)",
                      padding: 24,
                    }}
                  >
                    {/* Legend */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#1e3a5f",
                              display: "inline-block",
                            }}
                          />
                          原価
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#14b8a6",
                              display: "inline-block",
                            }}
                          />
                          粗利
                        </span>
                      </div>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 16,
                            height: 2,
                            background: "#f59e0b",
                            display: "inline-block",
                            borderRadius: 1,
                          }}
                        />
                        粗利率
                      </span>
                    </div>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={360}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 8, right: 20, bottom: 30, left: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="#e2e8f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 13, fill: "#64748b" }}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 13, fill: "#64748b" }}
                            tickFormatter={(v: number) =>
                              v.toLocaleString() + chartUnit
                            }
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 13, fill: "#f59e0b" }}
                            tickFormatter={(v: number) => `${v}%`}
                            domain={[0, 50]}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            yAxisId="left"
                            dataKey="原価"
                            stackId="main"
                            fill="#1e3a5f"
                            barSize={28}
                            radius={[0, 0, 4, 4]}
                            isAnimationActive={true}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="粗利"
                            stackId="main"
                            fill="#14b8a6"
                            barSize={28}
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="赤字"
                            stackId="main"
                            fill="#ef4444"
                            barSize={28}
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="粗利率"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={(props: Record<string, unknown>) => {
                              const cx = (props.cx as number) ?? 0;
                              const cy = (props.cy as number) ?? 0;
                              const payload = props.payload as { 粗利率?: number } | undefined;
                              const rate = payload?.粗利率 ?? 0;
                              const fill =
                                rate >= 30
                                  ? "#0d9488"
                                  : rate >= 20
                                  ? "#3b82f6"
                                  : "#ef4444";
                              return (
                                <circle
                                  key={`dot-${cx}`}
                                  cx={cx}
                                  cy={cy}
                                  r={5}
                                  fill={fill}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              );
                            }}
                            isAnimationActive={true}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-16 text-[#94a3b8] text-[13px]">
                        データなし
                      </div>
                    )}
                  </div>
                </div>

                {/* Distribution */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <SectionTitle>粗利率分布</SectionTitle>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      padding: 24,
                      boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                      flex: 1,
                    }}
                  >
                    {/* 3 Gauge meters */}
                    <div
                      className="grid grid-cols-3 gap-3"
                      style={{ marginBottom: 20 }}
                    >
                      {[
                        {
                          label: "優良",
                          sub: "≥30%",
                          count: high.length,
                          color: "#14b8a6",
                          trackColor: "#ccfbf1",
                          textFill: "#0d9488",
                          pct:
                            filtered.length > 0
                              ? Math.round(
                                  (high.length / filtered.length) * 100
                                )
                              : 0,
                        },
                        {
                          label: "標準",
                          sub: "20-30%",
                          count: mid.length,
                          color: "#3b82f6",
                          trackColor: "#dbeafe",
                          textFill: "#1e40af",
                          pct:
                            filtered.length > 0
                              ? Math.round(
                                  (mid.length / filtered.length) * 100
                                )
                              : 0,
                        },
                        {
                          label: "要改善",
                          sub: "<20%",
                          count: low.length,
                          color: "#ef4444",
                          trackColor: "#fee2e2",
                          textFill: "#b91c1c",
                          pct:
                            filtered.length > 0
                              ? Math.round(
                                  (low.length / filtered.length) * 100
                                )
                              : 0,
                        },
                      ].map((d) => {
                        const angle = (d.pct / 100) * 180;
                        const rad = (angle * Math.PI) / 180;
                        const r = 40;
                        const cx = 50,
                          cy = 46;
                        const x = cx + r * Math.cos(Math.PI - rad);
                        const y = cy - r * Math.sin(Math.PI - rad);
                        const large = angle > 180 ? 1 : 0;
                        const arcPath =
                          d.pct > 0
                            ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x.toFixed(
                                2
                              )} ${y.toFixed(2)}`
                            : "";
                        return (
                          <div
                            key={d.label}
                            className="text-center"
                            style={{ padding: "8px 0" }}
                          >
                            <svg
                              viewBox="0 0 100 55"
                              style={{
                                width: "100%",
                                maxWidth: 120,
                                margin: "0 auto",
                                display: "block",
                              }}
                            >
                              <path
                                d="M 10 46 A 40 40 0 0 1 90 46"
                                fill="none"
                                stroke={d.trackColor}
                                strokeWidth="7"
                                strokeLinecap="round"
                              />
                              {arcPath && (
                                <path
                                  d={arcPath}
                                  fill="none"
                                  stroke={d.color}
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                />
                              )}
                              <text
                                x="50"
                                y="44"
                                textAnchor="middle"
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontSize: 22,
                                  fontWeight: 700,
                                  fill: d.textFill,
                                }}
                              >
                                {d.count}
                              </text>
                            </svg>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: d.color,
                                marginTop: 2,
                              }}
                            >
                              {d.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                marginTop: 1,
                              }}
                            >
                              {d.sub} — {d.pct}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        height: 1,
                        background: "#e2e8f0",
                        marginBottom: 16,
                      }}
                    />

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#94a3b8",
                        letterSpacing: "0.06em",
                        marginBottom: 12,
                      }}
                    >
                      最高 / 最低
                    </div>

                    {best && (
                      <div
                        className="flex items-center gap-3"
                        style={{
                          marginBottom: 10,
                          padding: "8px 12px",
                          background: "#f0fdfa",
                          borderRadius: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 4,
                            height: 32,
                            borderRadius: 2,
                            background: "#14b8a6",
                            flexShrink: 0,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#14b8a6",
                              marginBottom: 2,
                            }}
                          >
                            BEST
                          </div>
                          <div
                            className="truncate"
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#0f172a",
                            }}
                          >
                            {best.site}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#14b8a6",
                            flexShrink: 0,
                          }}
                        >
                          {best.rate.toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {worst && best !== worst && (
                      <div
                        className="flex items-center gap-3"
                        style={{
                          padding: "8px 12px",
                          background: "#fff5f5",
                          borderRadius: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 4,
                            height: 32,
                            borderRadius: 2,
                            background: "#ef4444",
                            flexShrink: 0,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#ef4444",
                              marginBottom: 2,
                            }}
                          >
                            WORST
                          </div>
                          <div
                            className="truncate"
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#0f172a",
                            }}
                          >
                            {worst.site}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#ef4444",
                            flexShrink: 0,
                          }}
                        >
                          {worst.rate.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <SectionTitle>現場一覧</SectionTitle>
              <div
                className="mb-6"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    padding: "14px 20px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {filtered.length}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      現場別損益一覧
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-4"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#0d9488",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#64748b" }}>≥30%</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#1e40af",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#64748b" }}>20-30%</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#dc2626",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#64748b" }}>&lt;20%</span>
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th style={thStyle("left")}>#</th>
                        <th style={thStyle("left")}>現場名</th>
                        <th style={thStyle("left")}>顧客先</th>
                        <th style={thStyle("right")}>売上</th>
                        <th style={thStyle("right")}>原価</th>
                        <th style={thStyle("right")}>粗利</th>
                        <th style={thStyle("right")}>粗利率</th>
                        <th style={thStyle("center")}>判定</th>
                        <th style={thStyle("right")}>件数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr
                          key={r.site}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background:
                              i % 2 === 0 ? "#ffffff" : "#f8fafc",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f0fdfa")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              i % 2 === 0 ? "#ffffff" : "#f8fafc")
                          }
                        >
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#cbd5e1",
                              fontWeight: 600,
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#0f172a",
                              fontWeight: 500,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.site}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {r.customer}
                          </td>
                          <td style={tdNum}>{fmtVal(r.sales)}</td>
                          <td style={tdNum}>{fmtVal(r.cost)}</td>
                          <td
                            style={{
                              ...tdNum,
                              fontWeight: 700,
                              color:
                                r.profit >= 0 ? "#0d9488" : "#dc2626",
                            }}
                          >
                            {r.profit < 0 ? "-" : ""}
                            {fmtVal(Math.abs(r.profit))}
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, textAlign: "right" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                justifyContent: "center",
                                minWidth: 52,
                                borderRadius: 20,
                                padding: "3px 10px",
                                fontSize: 11.5,
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                background:
                                  r.rate >= 30
                                    ? "#ccfbf1"
                                    : r.rate >= 20
                                    ? "#dbeafe"
                                    : "#fee2e2",
                                color:
                                  r.rate >= 30
                                    ? "#0f766e"
                                    : r.rate >= 20
                                    ? "#1e40af"
                                    : "#b91c1c",
                              }}
                            >
                              {r.rate.toFixed(1)}%
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 12,
                              textAlign: "center",
                              fontWeight:
                                r.alertLevel === "要改善" ||
                                r.alertLevel === "赤字"
                                  ? 700
                                  : 600,
                              color:
                                r.alertLevel === "優良"
                                  ? "#0d9488"
                                  : r.alertLevel === "標準"
                                  ? "#1e40af"
                                  : "#b91c1c",
                            }}
                          >
                            {r.alertLevel}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              textAlign: "right",
                              color: "#64748b",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {r.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ═══ CUSTOMER TAB ═══ */}
          {viewTab === "customer" && (
            <>
              {/* Customer KPI */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                {[
                  {
                    label: "取引先数",
                    value: String(customerGroups.length),
                    color: "#0d1b2a",
                  },
                  {
                    label: "売上合計",
                    value: fmtVal(
                      customerGroups.reduce((s, g) => s + g.sales, 0)
                    ),
                    color: "#0d1b2a",
                  },
                  {
                    label: "粗利合計",
                    value: fmtVal(
                      customerGroups.reduce((s, g) => s + g.profit, 0)
                    ),
                    color: "#14b8a6",
                  },
                  {
                    label: "平均粗利率",
                    value: `${(
                      customerGroups.length > 0
                        ? customerGroups.reduce((s, g) => s + g.rate, 0) /
                          customerGroups.length
                        : 0
                    ).toFixed(1)}%`,
                    color:
                      avgRate >= 30
                        ? "#10b981"
                        : avgRate >= 20
                        ? "#2563eb"
                        : "#ef4444",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-white p-6"
                    style={{
                      borderRadius: 16,
                      boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      {kpi.label}
                    </div>
                    <div
                      className="mt-2"
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: "-0.04em",
                        color: kpi.color,
                        lineHeight: 1.1,
                      }}
                    >
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer table */}
              <SectionTitle>取引先別比較</SectionTitle>
              <div
                className="mb-6"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {[
                          "取引先名",
                          "日報件数",
                          "売上合計",
                          "原価合計",
                          "粗利合計",
                          "粗利率",
                          "判定",
                        ].map((h, i) => (
                          <th
                            key={h}
                            style={thStyle(
                              i >= 1 && i <= 5
                                ? "right"
                                : i === 6
                                ? "center"
                                : "left"
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customerGroups.map((g, i) => {
                        const rColor =
                          g.rate >= 30
                            ? "text-[#0d9488]"
                            : g.rate >= 20
                            ? "text-[#1e40af]"
                            : "text-[#b91c1c]";
                        const isExpanded =
                          expandedCustomer === g.customer;
                        const childSites = isExpanded
                          ? filtered.filter(
                              (s) => s.customer === g.customer
                            )
                          : [];
                        return (
                          <tr key={g.customer} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <table className="w-full border-collapse">
                                <tbody>
                                  <tr
                                    onClick={() =>
                                      setExpandedCustomer(
                                        isExpanded ? null : g.customer
                                      )
                                    }
                                    className="cursor-pointer"
                                    style={{
                                      background: isExpanded
                                        ? "#f0fdfa"
                                        : i % 2 === 0
                                        ? "#fff"
                                        : "#f8fafc",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isExpanded)
                                        e.currentTarget.style.background =
                                          "#f0fdfa";
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isExpanded)
                                        e.currentTarget.style.background =
                                          i % 2 === 0
                                            ? "#fff"
                                            : "#f8fafc";
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "11px 14px",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#0f172a",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-block",
                                          width: 16,
                                          fontSize: 10,
                                          color: "#94a3b8",
                                          transition: "transform 0.2s",
                                          transform: isExpanded
                                            ? "rotate(90deg)"
                                            : "none",
                                        }}
                                      >
                                        &#9654;
                                      </span>
                                      {g.customer}
                                    </td>
                                    <td
                                      style={{
                                        padding: "11px 14px",
                                        fontSize: 13,
                                        textAlign: "right",
                                        color: "#64748b",
                                      }}
                                    >
                                      {g.count}
                                    </td>
                                    <td style={tdNum}>{fmtVal(g.sales)}</td>
                                    <td style={tdNum}>{fmtVal(g.cost)}</td>
                                    <td
                                      style={{
                                        ...tdNum,
                                        fontWeight: 700,
                                        color:
                                          g.profit >= 0
                                            ? "#0d9488"
                                            : "#dc2626",
                                      }}
                                    >
                                      {g.profit < 0 ? "-" : ""}
                                      {fmtVal(Math.abs(g.profit))}
                                    </td>
                                    <td
                                      style={{
                                        padding: "11px 14px",
                                        fontSize: 13,
                                        textAlign: "right",
                                      }}
                                    >
                                      <span
                                        className={`font-bold ${rColor}`}
                                        style={{
                                          fontVariantNumeric:
                                            "tabular-nums",
                                        }}
                                      >
                                        {g.rate.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td
                                      style={{
                                        padding: "11px 14px",
                                        textAlign: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          justifyContent: "center",
                                          minWidth: 44,
                                          borderRadius: 20,
                                          padding: "3px 10px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background:
                                            g.rate >= 30
                                              ? "#ccfbf1"
                                              : g.rate >= 20
                                              ? "#dbeafe"
                                              : "#fee2e2",
                                          color:
                                            g.rate >= 30
                                              ? "#0d9488"
                                              : g.rate >= 20
                                              ? "#1e40af"
                                              : "#b91c1c",
                                        }}
                                      >
                                        {g.rate >= 30
                                          ? "優良"
                                          : g.rate >= 20
                                          ? "標準"
                                          : "要改善"}
                                      </span>
                                    </td>
                                  </tr>
                                  {isExpanded &&
                                    childSites.map((site) => (
                                      <tr
                                        key={site.site}
                                        style={{
                                          background: "#f8fafc",
                                          borderBottom:
                                            "1px solid #f1f5f9",
                                          borderLeft:
                                            "4px solid #14b8a6",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding:
                                              "8px 14px 8px 30px",
                                            fontSize: 12,
                                            color: "#0f172a",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {site.site}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 14px",
                                            fontSize: 12,
                                            textAlign: "right",
                                            color: "#64748b",
                                          }}
                                        >
                                          {site.count}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 14px",
                                            fontSize: 12,
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: "#0f172a",
                                            fontVariantNumeric:
                                              "tabular-nums",
                                          }}
                                        >
                                          {fmtVal(site.sales)}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 14px",
                                            fontSize: 12,
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: "#0f172a",
                                            fontVariantNumeric:
                                              "tabular-nums",
                                          }}
                                        >
                                          {fmtVal(site.cost)}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 14px",
                                            fontSize: 12,
                                            textAlign: "right",
                                            fontWeight: 700,
                                            fontVariantNumeric:
                                              "tabular-nums",
                                            color:
                                              site.profit >= 0
                                                ? "#0d9488"
                                                : "#dc2626",
                                          }}
                                        >
                                          {site.profit < 0 ? "-" : ""}
                                          {fmtVal(
                                            Math.abs(site.profit)
                                          )}
                                        </td>
                                        <td
                                          style={{
                                            padding: "8px 14px",
                                            fontSize: 12,
                                            textAlign: "right",
                                            fontVariantNumeric:
                                              "tabular-nums",
                                            fontWeight: 700,
                                            color:
                                              site.rate >= 30
                                                ? "#065f46"
                                                : site.rate >= 20
                                                ? "#92400e"
                                                : "#991b1b",
                                          }}
                                        >
                                          {site.rate.toFixed(1)}%
                                        </td>
                                        <td />
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer bar chart */}
              <SectionTitle>取引先別売上・粗利</SectionTitle>
              <div
                className="bg-white mb-6"
                style={{
                  borderRadius: 16,
                  boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 16,
                    fontSize: 13,
                    color: "#334155",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#1e3a5f",
                        display: "inline-block",
                      }}
                    />
                    売上
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#14b8a6",
                        display: "inline-block",
                      }}
                    />
                    粗利
                  </span>
                </div>
                {custChartData.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={custChartData.data}
                      margin={{ top: 8, right: 20, bottom: 30, left: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 13, fill: "#64748b" }}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 13, fill: "#64748b" }}
                        tickFormatter={(v: number) =>
                          v.toLocaleString() + custChartData.unit
                        }
                      />
                      <Tooltip
                        formatter={(v) =>
                          `${Number(v).toLocaleString()}${custChartData.unit}`
                        }
                      />
                      <Bar
                        dataKey="売上"
                        fill="#1e3a5f"
                        barSize={24}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="粗利"
                        fill="#14b8a6"
                        barSize={24}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-[#94a3b8] text-[13px]">
                    データなし
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ SITE TAB ═══ */}
          {viewTab === "site" && (
            <>
              <SectionTitle>現場一覧</SectionTitle>
              <div
                className="mb-6"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {[
                          "現場名",
                          "顧客先",
                          "売上",
                          "原価合計",
                          "粗利",
                          "粗利率",
                          "件数",
                        ].map((h, i) => (
                          <th
                            key={h}
                            style={thStyle(
                              i >= 2 && i <= 5
                                ? "right"
                                : i === 6
                                ? "right"
                                : "left"
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr
                          key={r.site}
                          onClick={() =>
                            setSelectedSiteId(
                              selectedSiteId === r.site
                                ? null
                                : r.site
                            )
                          }
                          className="cursor-pointer"
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background:
                              selectedSiteId === r.site
                                ? "#f0fdfa"
                                : i % 2 === 0
                                ? "#fff"
                                : "#f8fafc",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedSiteId !== r.site)
                              e.currentTarget.style.background = "#f0fdfa";
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSiteId !== r.site)
                              e.currentTarget.style.background =
                                i % 2 === 0 ? "#fff" : "#f8fafc";
                          }}
                        >
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#0f172a",
                              fontWeight: 600,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.site}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {r.customer}
                          </td>
                          <td style={tdNum}>{fmtVal(r.sales)}</td>
                          <td style={tdNum}>{fmtVal(r.cost)}</td>
                          <td
                            style={{
                              ...tdNum,
                              fontWeight: 700,
                              color:
                                r.profit >= 0 ? "#0d9488" : "#dc2626",
                            }}
                          >
                            {r.profit < 0 ? "-" : ""}
                            {fmtVal(Math.abs(r.profit))}
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, textAlign: "right" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                justifyContent: "center",
                                minWidth: 52,
                                borderRadius: 20,
                                padding: "3px 10px",
                                fontSize: 11.5,
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                background:
                                  r.rate >= 30
                                    ? "#ccfbf1"
                                    : r.rate >= 20
                                    ? "#dbeafe"
                                    : "#fee2e2",
                                color:
                                  r.rate >= 30
                                    ? "#0f766e"
                                    : r.rate >= 20
                                    ? "#1e40af"
                                    : "#b91c1c",
                              }}
                            >
                              {r.rate.toFixed(1)}%
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              textAlign: "right",
                              color: "#64748b",
                            }}
                          >
                            {r.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Site Detail Panel */}
              {selectedSiteId &&
                (() => {
                  const site = filtered.find(
                    (r) => r.site === selectedSiteId
                  );
                  if (!site) return null;
                  return (
                    <div
                      className="mb-6"
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        boxShadow: "0 4px 24px rgba(12,27,51,0.08)",
                        border: "2px solid #14b8a6",
                        padding: 24,
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#14b8a6",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            現場詳細
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#0f172a",
                              marginTop: 4,
                            }}
                          >
                            {site.site}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSiteId(null)}
                          className="cursor-pointer text-slate-400 hover:text-slate-600 text-lg"
                        >
                          &times;
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              fontWeight: 600,
                            }}
                          >
                            顧客先
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#0f172a",
                              marginTop: 2,
                            }}
                          >
                            {site.customer}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              fontWeight: 600,
                            }}
                          >
                            日報件数
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#475569",
                              marginTop: 2,
                            }}
                          >
                            {site.count} 件
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          height: 1,
                          background: "#e2e8f0",
                          marginBottom: 16,
                        }}
                      />

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div
                          style={{
                            background:
                              site.profit >= 0 ? "#f0fdfa" : "#fef2f2",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                site.profit >= 0
                                  ? "#0d9488"
                                  : "#dc2626",
                              fontWeight: 700,
                            }}
                          >
                            粗利
                          </div>
                          <div
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              color:
                                site.profit >= 0
                                  ? "#0d9488"
                                  : "#dc2626",
                              marginTop: 4,
                            }}
                          >
                            {site.profit < 0 ? "-" : ""}
                            {fmtVal(Math.abs(site.profit))}
                          </div>
                        </div>
                        <div
                          style={{
                            background:
                              site.rate >= 30
                                ? "#f0fdfa"
                                : site.rate >= 20
                                ? "#eff6ff"
                                : "#fef2f2",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                site.rate >= 30
                                  ? "#0d9488"
                                  : site.rate >= 20
                                  ? "#1e40af"
                                  : "#dc2626",
                              fontWeight: 700,
                            }}
                          >
                            粗利率
                          </div>
                          <div
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              color:
                                site.rate >= 30
                                  ? "#0d9488"
                                  : site.rate >= 20
                                  ? "#1e40af"
                                  : "#dc2626",
                              marginTop: 4,
                            }}
                          >
                            {site.rate.toFixed(1)}%
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              fontWeight: 700,
                            }}
                          >
                            判定
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#0f172a",
                              marginTop: 4,
                            }}
                          >
                            {site.alertLevel}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {site.alertReason}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#e8edf3] p-16 text-center">
          <div className="text-[#94a3b8] text-[14px] mb-2">
            データがありません
          </div>
          <div className="text-[#94a3b8] text-[12px]">
            日報を入力すると、ここに粗利ダッシュボードが表示されます
          </div>
        </div>
      )}
    </div>
  );
}
