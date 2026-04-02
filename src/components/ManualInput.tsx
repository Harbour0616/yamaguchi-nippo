import { useState, useRef, useCallback } from "react";
import type { InputRow, WorkType, CreditAccount } from "../types/journal";
import { createEmptyRow } from "../types/journal";
import { toJournalEntries } from "../utils/toJournal";
import JournalPreview from "./JournalPreview";

const CREDIT_OPTIONS: CreditAccount[] = [
  "未払費用",
  "外注費未払金（仮）",
  "未払金",
];

// Column definitions for tab navigation
const COLUMNS = [
  "workDate",
  "workType",
  "client",
  "siteName",
  "staffName",
  "task",
  "amount",
  "creditAccount",
  "description",
] as const;

export default function ManualInput() {
  const [rows, setRows] = useState<InputRow[]>([createEmptyRow()]);
  const tableRef = useRef<HTMLTableElement>(null);

  const updateRow = useCallback(
    (id: string, field: keyof InputRow, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, [field]: value };
          // Auto-set credit account when workType changes to 出来高
          if (field === "workType") {
            updated.creditAccount =
              value === "出来高" ? "外注費未払金（仮）" : "未払費用";
          }
          return updated;
        })
      );
    },
    []
  );

  const deleteRow = useCallback(
    (id: string) => {
      setRows((prev) => {
        if (prev.length <= 1) return [createEmptyRow()];
        return prev.filter((r) => r.id !== id);
      });
    },
    []
  );

  const addRow = useCallback(() => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const newRow = createEmptyRow({
        workDate: last?.workDate || "",
        client: last?.client || "",
        siteName: last?.siteName || "",
      });
      return [...prev, newRow];
    });
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      rowIndex: number,
      colIndex: number
    ) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const nextCol = colIndex + 1;
      if (nextCol < COLUMNS.length) {
        // Move to next cell in same row
        const nextInput = tableRef.current?.querySelector(
          `[data-row="${rowIndex}"][data-col="${nextCol}"]`
        ) as HTMLElement;
        nextInput?.focus();
      } else {
        // Last column - add new row and focus first cell of new row
        const newRowIndex = rowIndex + 1;
        if (newRowIndex >= rows.length) {
          addRow();
        }
        // Need to wait for render
        setTimeout(() => {
          const nextInput = tableRef.current?.querySelector(
            `[data-row="${newRowIndex}"][data-col="0"]`
          ) as HTMLElement;
          nextInput?.focus();
        }, 0);
      }
    },
    [rows.length, addRow]
  );

  const journals = toJournalEntries(rows);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const selectCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

  return (
    <div>
      <div className="overflow-x-auto mb-8">
        <table ref={tableRef} className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left text-xs bg-[#f8fafc]">
              <th className="p-2 w-10"></th>
              <th className="p-2 min-w-[130px]">稼働日 *</th>
              <th className="p-2 min-w-[90px]">形態 *</th>
              <th className="p-2 min-w-[120px]">顧客先</th>
              <th className="p-2 min-w-[140px]">現場名 *</th>
              <th className="p-2 min-w-[120px]">スタッフ名 *</th>
              <th className="p-2 min-w-[100px]">業務</th>
              <th className="p-2 min-w-[110px]">金額 *</th>
              <th className="p-2 min-w-[160px]">貸方科目</th>
              <th className="p-2 min-w-[140px]">摘要</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.id}
                className={`border-b border-border/50 ${
                  row.workType === "出来高"
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
                <td className="p-1">
                  <input
                    type="date"
                    data-row={ri}
                    data-col={0}
                    value={row.workDate}
                    onChange={(e) =>
                      updateRow(row.id, "workDate", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 0)}
                    className={inputCls}
                  />
                </td>
                <td className="p-1">
                  <select
                    data-row={ri}
                    data-col={1}
                    value={row.workType}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "workType",
                        e.target.value as WorkType
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 1)}
                    className={selectCls}
                  >
                    <option value="自社受">自社受</option>
                    <option value="出来高">出来高</option>
                    <option value="常用">常用</option>
                  </select>
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    data-row={ri}
                    data-col={2}
                    value={row.client}
                    onChange={(e) =>
                      updateRow(row.id, "client", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 2)}
                    className={inputCls}
                    placeholder="顧客先"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    data-row={ri}
                    data-col={3}
                    value={row.siteName}
                    onChange={(e) =>
                      updateRow(row.id, "siteName", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 3)}
                    className={inputCls}
                    placeholder="現場名"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    data-row={ri}
                    data-col={4}
                    value={row.staffName}
                    onChange={(e) =>
                      updateRow(row.id, "staffName", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 4)}
                    className={inputCls}
                    placeholder="スタッフ名"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    data-row={ri}
                    data-col={5}
                    value={row.task}
                    onChange={(e) =>
                      updateRow(row.id, "task", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 5)}
                    className={inputCls}
                    placeholder="業務"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    data-row={ri}
                    data-col={6}
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "amount",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 6)}
                    className={`${inputCls} font-mono text-right`}
                    placeholder="0"
                  />
                </td>
                <td className="p-1">
                  <select
                    data-row={ri}
                    data-col={7}
                    value={row.creditAccount}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "creditAccount",
                        e.target.value as CreditAccount
                      )
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 7)}
                    className={selectCls}
                  >
                    {CREDIT_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    data-row={ri}
                    data-col={8}
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, "description", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 8)}
                    className={inputCls}
                    placeholder="自動生成"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mb-8 px-4 py-2 rounded-lg bg-surface border border-border text-accent hover:bg-accent/10 transition text-sm"
      >
        + 行を追加
      </button>

      <div className="border-t border-border pt-6">
        <JournalPreview entries={journals} />
      </div>
    </div>
  );
}
