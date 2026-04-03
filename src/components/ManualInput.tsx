import { useCallback, useMemo, useState } from "react";
import type { DailyRecord, SalesRow, CostRow, WorkType } from "../types/journal";
import {
  createEmptyDailyRecord,
  calcSalesTotal,
  calcCostPaidSalary,
} from "../types/journal";
import { toJournalEntries } from "../utils/toJournal";
import { loadCustomers } from "../data/customers";
import { loadSites } from "../data/sites";
import { loadStaff } from "../data/staff";
import { loadSavedRecords, saveDailyRecords, removeSavedRecord } from "../data/dailyRecords";
import JournalPreview from "./JournalPreview";

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

  const updateField = useCallback(
    (id: string, field: keyof DailyRecord, value: string) => {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, [field]: value };
          if (field === "type") {
            updated.cost = {
              ...updated.cost,
              creditAccount:
                value === "出来高" ? "外注費未払金（仮）" : "未払費用",
            };
          }
          return updated;
        })
      );
    },
    []
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

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => {
      if (prev.length <= 1) return [createEmptyDailyRecord()];
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const addRecord = useCallback(() => {
    setRecords((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        createEmptyDailyRecord({
          date: last?.date || "",
          type: last?.type || "自社受",
          task: last?.task || "",
          customer: last?.customer || "",
          site: last?.site || "",
        }),
      ];
    });
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

  const journals = toJournalEntries(records);

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
              <div className="bg-[#f8fafc] px-3 py-2 flex flex-wrap items-center gap-2 border-b border-border">
                <button
                  onClick={() => deleteRecord(rec.id)}
                  className="text-muted hover:text-red-500 text-lg leading-none px-1"
                  title="削除"
                >×</button>

                <label className="flex items-center gap-1 text-xs text-muted">
                  稼働日
                  <input
                    type="date"
                    value={rec.date}
                    onChange={(e) => updateField(rec.id, "date", e.target.value)}
                    className={`${inputCls} w-[140px]`}
                  />
                </label>

                <label className="flex items-center gap-1 text-xs text-muted">
                  スタッフ
                  <select
                    value={rec.staff}
                    onChange={(e) => updateField(rec.id, "staff", e.target.value)}
                    className={`${inputCls} w-[120px]`}
                  >
                    <option value="">選択</option>
                    {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>

                <label className="flex items-center gap-1 text-xs text-muted">
                  形態
                  <select
                    value={rec.type}
                    onChange={(e) => updateField(rec.id, "type", e.target.value as WorkType)}
                    className="bg-white border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent"
                  >
                    <option value="自社受">自社受</option>
                    <option value="出来高">出来高</option>
                    <option value="常用">常用</option>
                  </select>
                </label>

                <label className="flex items-center gap-1 text-xs text-muted">
                  業務
                  <input
                    type="text"
                    value={rec.task}
                    onChange={(e) => updateField(rec.id, "task", e.target.value)}
                    className={`${inputCls} w-[100px]`}
                    placeholder="業務"
                  />
                </label>

                <label className="flex items-center gap-1 text-xs text-muted">
                  顧客先
                  <select
                    value={rec.customer}
                    onChange={(e) => updateField(rec.id, "customer", e.target.value)}
                    className={`${inputCls} w-[140px]`}
                  >
                    <option value="">選択</option>
                    {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </label>

                <label className="flex items-center gap-1 text-xs text-muted">
                  現場
                  <select
                    value={rec.site}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField(rec.id, "site", val);
                      const matched = sites.find((s) => s.name === val);
                      if (matched?.customer_name) {
                        updateField(rec.id, "customer", matched.customer_name);
                      }
                    }}
                    className={`${inputCls} w-[160px]`}
                  >
                    <option value="">選択</option>
                    {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
              </div>

              {/* ===== 下段：売上 + 原価 横並び ===== */}
              <div className="flex">
                {/* 売上 */}
                <div className="flex-1 bg-[#eff6ff] p-3 border-r border-border">
                  <div className="text-xs font-bold text-blue-600 mb-2">【売上】</div>
                  <div className="space-y-1.5">
                    <Field label="請求単価">
                      <input type="number" value={rec.sales.unitPrice} onChange={numChange(updateSales, rec.id, "unitPrice")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="人数">
                      <input type="number" value={rec.sales.headcount} onChange={numChange(updateSales, rec.id, "headcount")} className={numCls} placeholder="1" />
                    </Field>
                    <Field label="残業手当">
                      <input type="number" value={rec.sales.overtimePay} onChange={numChange(updateSales, rec.id, "overtimePay")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="手当支給額">
                      <input type="number" value={rec.sales.allowance} onChange={numChange(updateSales, rec.id, "allowance")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="請求交通費">
                      <input type="number" value={rec.sales.transport} onChange={numChange(updateSales, rec.id, "transport")} className={numCls} placeholder="0" />
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
                </div>

                {/* 原価 */}
                <div className="flex-1 bg-[#fff7ed] p-3">
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
                    <Field label="管理費">
                      <input type="number" value={rec.cost.mgmtFee} onChange={numChange(updateCost, rec.id, "mgmtFee")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="補償保険">
                      <input type="number" value={rec.cost.insurance} onChange={numChange(updateCost, rec.id, "insurance")} className={numCls} placeholder="0" />
                    </Field>
                    <Field label="寮費">
                      <input type="number" value={rec.cost.dormFee} onChange={numChange(updateCost, rec.id, "dormFee")} className={numCls} placeholder="0" />
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
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={addRecord}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-accent hover:bg-accent/10 transition text-sm"
          >
            ＋ レコードを追加
          </button>
          <button
            onClick={handleSaveRecords}
            disabled={!records.some((r) => r.date && r.staff)}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存する
          </button>
        </div>

        <div className="border-t border-border pt-6 mt-6">
          <JournalPreview entries={journals} />
        </div>
      </section>

      {/* 入力済み一覧 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
          入力済み一覧
        </h2>
        {savedRecords.length === 0 ? (
          <p className="text-muted text-sm py-2">保存済みの日報はありません。</p>
        ) : (
          <>
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                  <th className="px-3 py-1.5">稼働日</th>
                  <th className="px-3 py-1.5">スタッフ</th>
                  <th className="px-3 py-1.5">顧客先</th>
                  <th className="px-3 py-1.5">現場</th>
                  <th className="px-3 py-1.5 text-right">売上金額</th>
                  <th className="px-3 py-1.5 text-right">原価金額</th>
                  <th className="px-3 py-1.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {savedRecords.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)]">
                    <td className="px-3 py-1.5 font-mono text-xs">{r.date || "-"}</td>
                    <td className="px-3 py-1.5">{r.staff || "-"}</td>
                    <td className="px-3 py-1.5 text-muted">{r.customer || "-"}</td>
                    <td className="px-3 py-1.5">{r.site || "-"}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {r.sales.totalAmount ? Number(r.sales.totalAmount).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {r.cost.paidSalary ? Number(r.cost.paidSalary).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleDeleteSaved(r.id)}
                        className="text-muted hover:text-red-500 text-xs transition"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted text-xs mt-2">{savedRecords.length} 件保存済み</p>
          </>
        )}
      </section>
    </div>
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
