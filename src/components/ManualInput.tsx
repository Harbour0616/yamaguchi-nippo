import { useCallback, useMemo, useState } from "react";
import type { DailyRecord, SalesRow, CostRow, WorkType } from "../types/journal";
import {
  createEmptyDailyRecord,
  calcSalesTotal,
  calcCostPaidSalary,
} from "../types/journal";
import { loadCustomers, RATE_LABELS, type CustomerRates } from "../data/customers";
import { loadSites, type Site } from "../data/sites";
import { loadStaff } from "../data/staff";
import { loadSavedRecords, saveDailyRecords, removeSavedRecord, updateSavedRecord } from "../data/dailyRecords";
import { calcTotalSales } from "../utils/calcSales";

const TASK_OPTIONS = RATE_LABELS.map((r) => r.label);
const taskToRateKey = new Map<string, keyof CustomerRates>(
  RATE_LABELS.map((r) => [r.label, r.key])
);

interface Props {
  records: DailyRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
}

export default function ManualInput({ records, setRecords }: Props) {
  const customers = useMemo(() => loadCustomers(), []);
  const sites = useMemo(() => loadSites(), []);
  const staffList = useMemo(() => loadStaff(), []);
  const [savedRecords, setSavedRecords] = useState<DailyRecord[]>(loadSavedRecords);

  // --- Update helpers ---

  /** 自社受・出来高時に現場の請求金額を売上totalAmountにセット */
  const applySiteBilling = useCallback(
    (rec: DailyRecord, siteName: string): DailyRecord => {
      if (rec.type !== "自社受" && rec.type !== "出来高") return rec;
      const matched = sites.find((s) => s.name === siteName);
      const amount = matched?.billingAmount ? Number(matched.billingAmount) : 0;
      const sales = { ...rec.sales, totalAmount: amount > 0 ? amount : ("" as number | ""), isManualTotal: amount > 0 };
      return { ...rec, sales };
    },
    [sites]
  );

  const updateField = useCallback(
    (id: string, field: keyof DailyRecord, value: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          let updated = { ...r, [field]: value };
          if (field === "type") {
            updated.cost = {
              ...updated.cost,
              creditAccount:
                value === "出来高" ? "外注費未払金（仮）" : "未払費用",
            };
            if ((value === "自社受" || value === "出来高") && updated.site) {
              updated = applySiteBilling(updated, updated.site);
            }
          }
          return updated;
        })
      );
    },
    [applySiteBilling]
  );

  const updateSales = useCallback(
    (id: string, field: keyof SalesRow, value: string | number | boolean) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const sales = { ...r.sales, [field]: value };
          if (field === "totalAmount") {
            sales.isManualTotal = true;
          } else if (
            !sales.isManualTotal &&
            ["unitPrice", "headcount", "overtimePay", "allowance", "transport"].includes(field as string)
          ) {
            const total = calcSalesTotal(sales);
            sales.totalAmount = total > 0 ? total : "";
          }
          return { ...r, sales };
        })
      );
    },
    []
  );

  const updateCost = useCallback(
    (id: string, field: keyof CostRow, value: string | number | boolean) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const cost = { ...r.cost, [field]: value };
          if (field === "paidSalary") {
            cost.isManualPaidSalary = true;
          } else if (
            !cost.isManualPaidSalary &&
            ["basicWage", "overtimePay", "allowance", "transport"].includes(field as string)
          ) {
            const paid = calcCostPaidSalary(cost);
            cost.paidSalary = paid > 0 ? paid : "";
          }
          return { ...r, cost };
        })
      );
    },
    []
  );

  /** 顧客名＋業務名から単価を適用（unitPrice未入力時のみ、自社受・出来高は除外） */
  const applyRate = useCallback(
    (rec: DailyRecord, customerName: string, task: string): DailyRecord => {
      if (rec.type === "自社受" || rec.type === "出来高") return rec;
      const rateKey = taskToRateKey.get(task);
      if (!rateKey || !customerName) return rec;
      const cust = customers.find((c) => c.name === customerName);
      const rate = cust?.rates?.[rateKey];
      if (rate === undefined || rate === "" || rec.sales.unitPrice) return rec;
      const sales = { ...rec.sales, unitPrice: Number(rate) };
      if (!sales.isManualTotal) {
        const total = calcSalesTotal(sales);
        sales.totalAmount = total > 0 ? total : "";
      }
      return { ...rec, sales };
    },
    [customers]
  );

  const handleTaskChange = useCallback(
    (id: string, task: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, task };
          return applyRate(updated, r.customer, task);
        })
      );
    },
    [applyRate]
  );

  const handleCustomerChange = useCallback(
    (id: string, customer: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, customer };
          return applyRate(updated, customer, r.task);
        })
      );
    },
    [applyRate]
  );

  const handleStaffChange = useCallback(
    (id: string, staffName: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          let updated = { ...r, staff: staffName };
          const matched = staffList.find((s) => s.name === staffName);
          if (matched?.unitPrice) {
            const cost = { ...updated.cost, basicWage: Number(matched.unitPrice) };
            if (!cost.isManualPaidSalary) {
              const paid = calcCostPaidSalary(cost);
              cost.paidSalary = paid > 0 ? paid : "";
            }
            updated = { ...updated, cost };
          }
          return updated;
        })
      );
    },
    [staffList]
  );

  const handleSiteChange = useCallback(
    (id: string, siteName: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          let updated = { ...r, site: siteName };
          const matched = sites.find((s) => s.name === siteName);
          if (matched?.customer_name) {
            updated = { ...updated, customer: matched.customer_name };
            updated = applyRate(updated, matched.customer_name, r.task);
          }
          updated = applySiteBilling(updated, siteName);
          return updated;
        })
      );
    },
    [sites, applyRate, applySiteBilling]
  );

  const resetRecord = useCallback((id: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const fresh = createEmptyDailyRecord();
        return { ...fresh, id: r.id };
      })
    );
  }, []);

  const handleSaveRecords = useCallback(() => {
    const valid = records.filter((r) => r.date && r.staff);
    if (valid.length === 0) return;
    const updated = saveDailyRecords(valid);
    setSavedRecords(updated);
    setRecords([createEmptyDailyRecord()]);
  }, [records, setRecords]);

  const handleDeleteSaved = useCallback((id: string) => {
    setSavedRecords(removeSavedRecord(id));
  }, []);

  const handleUpdateSaved = useCallback((rec: DailyRecord) => {
    setSavedRecords(updateSavedRecord(rec));
  }, []);



  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const numCls = `${inputCls} font-mono text-right`;

  const numChange = <F extends string>(cb: (id: string, field: F, val: number | "") => void, id: string, field: F) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      cb(id, field, e.target.value === "" ? "" : Number(e.target.value));

  return (
    <div>
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-debit rounded-full inline-block"></span>
          日報入力（売上＋原価）
        </h2>

        {/* Cards */}
        <div className="space-y-3 mb-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white border border-border rounded-lg shadow-sm overflow-hidden"
            >
              {/* ===== 上段：共通フィールド ===== */}
              <div className="bg-[#f8fafc] px-3 py-2 overflow-x-auto border-b border-border">
                <div className="flex items-center gap-2 w-max">
                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    稼働日
                    <input
                      type="date"
                      value={rec.date}
                      onChange={(e) => updateField(rec.id, "date", e.target.value)}
                      className={`${inputCls} min-w-[140px]`}
                    />
                  </label>

                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    形態
                    <select
                      value={rec.type}
                      onChange={(e) => updateField(rec.id, "type", e.target.value as WorkType)}
                      className="bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent min-w-[80px]"
                    >
                      <option value="">選択</option>
                      <option value="自社受">自社受</option>
                      <option value="出来高">出来高</option>
                      <option value="常用">常用</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    業務
                    <select
                      value={rec.task}
                      onChange={(e) => handleTaskChange(rec.id, e.target.value)}
                      className={`${inputCls} min-w-[120px]`}
                    >
                      <option value="">選択</option>
                      {TASK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    顧客先
                    <select
                      value={rec.customer}
                      onChange={(e) => handleCustomerChange(rec.id, e.target.value)}
                      className={`${inputCls} min-w-[120px]`}
                    >
                      <option value="">選択</option>
                      {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>

                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    現場
                    <select
                      value={rec.site}
                      onChange={(e) => handleSiteChange(rec.id, e.target.value)}
                      className={`${inputCls} min-w-[140px]`}
                    >
                      <option value="">選択</option>
                      {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </label>

                  <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                    スタッフ
                    <select
                      value={rec.staff}
                      onChange={(e) => handleStaffChange(rec.id, e.target.value)}
                      className={`${inputCls} min-w-[120px]`}
                    >
                      <option value="">選択</option>
                      {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </label>

                  <button
                    onClick={() => resetRecord(rec.id)}
                    className="shrink-0 px-3 py-1 rounded bg-surface border border-border text-muted text-xs whitespace-nowrap hover:bg-[rgba(0,0,0,0.03)] hover:text-text transition"
                  >
                    リセット
                  </button>
                </div>
              </div>

              {/* ===== 下段：売上 + 原価 + 日次サマリー 横並び ===== */}
              <div className="flex">
                {/* 売上 */}
                <div className="flex-1 bg-[#eff6ff] p-3 border-r border-border">
                  <div className="text-xs font-bold text-blue-600 mb-2">【売上】</div>
                  {(() => { const isUke = rec.type === "自社受" || rec.type === "出来高"; const disabledCls = isUke ? `${numCls} bg-gray-100 text-muted cursor-not-allowed` : numCls; return (
                  <div className="space-y-1.5">
                    <Field label="請求単価">
                      <input type="number" value={rec.sales.unitPrice} onChange={numChange(updateSales, rec.id, "unitPrice")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="人数">
                      <input type="number" value={rec.sales.headcount} onChange={numChange(updateSales, rec.id, "headcount")} className={disabledCls} placeholder="1" disabled={isUke} />
                    </Field>
                    <Field label="残業手当">
                      <input type="number" value={rec.sales.overtimePay} onChange={numChange(updateSales, rec.id, "overtimePay")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="手当支給額">
                      <input type="number" value={rec.sales.allowance} onChange={numChange(updateSales, rec.id, "allowance")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="請求交通費">
                      <input type="number" value={rec.sales.transport} onChange={numChange(updateSales, rec.id, "transport")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="請求金額（税抜）" highlight>
                      <input
                        type="number"
                        value={rec.sales.totalAmount}
                        onChange={numChange(updateSales, rec.id, "totalAmount")}
                        className={`${numCls} ${rec.sales.isManualTotal ? "ring-1 ring-amber-300" : ""}`}
                        placeholder="自動"
                      />
                    </Field>
                  </div>
                  ); })()}
                </div>

                {/* 原価 */}
                <div className="flex-1 bg-[#fff7ed] p-3 border-r border-border">
                  <div className="text-xs font-bold text-orange-600 mb-2">【原価】</div>
                  <div className="space-y-1.5">
                    <Field label="基本給">
                      <input type="number" value={rec.cost.basicWage} onChange={numChange(updateCost, rec.id, "basicWage")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="残業手当">
                      <input type="number" value={rec.cost.overtimePay} onChange={numChange(updateCost, rec.id, "overtimePay")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="各種手当">
                      <input type="number" value={rec.cost.allowance} onChange={numChange(updateCost, rec.id, "allowance")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="交通費">
                      <input type="number" value={rec.cost.transport} onChange={numChange(updateCost, rec.id, "transport")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="源泉徴収税額">
                      <input type="number" value={rec.cost.withholdingTax} onChange={numChange(updateCost, rec.id, "withholdingTax")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="支給給与" highlight>
                      <input
                        type="number"
                        value={rec.cost.paidSalary}
                        onChange={numChange(updateCost, rec.id, "paidSalary")}
                        className={`${numCls} ${rec.cost.isManualPaidSalary ? "ring-1 ring-amber-300" : ""}`}
                        placeholder="自動"
                      />
                    </Field>
                  </div>
                </div>

                {/* 日次サマリー */}
                <DailySummary savedRecords={savedRecords} inputCls={inputCls} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveRecords}
          disabled={!records.some((r) => r.date && r.staff)}
          className="mb-6 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          保存する
        </button>
      </section>

      {/* 登録済み一覧 */}
      <SavedRecordsList
        savedRecords={savedRecords}
        customers={customers}
        sites={sites}
        staffList={staffList}
        inputCls={inputCls}
        numCls={numCls}
        onDelete={handleDeleteSaved}
        onUpdate={handleUpdateSaved}
      />
    </div>
  );
}

/** 日次サマリーパネル */
function DailySummary({ savedRecords, inputCls }: { savedRecords: DailyRecord[]; inputCls: string }) {
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const summary = useMemo(() => {
    const dayRecords = savedRecords.filter((r) => r.date === summaryDate);
    if (dayRecords.length === 0) return null;
    const sales = dayRecords.reduce((s, r) => s + (Number(r.sales.totalAmount) || 0), 0);
    const cost = dayRecords.reduce((s, r) => s + (Number(r.cost.paidSalary) || 0), 0);
    const profit = sales - cost;
    const profitRate = sales > 0 ? (profit / sales) * 100 : 0;
    const siteSet = new Set<string>();
    const customerSet = new Set<string>();
    for (const r of dayRecords) {
      if (r.site) siteSet.add(r.site);
      if (r.customer) customerSet.add(r.customer);
    }
    return { count: dayRecords.length, sales, cost, profit, profitRate, sites: Array.from(siteSet), customers: Array.from(customerSet) };
  }, [savedRecords, summaryDate]);

  const fmt = (v: number) => `¥${v.toLocaleString()}`;

  return (
    <div className="flex-1 bg-[#f0fdf4] p-3">
      <div className="text-xs font-bold text-green-700 mb-2">【日次サマリー】</div>
      <input
        type="date"
        value={summaryDate}
        onChange={(e) => setSummaryDate(e.target.value)}
        className={`${inputCls} mb-3`}
      />
      {summary ? (
        <div className="space-y-2 text-sm">
          <div className="text-xs text-muted">{summary.count} 件</div>
          {summary.customers.length > 0 && (
            <div className="text-xs"><span className="text-muted">顧客: </span>{summary.customers.join(" ・ ")}</div>
          )}
          {summary.sites.length > 0 && (
            <div className="text-xs"><span className="text-muted">現場: </span>{summary.sites.join(" ・ ")}</div>
          )}
          <div className="flex justify-between">
            <span className="text-muted text-xs">売上合計</span>
            <span className="font-mono font-bold text-blue-600">{fmt(summary.sales)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted text-xs">原価合計</span>
            <span className="font-mono font-bold text-orange-600">{fmt(summary.cost)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-muted text-xs">粗利</span>
            <span className={`font-mono font-bold ${summary.profit >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(summary.profit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted text-xs">粗利率</span>
            <span className={`font-mono font-bold ${summary.profitRate >= 0 ? "text-green-600" : "text-red-500"}`}>{summary.profitRate.toFixed(1)}%</span>
          </div>
        </div>
      ) : (
        <div className="text-muted text-xs">-</div>
      )}
    </div>
  );
}

/** 登録済み一覧（フィルター＋合計付き＋ダブルクリック編集モーダル） */
function SavedRecordsList({
  savedRecords,
  customers,
  sites,
  staffList,
  inputCls,
  numCls,
  onDelete,
  onUpdate,
}: {
  savedRecords: DailyRecord[];
  customers: { id: string; name: string; rates?: import("../data/customers").CustomerRates }[];
  sites: Site[];
  staffList: { id: string; name: string; unitPrice: number | "" }[];
  inputCls: string;
  numCls: string;
  onDelete: (id: string) => void;
  onUpdate: (rec: DailyRecord) => void;
}) {
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [editDraft, setEditDraft] = useState<DailyRecord | null>(null);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of savedRecords) {
      if (r.date) set.add(r.date.slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [savedRecords]);

  const filtered = savedRecords.filter((r) => {
    if (filterMonth && (!r.date || !r.date.startsWith(filterMonth))) return false;
    if (filterCustomer && r.customer !== filterCustomer) return false;
    return true;
  });

  const totalSales = useMemo(() => calcTotalSales(filtered, sites), [filtered, sites]);
  const totalCost = filtered.reduce((s, r) => s + (Number(r.cost.paidSalary) || 0), 0);

  // --- Modal helpers ---
  const applyRateToRec = (rec: DailyRecord, customerName: string, task: string): DailyRecord => {
    if (rec.type === "自社受" || rec.type === "出来高") return rec;
    const rateKey = taskToRateKey.get(task);
    if (!rateKey || !customerName) return rec;
    const cust = customers.find((c) => c.name === customerName);
    const rate = cust?.rates?.[rateKey];
    if (rate === undefined || rate === "" || rec.sales.unitPrice) return rec;
    const sales = { ...rec.sales, unitPrice: Number(rate) };
    if (!sales.isManualTotal) {
      const total = calcSalesTotal(sales);
      sales.totalAmount = total > 0 ? total : "";
    }
    return { ...rec, sales };
  };

  const updateDraftField = (field: keyof DailyRecord, value: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      let updated = { ...prev, [field]: value };
      if (field === "type") {
        updated.cost = {
          ...updated.cost,
          creditAccount: value === "出来高" ? "外注費未払金（仮）" : "未払費用",
        };
        if ((value === "自社受" || value === "出来高") && updated.site) {
          updated = applyDraftSiteBilling(updated, updated.site);
        }
      }
      return updated;
    });
  };

  const updateDraftSales = (field: keyof SalesRow, value: number | "") => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const sales = { ...prev.sales, [field]: value };
      if (field === "totalAmount") {
        sales.isManualTotal = true;
      } else if (
        !sales.isManualTotal &&
        ["unitPrice", "headcount", "overtimePay", "allowance", "transport"].includes(field as string)
      ) {
        const total = calcSalesTotal(sales);
        sales.totalAmount = total > 0 ? total : "";
      }
      return { ...prev, sales };
    });
  };

  const updateDraftCost = (field: keyof CostRow, value: number | "") => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const cost = { ...prev.cost, [field]: value };
      if (field === "paidSalary") {
        cost.isManualPaidSalary = true;
      } else if (
        !cost.isManualPaidSalary &&
        ["basicWage", "overtimePay", "allowance", "transport"].includes(field as string)
      ) {
        const paid = calcCostPaidSalary(cost);
        cost.paidSalary = paid > 0 ? paid : "";
      }
      return { ...prev, cost };
    });
  };

  const handleDraftTaskChange = (task: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return applyRateToRec({ ...prev, task }, prev.customer, task);
    });
  };

  const handleDraftCustomerChange = (customer: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      return applyRateToRec({ ...prev, customer }, customer, prev.task);
    });
  };

  const handleDraftStaffChange = (staffName: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      let updated = { ...prev, staff: staffName };
      const matched = staffList.find((s) => s.name === staffName);
      if (matched?.unitPrice) {
        const cost = { ...updated.cost, basicWage: Number(matched.unitPrice) };
        if (!cost.isManualPaidSalary) {
          const paid = calcCostPaidSalary(cost);
          cost.paidSalary = paid > 0 ? paid : "";
        }
        updated = { ...updated, cost };
      }
      return updated;
    });
  };

  const applyDraftSiteBilling = (rec: DailyRecord, siteName: string): DailyRecord => {
    if (rec.type !== "自社受" && rec.type !== "出来高") return rec;
    const matched = sites.find((s) => s.name === siteName);
    const amount = matched?.billingAmount ? Number(matched.billingAmount) : 0;
    const sales = { ...rec.sales, totalAmount: amount > 0 ? amount : ("" as number | ""), isManualTotal: amount > 0 };
    return { ...rec, sales };
  };

  const handleDraftSiteChange = (siteName: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      let updated = { ...prev, site: siteName };
      const matched = sites.find((s) => s.name === siteName);
      if (matched?.customer_name) {
        updated = { ...updated, customer: matched.customer_name };
        updated = applyRateToRec(updated, matched.customer_name, prev.task);
      }
      updated = applyDraftSiteBilling(updated, siteName);
      return updated;
    });
  };

  const numChangeModal = (
    cb: (field: string, val: number | "") => void,
    field: string
  ) => (e: React.ChangeEvent<HTMLInputElement>) =>
    cb(field, e.target.value === "" ? "" : Number(e.target.value));

  const handleSaveModal = () => {
    if (!editDraft) return;
    onUpdate(editDraft);
    setEditDraft(null);
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
        登録済み一覧
      </h2>
      {savedRecords.length === 0 ? (
        <p className="text-muted text-sm py-2">保存済みの日報はありません。</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs text-muted">月:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent w-auto max-w-[160px]"
            >
              <option value="">すべて</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split("-");
                return <option key={ym} value={ym}>{y}年{Number(m)}月</option>;
              })}
            </select>
            <label className="text-xs text-muted">顧客先:</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent w-auto max-w-[200px]"
            >
              <option value="">すべて</option>
              {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-muted">{filtered.length} 件</span>
            <span>売上合計: <span className="font-mono font-bold">¥{totalSales.toLocaleString()}</span></span>
            <span>原価合計: <span className="font-mono font-bold">¥{totalCost.toLocaleString()}</span></span>
            <span>粗利合計: <span className={`font-mono font-bold ${totalSales - totalCost >= 0 ? "text-green-600" : "text-red-500"}`}>¥{(totalSales - totalCost).toLocaleString()}</span></span>
            <span>粗利率: <span className={`font-mono font-bold ${totalSales - totalCost >= 0 ? "text-green-600" : "text-red-500"}`}>{totalSales > 0 ? ((totalSales - totalCost) / totalSales * 100).toFixed(1) + "%" : "-"}</span></span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs whitespace-nowrap">
                  <th className="px-2 py-1.5">稼働日</th>
                  <th className="px-2 py-1.5">形態</th>
                  <th className="px-2 py-1.5">業務</th>
                  <th className="px-2 py-1.5">顧客先</th>
                  <th className="px-2 py-1.5">現場</th>
                  <th className="px-2 py-1.5">スタッフ</th>
                  <th className="px-2 py-1.5 text-right">請求単価</th>
                  <th className="px-2 py-1.5 text-right">人数</th>
                  <th className="px-2 py-1.5 text-right">残業手当</th>
                  <th className="px-2 py-1.5 text-right">手当支給額</th>
                  <th className="px-2 py-1.5 text-right">請求交通費</th>
                  <th className="px-2 py-1.5 text-right">請求金額</th>
                  <th className="px-2 py-1.5 text-right">基本給</th>
                  <th className="px-2 py-1.5 text-right">残業手当</th>
                  <th className="px-2 py-1.5 text-right">各種手当</th>
                  <th className="px-2 py-1.5 text-right">交通費</th>
                  <th className="px-2 py-1.5 text-right">源泉徴収</th>
                  <th className="px-2 py-1.5 text-right">支給給与</th>
                  <th className="px-2 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const fmt = (v: number | "") => (v && Number(v) ? Number(v).toLocaleString() : "-");
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)] cursor-pointer whitespace-nowrap"
                      onDoubleClick={() => setEditDraft({ ...r, sales: { ...r.sales }, cost: { ...r.cost } })}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs">{r.date || "-"}</td>
                      <td className="px-2 py-1.5 text-xs">{r.type || "-"}</td>
                      <td className="px-2 py-1.5 text-xs">{r.task || "-"}</td>
                      <td className="px-2 py-1.5 text-xs">{r.customer || "-"}</td>
                      <td className="px-2 py-1.5 text-xs">{r.site || "-"}</td>
                      <td className="px-2 py-1.5 text-xs">{r.staff || "-"}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.sales.unitPrice)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.sales.headcount)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.sales.overtimePay)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.sales.allowance)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.sales.transport)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-bold">{fmt(r.sales.totalAmount)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.cost.basicWage)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.cost.overtimePay)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.cost.allowance)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.cost.transport)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{fmt(r.cost.withholdingTax)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-bold">{fmt(r.cost.paidSalary)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => onDelete(r.id)}
                          className="text-muted hover:text-red-500 text-xs transition"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-muted text-xs mt-2">{savedRecords.length} 件保存済み ・ ダブルクリックで編集</p>
        </>
      )}

      {/* 編集モーダル */}
      {editDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditDraft(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold">日報編集</h3>
              <button onClick={() => setEditDraft(null)} className="text-muted hover:text-text text-xl leading-none">×</button>
            </div>

            <div className="p-6">
              {/* 共通フィールド */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <label className="flex items-center gap-1 text-xs text-muted">
                  稼働日
                  <input type="date" value={editDraft.date} onChange={(e) => updateDraftField("date", e.target.value)} className={`${inputCls} w-[140px]`} />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  形態
                  <select value={editDraft.type} onChange={(e) => updateDraftField("type", e.target.value)} className="bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent">
                    <option value="">選択</option>
                    <option value="自社受">自社受</option>
                    <option value="出来高">出来高</option>
                    <option value="常用">常用</option>
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  業務
                  <select value={editDraft.task} onChange={(e) => handleDraftTaskChange(e.target.value)} className={`${inputCls} w-[140px]`}>
                    <option value="">選択</option>
                    {TASK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  顧客先
                  <select value={editDraft.customer} onChange={(e) => handleDraftCustomerChange(e.target.value)} className={`${inputCls} w-[140px]`}>
                    <option value="">選択</option>
                    {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  現場
                  <select value={editDraft.site} onChange={(e) => handleDraftSiteChange(e.target.value)} className={`${inputCls} w-[160px]`}>
                    <option value="">選択</option>
                    {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  スタッフ
                  <select value={editDraft.staff} onChange={(e) => handleDraftStaffChange(e.target.value)} className={`${inputCls} w-[120px]`}>
                    <option value="">選択</option>
                    {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
              </div>

              {/* 売上 + 原価 横並び */}
              <div className="flex">
                {/* 売上 */}
                <div className="flex-1 bg-[#eff6ff] p-3 rounded-l-lg">
                  <div className="text-xs font-bold text-blue-600 mb-2">【売上】</div>
                  {(() => { const isUke = editDraft.type === "自社受" || editDraft.type === "出来高"; const disabledCls = isUke ? `${numCls} bg-gray-100 text-muted cursor-not-allowed` : numCls; return (
                  <div className="space-y-1.5">
                    <Field label="請求単価">
                      <input type="number" value={editDraft.sales.unitPrice} onChange={numChangeModal((_, v) => updateDraftSales("unitPrice", v), "unitPrice")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="人数">
                      <input type="number" value={editDraft.sales.headcount} onChange={numChangeModal((_, v) => updateDraftSales("headcount", v), "headcount")} className={disabledCls} placeholder="1" disabled={isUke} />
                    </Field>
                    <Field label="残業手当">
                      <input type="number" value={editDraft.sales.overtimePay} onChange={numChangeModal((_, v) => updateDraftSales("overtimePay", v), "overtimePay")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="手当支給額">
                      <input type="number" value={editDraft.sales.allowance} onChange={numChangeModal((_, v) => updateDraftSales("allowance", v), "allowance")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="請求交通費">
                      <input type="number" value={editDraft.sales.transport} onChange={numChangeModal((_, v) => updateDraftSales("transport", v), "transport")} className={disabledCls} placeholder="0" disabled={isUke} />
                    </Field>
                    <Field label="請求金額（税抜）" highlight>
                      <input
                        type="number"
                        value={editDraft.sales.totalAmount}
                        onChange={numChangeModal((_, v) => updateDraftSales("totalAmount", v), "totalAmount")}
                        className={`${numCls} ${editDraft.sales.isManualTotal ? "ring-1 ring-amber-300" : ""}`}
                        placeholder="自動"
                      />
                    </Field>
                  </div>
                  ); })()}
                </div>

                {/* 原価 */}
                <div className="flex-1 bg-[#fff7ed] p-3 rounded-r-lg">
                  <div className="text-xs font-bold text-orange-600 mb-2">【原価】</div>
                  <div className="space-y-1.5">
                    <Field label="基本給">
                      <input type="number" value={editDraft.cost.basicWage} onChange={numChangeModal((_, v) => updateDraftCost("basicWage", v), "basicWage")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="残業手当">
                      <input type="number" value={editDraft.cost.overtimePay} onChange={numChangeModal((_, v) => updateDraftCost("overtimePay", v), "overtimePay")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="各種手当">
                      <input type="number" value={editDraft.cost.allowance} onChange={numChangeModal((_, v) => updateDraftCost("allowance", v), "allowance")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="交通費">
                      <input type="number" value={editDraft.cost.transport} onChange={numChangeModal((_, v) => updateDraftCost("transport", v), "transport")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="源泉徴収税額">
                      <input type="number" value={editDraft.cost.withholdingTax} onChange={numChangeModal((_, v) => updateDraftCost("withholdingTax", v), "withholdingTax")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="支給給与" highlight>
                      <input
                        type="number"
                        value={editDraft.cost.paidSalary}
                        onChange={numChangeModal((_, v) => updateDraftCost("paidSalary", v), "paidSalary")}
                        className={`${numCls} ${editDraft.cost.isManualPaidSalary ? "ring-1 ring-amber-300" : ""}`}
                        placeholder="自動"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* フッターボタン */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditDraft(null)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text text-sm hover:bg-[rgba(0,0,0,0.03)] transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveModal}
                className="px-6 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** ラベル＋入力のペア */
function Field({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs shrink-0 w-[100px] text-right ${highlight ? "font-bold text-text" : "text-muted"}`}>
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
