import { useState, useCallback, useMemo } from "react";
import { parseExcel } from "../utils/parseExcel";
import type {
  ExcelRow,
  JournalEntry,
  CreditAccount,
} from "../types/journal";
import JournalPreview from "./JournalPreview";
import KpiCards from "./KpiCards";

function excelToJournal(rows: ExcelRow[]): JournalEntry[] {
  return rows.map((r, i) => {
    const isDekiraka = r.workType === "出来高";
    const amount = isDekiraka
      ? r.salesAmount
      : r.paidSalary > 0
        ? r.paidSalary
        : r.dailySalary > 0
          ? r.dailySalary
          : r.costTotal;
    const creditAccount: CreditAccount = isDekiraka
      ? "外注費未払金（仮）"
      : "未払費用";
    const parts = [r.siteName, r.staffName, r.task].filter(Boolean);
    return {
      index: i + 1,
      workDate: r.workDate,
      workType: r.workType,
      debitAccount: "未成工事支出金" as const,
      debitAmount: amount,
      creditAccount,
      creditAmount: amount,
      description: parts.join(" / "),
      status: isDekiraka ? ("warn" as const) : ("ok" as const),
    };
  });
}

export default function ExcelImport() {
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterSite, setFilterSite] = useState<string>("");
  const [filterStaff, setFilterStaff] = useState<string>("");

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const rows = parseExcel(buf);
    setExcelRows(rows);
    setPage(1);
    setFilterType("");
    setFilterSite("");
    setFilterStaff("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Unique values for filter dropdowns
  const sites = useMemo(
    () => [...new Set(excelRows.map((r) => r.siteName).filter(Boolean))],
    [excelRows]
  );
  const staffNames = useMemo(
    () => [...new Set(excelRows.map((r) => r.staffName).filter(Boolean))],
    [excelRows]
  );

  // Apply filters
  const filteredRows = useMemo(() => {
    return excelRows.filter((r) => {
      if (filterType && r.workType !== filterType) return false;
      if (filterSite && r.siteName !== filterSite) return false;
      if (filterStaff && r.staffName !== filterStaff) return false;
      return true;
    });
  }, [excelRows, filterType, filterSite, filterStaff]);

  const journals = useMemo(
    () => excelToJournal(filteredRows),
    [filteredRows]
  );

  const debitTotal = journals.reduce((s, e) => s + e.debitAmount, 0);
  const warnCount = journals.filter((e) => e.status === "warn").length;
  const targetMonth =
    excelRows.length > 0 ? excelRows[0].targetMonth || "-" : "-";

  const selectCls =
    "bg-white border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

  return (
    <div>
      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 transition cursor-pointer ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/50"
        }`}
        onClick={() => document.getElementById("excel-input")?.click()}
      >
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="text-3xl mb-2">📂</div>
        <div className="text-text font-medium">
          Excelファイルをドラッグ&ドロップ
        </div>
        <div className="text-muted text-sm mt-1">
          またはクリックしてファイルを選択
        </div>
        {fileName && (
          <div className="mt-3 text-accent text-sm font-mono">{fileName}</div>
        )}
      </div>

      {excelRows.length > 0 && (
        <>
          {/* KPI */}
          <KpiCards
            cards={[
              {
                label: "総行数",
                value: excelRows.length,
                color: "text-accent2",
              },
              {
                label: "仕訳生成数",
                value: journals.length,
                color: "text-accent",
              },
              { label: "要確認数", value: warnCount, color: "text-warn" },
              {
                label: "借方合計",
                value: `¥${debitTotal.toLocaleString()}`,
                color: "text-debit",
              },
              { label: "対象月", value: targetMonth, color: "text-text" },
            ]}
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">形態：すべて</option>
              <option value="常用">常用</option>
              <option value="出来高">出来高</option>
            </select>
            <select
              value={filterSite}
              onChange={(e) => {
                setFilterSite(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">現場：すべて</option>
              {sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterStaff}
              onChange={(e) => {
                setFilterStaff(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">スタッフ：すべて</option>
              {staffNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {(filterType || filterSite || filterStaff) && (
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterSite("");
                  setFilterStaff("");
                  setPage(1);
                }}
                className="px-3 py-1.5 text-sm text-warn hover:text-warn/80"
              >
                フィルター解除
              </button>
            )}
          </div>

          {/* Journal preview with pagination */}
          <JournalPreview
            entries={journals}
            page={page}
            onPageChange={setPage}
            pageSize={100}
          />
        </>
      )}
    </div>
  );
}
