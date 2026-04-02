import React, { useRef, useCallback, useMemo } from "react";
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
import JournalPreview from "./JournalPreview";

// Editable column counts per sub-row
const COMMON_COLS = 6; // date, staff, type, task, customer, site
const SALES_COLS = 6; // unitPrice, headcount, overtimePay, allowance, transport, totalAmount
const COST_COLS = 9; // basicWage, overtimePay, allowance, transport, mgmtFee, insurance, dormFee, withholdingTax, paidSalary

interface Props {
  records: DailyRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
}

export default function ManualInput({ records, setRecords }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const customers = useMemo(() => loadCustomers(), []);
  const sites = useMemo(() => loadSites(), []);
  const staffList = useMemo(() => loadStaff(), []);

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

  // --- Keyboard navigation ---
  const focusCell = useCallback((rec: number, sub: number, col: number) => {
    const el = tableRef.current?.querySelector(
      `[data-rec="${rec}"][data-sub="${sub}"][data-col="${col}"]`
    ) as HTMLElement;
    el?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, recIndex: number, sub: number, col: number) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      if (sub === 0) {
        // Common row
        if (col + 1 < COMMON_COLS) {
          focusCell(recIndex, 0, col + 1);
        } else {
          focusCell(recIndex, 1, 0);
        }
      } else if (sub === 1) {
        // Sales row
        if (col + 1 < SALES_COLS) {
          focusCell(recIndex, 1, col + 1);
        } else {
          focusCell(recIndex, 2, 0);
        }
      } else {
        // Cost row
        if (col + 1 < COST_COLS) {
          focusCell(recIndex, 2, col + 1);
        } else {
          const nextRec = recIndex + 1;
          if (nextRec >= records.length) addRecord();
          setTimeout(() => focusCell(nextRec, 0, 0), 0);
        }
      }
    },
    [records.length, addRecord, focusCell]
  );

  const journals = toJournalEntries(records);

  const inputCls =
    "w-full bg-transparent border border-border rounded px-1.5 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const selectCls =
    "w-full bg-transparent border border-border rounded px-1.5 py-1 text-sm text-text focus:outline-none focus:border-accent";
  const numCls = `${inputCls} font-mono text-right`;

  const salesBg = "bg-[#eff6ff]";
  const costBg = "bg-[#fff7ed]";
  const hdrCls = "p-1.5 border border-border text-xs text-muted font-medium";

  return (
    <div>
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-debit rounded-full inline-block"></span>
          日報入力（売上＋原価）
        </h2>

        <div className="overflow-x-auto mb-4">
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead>
              {/* Header row 1 — 共通 columns */}
              <tr className="bg-white">
                <th rowSpan={3} className={`${hdrCls} w-8`}></th>
                <th rowSpan={3} className={`${hdrCls} min-w-[120px]`}>稼働日</th>
                <th rowSpan={3} className={`${hdrCls} min-w-[100px]`}>スタッフ名</th>
                <th className={hdrCls}>形態</th>
                <th className={hdrCls}>業務</th>
                <th className={hdrCls}>顧客先</th>
                <th colSpan={7} className={hdrCls}>現場名</th>
              </tr>
              {/* Header row 2 — 売上 columns */}
              <tr className={salesBg}>
                <th className={`${hdrCls} ${salesBg} font-bold text-blue-700`}>売上</th>
                <th className={`${hdrCls} ${salesBg}`}>請求単価</th>
                <th className={`${hdrCls} ${salesBg}`}>人数</th>
                <th className={`${hdrCls} ${salesBg}`}>残業手当</th>
                <th className={`${hdrCls} ${salesBg}`}>手当支給額</th>
                <th className={`${hdrCls} ${salesBg}`}>請求交通費</th>
                <th colSpan={4} className={`${hdrCls} ${salesBg}`}>請求金額（税抜）</th>
              </tr>
              {/* Header row 3 — 原価 columns */}
              <tr className={costBg}>
                <th className={`${hdrCls} ${costBg} font-bold text-orange-700`}>原価</th>
                <th className={`${hdrCls} ${costBg}`}>基本給</th>
                <th className={`${hdrCls} ${costBg}`}>残業手当</th>
                <th className={`${hdrCls} ${costBg}`}>各種手当</th>
                <th className={`${hdrCls} ${costBg}`}>交通費</th>
                <th className={`${hdrCls} ${costBg}`}>管理費</th>
                <th className={`${hdrCls} ${costBg}`}>補償保険</th>
                <th className={`${hdrCls} ${costBg}`}>寮費</th>
                <th className={`${hdrCls} ${costBg}`}>源泉徴収税額</th>
                <th className={`${hdrCls} ${costBg}`}>支給給与</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, ri) => (
                <React.Fragment key={rec.id}>
                  {/* === Row 1: 共通 === */}
                  <tr className="border-t-2 border-border bg-white">
                    <td rowSpan={3} className="p-0.5 text-center align-top pt-3 bg-white border-r border-border">
                      <button
                        onClick={() => deleteRecord(rec.id)}
                        className="text-muted hover:text-red-400 text-lg leading-none"
                        title="削除"
                      >
                        ×
                      </button>
                    </td>
                    <td rowSpan={3} className="p-0.5 align-top bg-white border-r border-border">
                      <input
                        type="date"
                        data-rec={ri} data-sub={0} data-col={0}
                        value={rec.date}
                        onChange={(e) => updateField(rec.id, "date", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 0)}
                        className={inputCls}
                      />
                    </td>
                    <td rowSpan={3} className="p-0.5 align-top bg-white border-r border-border">
                      <input
                        type="text" list="staff-list"
                        data-rec={ri} data-sub={0} data-col={1}
                        value={rec.staff}
                        onChange={(e) => updateField(rec.id, "staff", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 1)}
                        className={inputCls}
                        placeholder="スタッフ"
                      />
                    </td>
                    <td className="p-0.5">
                      <select
                        data-rec={ri} data-sub={0} data-col={2}
                        value={rec.type}
                        onChange={(e) => updateField(rec.id, "type", e.target.value as WorkType)}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 2)}
                        className={selectCls}
                      >
                        <option value="自社受">自社受</option>
                        <option value="出来高">出来高</option>
                        <option value="常用">常用</option>
                      </select>
                    </td>
                    <td className="p-0.5">
                      <input
                        type="text"
                        data-rec={ri} data-sub={0} data-col={3}
                        value={rec.task}
                        onChange={(e) => updateField(rec.id, "task", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 3)}
                        className={inputCls}
                        placeholder="業務"
                      />
                    </td>
                    <td className="p-0.5">
                      <input
                        type="text" list="customer-list"
                        data-rec={ri} data-sub={0} data-col={4}
                        value={rec.customer}
                        onChange={(e) => updateField(rec.id, "customer", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 4)}
                        className={inputCls}
                        placeholder="顧客先"
                      />
                    </td>
                    <td colSpan={7} className="p-0.5">
                      <input
                        type="text" list="site-list"
                        data-rec={ri} data-sub={0} data-col={5}
                        value={rec.site}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField(rec.id, "site", val);
                          const matched = sites.find((s) => s.name === val);
                          if (matched?.customer_name) {
                            updateField(rec.id, "customer", matched.customer_name);
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 5)}
                        className={inputCls}
                        placeholder="現場名"
                      />
                    </td>
                  </tr>

                  {/* === Row 2: 売上 === */}
                  <tr className={salesBg}>
                    <td className={`p-0.5 ${salesBg} text-center`}>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-blue-700">売上</span>
                    </td>
                    <td className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={0}
                        value={rec.sales.unitPrice}
                        onChange={(e) => updateSales(rec.id, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 0)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={1}
                        value={rec.sales.headcount}
                        onChange={(e) => updateSales(rec.id, "headcount", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 1)}
                        className={numCls} placeholder="1"
                      />
                    </td>
                    <td className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={2}
                        value={rec.sales.overtimePay}
                        onChange={(e) => updateSales(rec.id, "overtimePay", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 2)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={3}
                        value={rec.sales.allowance}
                        onChange={(e) => updateSales(rec.id, "allowance", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 3)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={4}
                        value={rec.sales.transport}
                        onChange={(e) => updateSales(rec.id, "transport", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 4)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td colSpan={4} className={`p-0.5 ${salesBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={1} data-col={5}
                        value={rec.sales.totalAmount}
                        onChange={(e) => updateSales(rec.id, "totalAmount", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 5)}
                        className={`${numCls} ${rec.sales.isManualTotal ? "ring-1 ring-warn/30" : ""}`}
                        placeholder="自動"
                      />
                    </td>
                  </tr>

                  {/* === Row 3: 原価 === */}
                  <tr className={`${costBg} border-b border-border`}>
                    <td className={`p-0.5 ${costBg} text-center`}>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-orange-700">原価</span>
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={0}
                        value={rec.cost.basicWage}
                        onChange={(e) => updateCost(rec.id, "basicWage", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 0)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={1}
                        value={rec.cost.overtimePay}
                        onChange={(e) => updateCost(rec.id, "overtimePay", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 1)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={2}
                        value={rec.cost.allowance}
                        onChange={(e) => updateCost(rec.id, "allowance", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 2)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={3}
                        value={rec.cost.transport}
                        onChange={(e) => updateCost(rec.id, "transport", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 3)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={4}
                        value={rec.cost.mgmtFee}
                        onChange={(e) => updateCost(rec.id, "mgmtFee", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 4)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={5}
                        value={rec.cost.insurance}
                        onChange={(e) => updateCost(rec.id, "insurance", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 5)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={6}
                        value={rec.cost.dormFee}
                        onChange={(e) => updateCost(rec.id, "dormFee", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 6)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={7}
                        value={rec.cost.withholdingTax}
                        onChange={(e) => updateCost(rec.id, "withholdingTax", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 7)}
                        className={numCls} placeholder="0"
                      />
                    </td>
                    <td className={`p-0.5 ${costBg}`}>
                      <input type="number"
                        data-rec={ri} data-sub={2} data-col={8}
                        value={rec.cost.paidSalary}
                        onChange={(e) => updateCost(rec.id, "paidSalary", e.target.value === "" ? "" : Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, ri, 2, 8)}
                        className={`${numCls} ${rec.cost.isManualPaidSalary ? "ring-1 ring-warn/30" : ""}`}
                        placeholder="自動"
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <datalist id="customer-list">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <datalist id="site-list">
            {sites.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          <datalist id="staff-list">
            {staffList.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </div>

        <button
          onClick={addRecord}
          className="mb-6 px-4 py-2 rounded-lg bg-surface border border-border text-accent hover:bg-accent/10 transition text-sm"
        >
          + レコードを追加
        </button>

        <div className="border-t border-border pt-6 mt-6">
          <JournalPreview entries={journals} />
        </div>
      </section>
    </div>
  );
}
