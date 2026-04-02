import { useRef, useCallback, useMemo } from "react";
import type {
  DailyRecord,
  SalesRow,
  CostRow,
  WorkType,
} from "../types/journal";
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
import KpiCards from "./KpiCards";

const SALES_COL_COUNT = 12; // date, staff, type, task, customer, site, unitPrice, headcount, overtimePay, allowance, transport, totalAmount
const COST_COL_COUNT = 13; // workType, task, client, siteName, basicWage, overtimePay, allowance, transport, mgmtFee, insurance, dormFee, withholdingTax, paidSalary

interface Props {
  records: DailyRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
}

export default function ManualInput({ records, setRecords }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const customers = useMemo(() => loadCustomers(), []);
  const sites = useMemo(() => loadSites(), []);
  const staffList = useMemo(() => loadStaff(), []);

  // --- Record update helpers ---

  const updateCommon = useCallback(
    (id: string, field: "date" | "staff", value: string) => {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
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
            ["unitPrice", "headcount", "overtimePay", "allowance", "transport"].includes(
              field as string
            )
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
          if (field === "workType") {
            cost.creditAccount =
              value === "出来高" ? "外注費未払金（仮）" : "未払費用";
          }
          if (field === "paidSalary") {
            cost.isManualPaidSalary = true;
          } else if (
            !cost.isManualPaidSalary &&
            [
              "basicWage",
              "overtimePay",
              "allowance",
              "transport",
              "mgmtFee",
              "insurance",
              "dormFee",
              "withholdingTax",
            ].includes(field as string)
          ) {
            const paid = calcCostPaidSalary(cost);
            cost.paidSalary = paid !== 0 ? paid : "";
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
      return [...prev, createEmptyDailyRecord({ date: last?.date || "" })];
    });
  }, []);

  // --- Keyboard navigation ---
  const focusCell = useCallback(
    (rec: number, sub: number, col: number) => {
      const el = tableRef.current?.querySelector(
        `[data-rec="${rec}"][data-sub="${sub}"][data-col="${col}"]`
      ) as HTMLElement;
      el?.focus();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, recIndex: number, sub: number, col: number) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      if (sub === 0) {
        // Sales row
        const nextCol = col + 1;
        if (nextCol < SALES_COL_COUNT) {
          focusCell(recIndex, 0, nextCol);
        } else {
          // Jump to cost row col 0
          focusCell(recIndex, 1, 0);
        }
      } else {
        // Cost row
        const nextCol = col + 1;
        if (nextCol < COST_COL_COUNT) {
          focusCell(recIndex, 1, nextCol);
        } else {
          // Jump to next record's sales row
          const nextRec = recIndex + 1;
          if (nextRec >= records.length) {
            addRecord();
          }
          setTimeout(() => focusCell(nextRec, 0, 0), 0);
        }
      }
    },
    [records.length, addRecord, focusCell]
  );

  // --- KPI ---
  const validSales = records.filter(
    (r) =>
      r.date && r.sales.totalAmount !== "" && Number(r.sales.totalAmount) > 0
  );
  const salesTotalAmount = validSales.reduce(
    (s, r) => s + (Number(r.sales.totalAmount) || 0),
    0
  );
  const uniqueCustomers = new Set(
    validSales.map((r) => r.sales.customer).filter(Boolean)
  ).size;
  const uniqueSites = new Set(
    validSales.map((r) => r.sales.site).filter(Boolean)
  ).size;

  const journals = toJournalEntries(records);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const selectCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent";
  const numCls = `${inputCls} font-mono text-right`;

  return (
    <div>
      {/* 日報入力テーブル */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-debit rounded-full inline-block"></span>
          日報入力（売上＋原価）
        </h2>

        <div className="overflow-x-auto mb-4">
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead>
              {/* Header row 1 — sales-specific column names */}
              <tr className="border-b border-border text-muted text-left text-xs bg-[#f8fafc]">
                <th rowSpan={2} className="p-2 w-10"></th>
                <th rowSpan={2} className="p-2 min-w-[130px]">
                  稼働日 *
                </th>
                <th rowSpan={2} className="p-2 min-w-[110px]">
                  スタッフ名 *
                </th>
                <th rowSpan={2} className="p-2 w-14">
                  種別
                </th>
                <th rowSpan={2} className="p-2 min-w-[80px]">
                  形態
                </th>
                <th rowSpan={2} className="p-2 min-w-[100px]">
                  業務
                </th>
                <th rowSpan={2} className="p-2 min-w-[100px]">
                  顧客先
                </th>
                <th rowSpan={2} className="p-2 min-w-[110px]">
                  現場
                </th>
                {/* Sales-specific */}
                <th className="p-2 min-w-[90px]">請求単価</th>
                <th className="p-2 min-w-[60px]">人数</th>
                <th className="p-2 min-w-[90px]">残業手当</th>
                <th className="p-2 min-w-[90px]">手当支給額</th>
                <th className="p-2 min-w-[90px]">請求交通費</th>
                <th colSpan={4} className="p-2 min-w-[110px]">
                  請求金額（税抜）
                </th>
              </tr>
              {/* Header row 2 — cost-specific column names */}
              <tr className="border-b border-border text-muted text-left text-xs bg-[#f0f4f8]">
                <th className="p-2 min-w-[90px]">基本給</th>
                <th className="p-2 min-w-[80px]">残業手当</th>
                <th className="p-2 min-w-[80px]">各種手当</th>
                <th className="p-2 min-w-[80px]">交通費</th>
                <th className="p-2 min-w-[80px]">管理費</th>
                <th className="p-2 min-w-[80px]">補償保険</th>
                <th className="p-2 min-w-[80px]">寮費</th>
                <th className="p-2 min-w-[90px]">源泉徴収税額</th>
                <th className="p-2 min-w-[90px]">支給給与</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, ri) => (
                <>
                  {/* === Sales row === */}
                  <tr
                    key={`${rec.id}-sales`}
                    className={`border-t-2 border-border ${
                      rec.sales.type === "出来高"
                        ? "bg-[rgba(249,115,22,0.06)]"
                        : "hover:bg-[rgba(0,0,0,0.02)]"
                    }`}
                  >
                    {/* Delete (rowSpan=2) */}
                    <td rowSpan={2} className="p-1 text-center align-top pt-3">
                      <button
                        onClick={() => deleteRecord(rec.id)}
                        className="text-muted hover:text-red-400 text-lg leading-none"
                        title="レコードを削除"
                      >
                        ×
                      </button>
                    </td>
                    {/* 稼働日 (rowSpan=2) */}
                    <td rowSpan={2} className="p-1 align-top">
                      <input
                        type="date"
                        data-rec={ri}
                        data-sub={0}
                        data-col={0}
                        value={rec.date}
                        onChange={(e) =>
                          updateCommon(rec.id, "date", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 0)}
                        className={inputCls}
                      />
                    </td>
                    {/* スタッフ名 (rowSpan=2) */}
                    <td rowSpan={2} className="p-1 align-top">
                      <input
                        type="text"
                        list="staff-list"
                        data-rec={ri}
                        data-sub={0}
                        data-col={1}
                        value={rec.staff}
                        onChange={(e) =>
                          updateCommon(rec.id, "staff", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 1)}
                        className={inputCls}
                        placeholder="スタッフ名"
                      />
                    </td>
                    {/* 種別バッジ */}
                    <td className="p-1 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-accent2/20 text-accent2">
                        売上
                      </span>
                    </td>
                    {/* 形態 */}
                    <td className="p-1">
                      <select
                        data-rec={ri}
                        data-sub={0}
                        data-col={2}
                        value={rec.sales.type}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "type",
                            e.target.value as WorkType
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 2)}
                        className={selectCls}
                      >
                        <option value="自社受">自社受</option>
                        <option value="出来高">出来高</option>
                        <option value="常用">常用</option>
                      </select>
                    </td>
                    {/* 業務 */}
                    <td className="p-1">
                      <input
                        type="text"
                        data-rec={ri}
                        data-sub={0}
                        data-col={3}
                        value={rec.sales.task}
                        onChange={(e) =>
                          updateSales(rec.id, "task", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 3)}
                        className={inputCls}
                        placeholder="業務"
                      />
                    </td>
                    {/* 顧客先 */}
                    <td className="p-1">
                      <input
                        type="text"
                        list="customer-list"
                        data-rec={ri}
                        data-sub={0}
                        data-col={4}
                        value={rec.sales.customer}
                        onChange={(e) =>
                          updateSales(rec.id, "customer", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 4)}
                        className={inputCls}
                        placeholder="顧客先"
                      />
                    </td>
                    {/* 現場 */}
                    <td className="p-1">
                      <input
                        type="text"
                        list="site-list"
                        data-rec={ri}
                        data-sub={0}
                        data-col={5}
                        value={rec.sales.site}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSales(rec.id, "site", val);
                          const matched = sites.find((s) => s.name === val);
                          if (matched?.customer_name) {
                            updateSales(rec.id, "customer", matched.customer_name);
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 5)}
                        className={inputCls}
                        placeholder="現場"
                      />
                    </td>
                    {/* 請求単価 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={6}
                        value={rec.sales.unitPrice}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "unitPrice",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 6)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 人数 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={7}
                        value={rec.sales.headcount}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "headcount",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 7)}
                        className={numCls}
                        placeholder="1"
                      />
                    </td>
                    {/* 残業手当 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={8}
                        value={rec.sales.overtimePay}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "overtimePay",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 8)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 手当支給額 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={9}
                        value={rec.sales.allowance}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "allowance",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 9)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 請求交通費 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={10}
                        value={rec.sales.transport}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "transport",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 10)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 請求金額（税抜）colSpan=4 */}
                    <td colSpan={4} className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={0}
                        data-col={11}
                        value={rec.sales.totalAmount}
                        onChange={(e) =>
                          updateSales(
                            rec.id,
                            "totalAmount",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 0, 11)}
                        className={`${numCls} ${
                          rec.sales.isManualTotal ? "ring-1 ring-warn/30" : ""
                        }`}
                        placeholder="自動計算"
                      />
                    </td>
                  </tr>

                  {/* === Cost row === */}
                  <tr
                    key={`${rec.id}-cost`}
                    className={`border-b border-border/50 ${
                      rec.cost.workType === "出来高"
                        ? "bg-[rgba(249,115,22,0.04)]"
                        : "bg-[rgba(0,0,0,0.01)]"
                    }`}
                  >
                    {/* 種別バッジ */}
                    <td className="p-1 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-debit/20 text-debit">
                        原価
                      </span>
                    </td>
                    {/* 形態 */}
                    <td className="p-1">
                      <select
                        data-rec={ri}
                        data-sub={1}
                        data-col={0}
                        value={rec.cost.workType}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "workType",
                            e.target.value as WorkType
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 0)}
                        className={selectCls}
                      >
                        <option value="自社受">自社受</option>
                        <option value="出来高">出来高</option>
                        <option value="常用">常用</option>
                      </select>
                    </td>
                    {/* 業務 */}
                    <td className="p-1">
                      <input
                        type="text"
                        data-rec={ri}
                        data-sub={1}
                        data-col={1}
                        value={rec.cost.task}
                        onChange={(e) =>
                          updateCost(rec.id, "task", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 1)}
                        className={inputCls}
                        placeholder="業務"
                      />
                    </td>
                    {/* 顧客先 */}
                    <td className="p-1">
                      <input
                        type="text"
                        list="customer-list"
                        data-rec={ri}
                        data-sub={1}
                        data-col={2}
                        value={rec.cost.client}
                        onChange={(e) =>
                          updateCost(rec.id, "client", e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 2)}
                        className={inputCls}
                        placeholder="顧客先"
                      />
                    </td>
                    {/* 現場 */}
                    <td className="p-1">
                      <input
                        type="text"
                        list="site-list"
                        data-rec={ri}
                        data-sub={1}
                        data-col={3}
                        value={rec.cost.siteName}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCost(rec.id, "siteName", val);
                          const matched = sites.find((s) => s.name === val);
                          if (matched?.customer_name) {
                            updateCost(rec.id, "client", matched.customer_name);
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 3)}
                        className={inputCls}
                        placeholder="現場"
                      />
                    </td>
                    {/* 基本給 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={4}
                        value={rec.cost.basicWage}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "basicWage",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 4)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 残業手当 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={5}
                        value={rec.cost.overtimePay}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "overtimePay",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 5)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 各種手当 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={6}
                        value={rec.cost.allowance}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "allowance",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 6)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 交通費 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={7}
                        value={rec.cost.transport}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "transport",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 7)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 管理費 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={8}
                        value={rec.cost.mgmtFee}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "mgmtFee",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 8)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 補償保険 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={9}
                        value={rec.cost.insurance}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "insurance",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 9)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 寮費 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={10}
                        value={rec.cost.dormFee}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "dormFee",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 10)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 源泉徴収税額 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={11}
                        value={rec.cost.withholdingTax}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "withholdingTax",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 11)}
                        className={numCls}
                        placeholder="0"
                      />
                    </td>
                    {/* 支給給与 */}
                    <td className="p-1">
                      <input
                        type="number"
                        data-rec={ri}
                        data-sub={1}
                        data-col={12}
                        value={rec.cost.paidSalary}
                        onChange={(e) =>
                          updateCost(
                            rec.id,
                            "paidSalary",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, ri, 1, 12)}
                        className={`${numCls} ${
                          rec.cost.isManualPaidSalary
                            ? "ring-1 ring-warn/30"
                            : ""
                        }`}
                        placeholder="自動計算"
                      />
                    </td>
                  </tr>
                </>
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

        {/* Sales KPI */}
        <KpiCards
          cards={[
            {
              label: "売上行数",
              value: validSales.length,
              color: "text-accent2",
            },
            {
              label: "請求金額合計（税抜）",
              value: `¥${salesTotalAmount.toLocaleString()}`,
              color: "text-debit",
            },
            {
              label: "顧客先数",
              value: uniqueCustomers,
              color: "text-accent",
            },
            { label: "現場数", value: uniqueSites, color: "text-credit" },
          ]}
        />

        <div className="border-t border-border pt-6 mt-6">
          <JournalPreview entries={journals} />
        </div>
      </section>
    </div>
  );
}
