import { useState, useRef, useCallback, useMemo } from "react";
import type { SalesRow, WorkType } from "../types/journal";
import { createEmptySalesRow, calcSalesTotal } from "../types/journal";
import { loadCustomers } from "../data/customers";
import { loadSites } from "../data/sites";
import { loadStaff } from "../data/staff";
import KpiCards from "./KpiCards";

const SALES_COLUMNS = [
  "date",
  "type",
  "task",
  "customer",
  "site",
  "staff",
  "unitPrice",
  "headcount",
  "overtimeRate",
  "overtimePay",
  "allowance",
  "transport",
  "totalAmount",
] as const;

export default function SalesInput() {
  const [rows, setRows] = useState<SalesRow[]>([createEmptySalesRow()]);
  const tableRef = useRef<HTMLTableElement>(null);
  const customers = useMemo(() => loadCustomers(), []);
  const sites = useMemo(() => loadSites(), []);
  const staffList = useMemo(() => loadStaff(), []);

  const updateRow = useCallback(
    (id: string, field: keyof SalesRow, value: string | number | boolean) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, [field]: value };
          // Auto-calc totalAmount unless manually overridden
          if (field === "totalAmount") {
            updated.isManualTotal = true;
          } else if (
            !updated.isManualTotal &&
            [
              "unitPrice",
              "headcount",
              "overtimePay",
              "allowance",
              "transport",
            ].includes(field as string)
          ) {
            const total = calcSalesTotal(updated);
            updated.totalAmount = total > 0 ? total : "";
          }
          return updated;
        })
      );
    },
    []
  );

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return [createEmptySalesRow()];
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        createEmptySalesRow({
          date: last?.date || "",
          type: last?.type || "自社受",
          customer: last?.customer || "",
          site: last?.site || "",
        }),
      ];
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const nextCol = colIndex + 1;
      if (nextCol < SALES_COLUMNS.length) {
        const el = tableRef.current?.querySelector(
          `[data-srow="${rowIndex}"][data-scol="${nextCol}"]`
        ) as HTMLElement;
        el?.focus();
      } else {
        const newRowIndex = rowIndex + 1;
        if (newRowIndex >= rows.length) addRow();
        setTimeout(() => {
          const el = tableRef.current?.querySelector(
            `[data-srow="${newRowIndex}"][data-scol="0"]`
          ) as HTMLElement;
          el?.focus();
        }, 0);
      }
    },
    [rows.length, addRow]
  );

  // KPI
  const validRows = rows.filter(
    (r) => r.date && r.totalAmount !== "" && Number(r.totalAmount) > 0
  );
  const totalAmount = validRows.reduce(
    (s, r) => s + (Number(r.totalAmount) || 0),
    0
  );
  const uniqueCustomers = new Set(validRows.map((r) => r.customer).filter(Boolean)).size;
  const uniqueSites = new Set(validRows.map((r) => r.site).filter(Boolean)).size;

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const selectCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent";
  const numCls = `${inputCls} font-mono text-right`;

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <table ref={tableRef} className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left text-xs bg-[#f8fafc]">
              <th className="p-2 w-10"></th>
              <th className="p-2 min-w-[130px]">稼働日 *</th>
              <th className="p-2 min-w-[90px]">形態 *</th>
              <th className="p-2 min-w-[120px]">業務</th>
              <th className="p-2 min-w-[120px]">顧客先名</th>
              <th className="p-2 min-w-[140px]">現場名</th>
              <th className="p-2 min-w-[120px]">スタッフ名</th>
              <th className="p-2 min-w-[100px]">請求単価</th>
              <th className="p-2 min-w-[70px]">人数</th>
              <th className="p-2 min-w-[100px]">残業単価</th>
              <th className="p-2 min-w-[100px]">残業手当</th>
              <th className="p-2 min-w-[100px]">手当支給額</th>
              <th className="p-2 min-w-[100px]">請求交通費</th>
              <th className="p-2 min-w-[120px]">請求金額（税抜）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.id}
                className={`border-b border-border/50 ${
                  row.type === "出来高"
                    ? "bg-[rgba(249,115,22,0.06)]"
                    : "hover:bg-[rgba(0,0,0,0.02)]"
                }`}
              >
                <td className="p-1 text-center">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-muted hover:text-red-400 text-lg leading-none"
                    title="行を削除"
                  >
                    ×
                  </button>
                </td>
                {/* 稼働日 */}
                <td className="p-1">
                  <input
                    type="date"
                    data-srow={ri}
                    data-scol={0}
                    value={row.date}
                    onChange={(e) => updateRow(row.id, "date", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, ri, 0)}
                    className={inputCls}
                  />
                </td>
                {/* 形態 */}
                <td className="p-1">
                  <select
                    data-srow={ri}
                    data-scol={1}
                    value={row.type}
                    onChange={(e) =>
                      updateRow(row.id, "type", e.target.value as WorkType)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 1)}
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
                    data-srow={ri}
                    data-scol={2}
                    value={row.task}
                    onChange={(e) => updateRow(row.id, "task", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, ri, 2)}
                    className={inputCls}
                    placeholder="解体日勤・搬出など"
                  />
                </td>
                {/* 顧客先名 */}
                <td className="p-1">
                  <input
                    type="text"
                    list="s-customer-list"
                    data-srow={ri}
                    data-scol={3}
                    value={row.customer}
                    onChange={(e) =>
                      updateRow(row.id, "customer", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 3)}
                    className={inputCls}
                    placeholder="顧客先"
                  />
                </td>
                {/* 現場名 */}
                <td className="p-1">
                  <input
                    type="text"
                    list="s-site-list"
                    data-srow={ri}
                    data-scol={4}
                    value={row.site}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateRow(row.id, "site", val);
                      const matched = sites.find((s) => s.name === val);
                      if (matched?.customer_name) {
                        updateRow(row.id, "customer", matched.customer_name);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, ri, 4)}
                    className={inputCls}
                    placeholder="現場名"
                  />
                </td>
                {/* スタッフ名 */}
                <td className="p-1">
                  <input
                    type="text"
                    list="s-staff-list"
                    data-srow={ri}
                    data-scol={5}
                    value={row.staff}
                    onChange={(e) =>
                      updateRow(row.id, "staff", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 5)}
                    className={inputCls}
                    placeholder="スタッフ名"
                  />
                </td>
                {/* 請求単価 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={6}
                    value={row.unitPrice}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "unitPrice",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 6)}
                    className={numCls}
                    placeholder="0"
                  />
                </td>
                {/* 人数 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={7}
                    value={row.headcount}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "headcount",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 7)}
                    className={numCls}
                    placeholder="1"
                  />
                </td>
                {/* 残業単価 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={8}
                    value={row.overtimeRate}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "overtimeRate",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 8)}
                    className={numCls}
                    placeholder="0"
                  />
                </td>
                {/* 残業手当 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={9}
                    value={row.overtimePay}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "overtimePay",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 9)}
                    className={numCls}
                    placeholder="0"
                  />
                </td>
                {/* 手当支給額 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={10}
                    value={row.allowance}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "allowance",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 10)}
                    className={numCls}
                    placeholder="0"
                  />
                </td>
                {/* 請求交通費 */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={11}
                    value={row.transport}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "transport",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 11)}
                    className={numCls}
                    placeholder="0"
                  />
                </td>
                {/* 請求金額（税抜） */}
                <td className="p-1">
                  <input
                    type="number"
                    data-srow={ri}
                    data-scol={12}
                    value={row.totalAmount}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "totalAmount",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 12)}
                    className={`${numCls} ${
                      row.isManualTotal ? "ring-1 ring-warn/30" : ""
                    }`}
                    placeholder="自動計算"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="s-customer-list">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <datalist id="s-site-list">
          {sites.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
        <datalist id="s-staff-list">
          {staffList.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </div>

      <button
        onClick={addRow}
        className="mb-6 px-4 py-2 rounded-lg bg-surface border border-border text-accent hover:bg-accent/10 transition text-sm"
      >
        + 行を追加
      </button>

      {/* Sales KPI */}
      <KpiCards
        cards={[
          { label: "入力行数", value: validRows.length, color: "text-accent2" },
          {
            label: "請求金額合計（税抜）",
            value: `¥${totalAmount.toLocaleString()}`,
            color: "text-debit",
          },
          { label: "顧客先数", value: uniqueCustomers, color: "text-accent" },
          { label: "現場数", value: uniqueSites, color: "text-credit" },
        ]}
      />

      {/* TODO: 売上仕訳プレビュー
        将来的に売上側の仕訳ロジックを実装し、JournalPreviewを表示する。
        借方: 売掛金 or 完成工事未収入金（未定）
        貸方: 完成工事高 or 売上高（未定）
      */}
    </div>
  );
}
