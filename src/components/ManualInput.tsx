import { useRef, useCallback, useMemo } from "react";
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

// Total editable columns: 6 common + 6 sales + 9 cost = 21
const COL_COUNT = 21;

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
  const focusCell = useCallback((row: number, col: number) => {
    const el = tableRef.current?.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    ) as HTMLElement;
    el?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, col: number) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const nextCol = col + 1;
      if (nextCol < COL_COUNT) {
        focusCell(rowIndex, nextCol);
      } else {
        const nextRow = rowIndex + 1;
        if (nextRow >= records.length) addRecord();
        setTimeout(() => focusCell(nextRow, 0), 0);
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

  // Background classes for column groups
  const salesBg = "bg-[#eff6ff]";
  const costBg = "bg-[#fff7ed]";

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
              {/* Row 1: Group labels */}
              <tr className="text-xs text-center font-bold">
                <th colSpan={7} className="p-1.5 border border-border bg-white text-text">
                  共通
                </th>
                <th colSpan={6} className={`p-1.5 border border-border ${salesBg} text-blue-700`}>
                  売上
                </th>
                <th colSpan={9} className={`p-1.5 border border-border ${costBg} text-orange-700`}>
                  原価
                </th>
              </tr>
              {/* Row 2: Column names */}
              <tr className="border-b border-border text-muted text-left text-xs">
                {/* 共通 */}
                <th className="p-1.5 bg-white border border-border w-8"></th>
                <th className="p-1.5 bg-white border border-border min-w-[120px]">稼働日</th>
                <th className="p-1.5 bg-white border border-border min-w-[100px]">スタッフ名</th>
                <th className="p-1.5 bg-white border border-border min-w-[75px]">形態</th>
                <th className="p-1.5 bg-white border border-border min-w-[90px]">業務</th>
                <th className="p-1.5 bg-white border border-border min-w-[90px]">顧客先</th>
                <th className="p-1.5 bg-white border border-border min-w-[100px]">現場名</th>
                {/* 売上 */}
                <th className={`p-1.5 border border-border ${salesBg} min-w-[80px]`}>請求単価</th>
                <th className={`p-1.5 border border-border ${salesBg} min-w-[50px]`}>人数</th>
                <th className={`p-1.5 border border-border ${salesBg} min-w-[80px]`}>残業手当</th>
                <th className={`p-1.5 border border-border ${salesBg} min-w-[80px]`}>手当支給額</th>
                <th className={`p-1.5 border border-border ${salesBg} min-w-[80px]`}>請求交通費</th>
                <th className={`p-1.5 border border-border ${salesBg} min-w-[100px]`}>請求金額（税抜）</th>
                {/* 原価 */}
                <th className={`p-1.5 border border-border ${costBg} min-w-[80px]`}>基本給</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>残業手当</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>各種手当</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>交通費</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>管理費</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>補償保険</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[70px]`}>寮費</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[80px]`}>源泉徴収税額</th>
                <th className={`p-1.5 border border-border ${costBg} min-w-[80px]`}>支給給与</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, ri) => (
                <tr key={rec.id} className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.01)]">
                  {/* === 共通 === */}
                  <td className="p-0.5 bg-white text-center">
                    <button
                      onClick={() => deleteRecord(rec.id)}
                      className="text-muted hover:text-red-400 text-lg leading-none"
                      title="削除"
                    >
                      ×
                    </button>
                  </td>
                  <td className="p-0.5 bg-white">
                    <input
                      type="date"
                      data-row={ri} data-col={0}
                      value={rec.date}
                      onChange={(e) => updateField(rec.id, "date", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, ri, 0)}
                      className={inputCls}
                    />
                  </td>
                  <td className="p-0.5 bg-white">
                    <input
                      type="text" list="staff-list"
                      data-row={ri} data-col={1}
                      value={rec.staff}
                      onChange={(e) => updateField(rec.id, "staff", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, ri, 1)}
                      className={inputCls}
                      placeholder="スタッフ"
                    />
                  </td>
                  <td className="p-0.5 bg-white">
                    <select
                      data-row={ri} data-col={2}
                      value={rec.type}
                      onChange={(e) => updateField(rec.id, "type", e.target.value as WorkType)}
                      onKeyDown={(e) => handleKeyDown(e, ri, 2)}
                      className={selectCls}
                    >
                      <option value="自社受">自社受</option>
                      <option value="出来高">出来高</option>
                      <option value="常用">常用</option>
                    </select>
                  </td>
                  <td className="p-0.5 bg-white">
                    <input
                      type="text"
                      data-row={ri} data-col={3}
                      value={rec.task}
                      onChange={(e) => updateField(rec.id, "task", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, ri, 3)}
                      className={inputCls}
                      placeholder="業務"
                    />
                  </td>
                  <td className="p-0.5 bg-white">
                    <input
                      type="text" list="customer-list"
                      data-row={ri} data-col={4}
                      value={rec.customer}
                      onChange={(e) => updateField(rec.id, "customer", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, ri, 4)}
                      className={inputCls}
                      placeholder="顧客先"
                    />
                  </td>
                  <td className="p-0.5 bg-white">
                    <input
                      type="text" list="site-list"
                      data-row={ri} data-col={5}
                      value={rec.site}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateField(rec.id, "site", val);
                        const matched = sites.find((s) => s.name === val);
                        if (matched?.customer_name) {
                          updateField(rec.id, "customer", matched.customer_name);
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, ri, 5)}
                      className={inputCls}
                      placeholder="現場名"
                    />
                  </td>

                  {/* === 売上 === */}
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={6}
                      value={rec.sales.unitPrice}
                      onChange={(e) => updateSales(rec.id, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 6)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={7}
                      value={rec.sales.headcount}
                      onChange={(e) => updateSales(rec.id, "headcount", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 7)}
                      className={numCls} placeholder="1"
                    />
                  </td>
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={8}
                      value={rec.sales.overtimePay}
                      onChange={(e) => updateSales(rec.id, "overtimePay", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 8)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={9}
                      value={rec.sales.allowance}
                      onChange={(e) => updateSales(rec.id, "allowance", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 9)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={10}
                      value={rec.sales.transport}
                      onChange={(e) => updateSales(rec.id, "transport", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 10)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${salesBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={11}
                      value={rec.sales.totalAmount}
                      onChange={(e) => updateSales(rec.id, "totalAmount", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 11)}
                      className={`${numCls} ${rec.sales.isManualTotal ? "ring-1 ring-warn/30" : ""}`}
                      placeholder="自動"
                    />
                  </td>

                  {/* === 原価 === */}
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={12}
                      value={rec.cost.basicWage}
                      onChange={(e) => updateCost(rec.id, "basicWage", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 12)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={13}
                      value={rec.cost.overtimePay}
                      onChange={(e) => updateCost(rec.id, "overtimePay", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 13)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={14}
                      value={rec.cost.allowance}
                      onChange={(e) => updateCost(rec.id, "allowance", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 14)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={15}
                      value={rec.cost.transport}
                      onChange={(e) => updateCost(rec.id, "transport", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 15)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={16}
                      value={rec.cost.mgmtFee}
                      onChange={(e) => updateCost(rec.id, "mgmtFee", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 16)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={17}
                      value={rec.cost.insurance}
                      onChange={(e) => updateCost(rec.id, "insurance", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 17)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={18}
                      value={rec.cost.dormFee}
                      onChange={(e) => updateCost(rec.id, "dormFee", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 18)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={19}
                      value={rec.cost.withholdingTax}
                      onChange={(e) => updateCost(rec.id, "withholdingTax", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 19)}
                      className={numCls} placeholder="0"
                    />
                  </td>
                  <td className={`p-0.5 ${costBg}`}>
                    <input
                      type="number"
                      data-row={ri} data-col={20}
                      value={rec.cost.paidSalary}
                      onChange={(e) => updateCost(rec.id, "paidSalary", e.target.value === "" ? "" : Number(e.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, ri, 20)}
                      className={`${numCls} ${rec.cost.isManualPaidSalary ? "ring-1 ring-warn/30" : ""}`}
                      placeholder="自動"
                    />
                  </td>
                </tr>
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
