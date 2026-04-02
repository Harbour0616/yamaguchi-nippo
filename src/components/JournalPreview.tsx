import type { JournalEntry } from "../types/journal";
import KpiCards from "./KpiCards";

interface Props {
  entries: JournalEntry[];
  page?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

export default function JournalPreview({
  entries,
  page = 1,
  onPageChange,
  pageSize = 100,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = onPageChange
    ? entries.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : entries;

  const debitTotal = entries.reduce((s, e) => s + e.debitAmount, 0);
  const warnCount = entries.filter((e) => e.status === "warn").length;
  const okCount = entries.filter((e) => e.status === "ok").length;
  const errorCount = 0; // Placeholder for future validation

  const cards = [
    { label: "仕訳数", value: entries.length, color: "text-accent2" },
    {
      label: "借方合計",
      value: `¥${debitTotal.toLocaleString()}`,
      color: "text-debit",
    },
    { label: "要確認（出来高）", value: warnCount, color: "text-warn" },
    { label: "常用", value: okCount, color: "text-credit" },
    { label: "未入力エラー", value: errorCount, color: "text-red-400" },
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-text mb-4">仕訳プレビュー</h3>
      <KpiCards cards={cards} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="p-2 w-10">#</th>
              <th className="p-2">稼働日</th>
              <th className="p-2">形態</th>
              <th className="p-2">借方科目</th>
              <th className="p-2 text-right">借方金額</th>
              <th className="p-2">貸方科目</th>
              <th className="p-2 text-right">貸方金額</th>
              <th className="p-2">摘要</th>
              <th className="p-2 text-center">状態</th>
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted">
                  有効な行を入力すると仕訳が表示されます
                </td>
              </tr>
            )}
            {pagedEntries.map((e) => (
              <tr
                key={e.index}
                className={`border-b border-border/50 ${
                  e.status === "warn" ? "bg-warn/5" : ""
                }`}
              >
                <td className="p-2 font-mono text-muted">{e.index}</td>
                <td className="p-2 font-mono">{e.workDate}</td>
                <td className="p-2">
                  <span
                    className={
                      e.workType === "出来高" ? "text-warn" : "text-credit"
                    }
                  >
                    {e.workType}
                  </span>
                </td>
                <td className="p-2 text-debit">{e.debitAccount}</td>
                <td className="p-2 text-right font-mono text-debit">
                  ¥{e.debitAmount.toLocaleString()}
                </td>
                <td className="p-2 text-credit">{e.creditAccount}</td>
                <td className="p-2 text-right font-mono text-credit">
                  ¥{e.creditAmount.toLocaleString()}
                </td>
                <td className="p-2 text-text/80 max-w-[200px] truncate">
                  {e.description}
                </td>
                <td className="p-2 text-center">
                  {e.status === "warn" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warn/20 text-warn">
                      ⚠ 要確認
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-credit/20 text-credit">
                      ✓ OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 rounded bg-surface border border-border text-text disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-muted text-sm font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 rounded bg-surface border border-border text-text disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
