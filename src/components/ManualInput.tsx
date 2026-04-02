import { useState, useRef, useCallback, useMemo } from "react";
import type { InputRow, SalesRow, WorkType, CreditAccount } from "../types/journal";
import { createEmptyRow } from "../types/journal";
import { toJournalEntries } from "../utils/toJournal";
import { loadCustomers } from "../data/customers";
import { loadSites, addSite, removeSite, type Site } from "../data/sites";
import { loadStaff } from "../data/staff";
import JournalPreview from "./JournalPreview";
import SalesInput from "./SalesInput";

const CREDIT_OPTIONS: CreditAccount[] = [
  "未払費用",
  "外注費未払金（仮）",
  "未払金",
];

// Column definitions for tab navigation
const COLUMNS = [
  "workDate",
  "workType",
  "task",
  "client",
  "siteName",
  "staffName",
  "amount",
  "creditAccount",
  "description",
] as const;

interface Props {
  salesRows: SalesRow[];
  setSalesRows: React.Dispatch<React.SetStateAction<SalesRow[]>>;
  costRows: InputRow[];
  setCostRows: React.Dispatch<React.SetStateAction<InputRow[]>>;
}

export default function ManualInput({
  salesRows,
  setSalesRows,
  costRows,
  setCostRows,
}: Props) {
  const rows = costRows;
  const setRows = setCostRows;
  const tableRef = useRef<HTMLTableElement>(null);
  const customers = useMemo(() => loadCustomers(), []);
  const [sites, setSites] = useState<Site[]>(loadSites);
  const staffList = useMemo(() => loadStaff(), []);

  // Site registration
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCustomer, setNewSiteCustomer] = useState("");

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedCustomer = newSiteCustomer.trim();
    if (!trimmedName) return;
    const matched = customers.find((c) => c.name === trimmedCustomer);
    setSites(addSite(trimmedName, matched?.id ?? "", trimmedCustomer));
    setNewSiteName("");
    setNewSiteCustomer("");
  }, [newSiteName, newSiteCustomer, customers]);

  const handleRemoveSite = useCallback((id: string) => {
    setSites(removeSite(id));
  }, []);

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
      {/* 現場登録セクション */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
          現場登録
        </h2>
        <div className="flex gap-6 items-start">
          {/* 現場一覧 */}
          <div className="flex-1 min-w-0">
            {sites.length === 0 ? (
              <p className="text-muted text-sm py-2">現場が未登録です。右のフォームから追加してください。</p>
            ) : (
              <table className="w-full border border-border rounded-lg text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                    <th className="px-3 py-1.5">現場名</th>
                    <th className="px-3 py-1.5">顧客先名</th>
                    <th className="px-3 py-1.5 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)]">
                      <td className="px-3 py-1.5">{s.name}</td>
                      <td className="px-3 py-1.5 text-muted">{s.customer_name || "-"}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={() => handleRemoveSite(s.id)}
                          className="text-muted hover:text-red-500 text-xs transition"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-muted text-xs mt-2">{sites.length} 件登録済み</p>
          </div>
          {/* 追加フォーム */}
          <div className="flex flex-col gap-2 w-[280px] shrink-0">
            <input
              type="text"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
              placeholder="現場名を入力"
              className={inputCls}
            />
            <input
              type="text"
              list="site-customer-list"
              value={newSiteCustomer}
              onChange={(e) => setNewSiteCustomer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
              placeholder="顧客先名"
              className={inputCls}
            />
            <datalist id="site-customer-list">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <button
              onClick={handleAddSite}
              disabled={!newSiteName.trim()}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
        </div>
      </section>

      {/* 売上入力セクション */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-accent2 rounded-full inline-block"></span>
          売上入力
        </h2>
        <SalesInput rows={salesRows} setRows={setSalesRows} />
      </section>

      {/* 原価入力セクション */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-debit rounded-full inline-block"></span>
          原価入力
        </h2>
      <div className="overflow-x-auto mb-8">
        <table ref={tableRef} className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left text-xs bg-[#f8fafc]">
              <th className="p-2 w-10"></th>
              <th className="p-2 min-w-[130px]">稼働日 *</th>
              <th className="p-2 min-w-[90px]">形態 *</th>
              <th className="p-2 min-w-[120px]">業務</th>
              <th className="p-2 min-w-[120px]">顧客先</th>
              <th className="p-2 min-w-[140px]">現場名 *</th>
              <th className="p-2 min-w-[120px]">スタッフ名 *</th>
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
                    value={row.task}
                    onChange={(e) =>
                      updateRow(row.id, "task", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 2)}
                    className={inputCls}
                    placeholder="解体日勤・搬出など"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    list="customer-list"
                    data-row={ri}
                    data-col={3}
                    value={row.client}
                    onChange={(e) =>
                      updateRow(row.id, "client", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 3)}
                    className={inputCls}
                    placeholder="顧客先"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    list="site-list"
                    data-row={ri}
                    data-col={4}
                    value={row.siteName}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateRow(row.id, "siteName", val);
                      const matched = sites.find((s) => s.name === val);
                      if (matched?.customer_name) {
                        updateRow(row.id, "client", matched.customer_name);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, ri, 4)}
                    className={inputCls}
                    placeholder="現場名"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    list="staff-list"
                    data-row={ri}
                    data-col={5}
                    value={row.staffName}
                    onChange={(e) =>
                      updateRow(row.id, "staffName", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, ri, 5)}
                    className={inputCls}
                    placeholder="スタッフ名"
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
        onClick={addRow}
        className="mb-8 px-4 py-2 rounded-lg bg-surface border border-border text-accent hover:bg-accent/10 transition text-sm"
      >
        + 行を追加
      </button>

      <div className="border-t border-border pt-6">
        <JournalPreview entries={journals} />
      </div>
      </section>
    </div>
  );
}
