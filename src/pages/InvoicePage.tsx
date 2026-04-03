import { useState, useMemo } from "react";
import type { DailyRecord } from "../types/journal";
import { loadCompanyInfo } from "../data/companyInfo";
import { getNextInvoiceNumber } from "../data/invoiceNumbers";
import { loadSavedRecords } from "../data/dailyRecords";
import { loadSites } from "../data/sites";

interface InvoiceLine {
  site: string;
  task: string;
  count: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceGroup {
  customer: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/** 対象月(yyyy-MM)の末日をyyyy-MM-dd形式で返す */
function getLastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  // 翌月の0日 = 当月の末日
  const last = new Date(y, m, 0);
  const dd = String(last.getDate()).padStart(2, "0");
  return `${y}-${String(m).padStart(2, "0")}-${dd}`;
}

export default function InvoicePage() {
  const records = useMemo(() => loadSavedRecords(), []);
  const siteMaster = useMemo(() => loadSites(), []);
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [invoiceDate, setInvoiceDate] = useState(() => getLastDayOfMonth(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  ));
  const [previewCustomer, setPreviewCustomer] = useState<string | null>(null);
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string>>(
    {}
  );
  const [subjects, setSubjects] = useState<Record<string, string>>({});

  const company = useMemo(() => loadCompanyInfo(), []);

  // Filter records by target month
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (!r.date) return false;
      if (!r.date.startsWith(targetMonth)) return false;
      // 常用: 売上がある日報のみ
      if (r.type !== "自社受" && r.type !== "出来高") {
        if (r.sales.totalAmount === "" || Number(r.sales.totalAmount) <= 0)
          return false;
      }
      return true;
    });
  }, [records, targetMonth]);

  // Group by customer, then aggregate by site × task
  // 常用 → 日報の請求金額を積み上げ
  // 自社受・出来高 → 現場マスタの請求金額を現場ごとに1回だけ計上
  const groups = useMemo<InvoiceGroup[]>(() => {
    const map = new Map<string, DailyRecord[]>();
    for (const r of filtered) {
      const key = r.customer || "（顧客先未設定）";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([customer, rows]) => {
      const lineMap = new Map<string, { site: string; task: string; count: number; totalAmount: number; unitPriceSum: number }>();
      const countedSites = new Set<string>();

      for (const r of rows) {
        const site = r.site || "（現場未設定）";
        const task = r.task || "（業務未設定）";

        if (r.type === "自社受" || r.type === "出来高") {
          // 現場マスタの請求金額を1回だけ計上
          if (!r.site || countedSites.has(r.site)) continue;
          countedSites.add(r.site);
          const matched = siteMaster.find((s) => s.name === r.site);
          const billing = matched?.billingAmount ? Number(matched.billingAmount) : 0;
          if (billing <= 0) continue;
          const lk = `${site}\0${task}`;
          lineMap.set(lk, { site, task, count: 1, totalAmount: billing, unitPriceSum: billing });
        } else {
          // 常用: 日報の請求金額を積み上げ
          const lk = `${site}\0${task}`;
          const existing = lineMap.get(lk);
          const amt = Number(r.sales.totalAmount) || 0;
          const up = Number(r.sales.unitPrice) || 0;
          if (existing) {
            existing.count += 1;
            existing.totalAmount += amt;
            existing.unitPriceSum += up;
          } else {
            lineMap.set(lk, { site, task, count: 1, totalAmount: amt, unitPriceSum: up });
          }
        }
      }
      const lines: InvoiceLine[] = Array.from(lineMap.values())
        .map((l) => ({
          site: l.site,
          task: l.task,
          count: l.count,
          unitPrice: l.count > 0 ? Math.round(l.unitPriceSum / l.count) : 0,
          amount: l.totalAmount,
        }))
        .sort((a, b) => a.site.localeCompare(b.site) || a.task.localeCompare(b.task));
      const subtotal = lines.reduce((s, l) => s + l.amount, 0);
      const tax = Math.floor(subtotal * 0.1);
      return { customer, lines, subtotal, tax, total: subtotal + tax };
    });
  }, [filtered, siteMaster]);

  const [ymYear, ymMonth] = targetMonth.split("-");
  const monthLabel = `${ymYear}年${Number(ymMonth)}月`;

  const getInvoiceNo = (customer: string) => {
    if (invoiceNumbers[customer]) return invoiceNumbers[customer];
    const ym = targetMonth.replace("-", "");
    const no = getNextInvoiceNumber(ym);
    setInvoiceNumbers((prev) => ({ ...prev, [customer]: no }));
    return no;
  };

  // Preview mode
  if (previewCustomer !== null) {
    const group = groups.find((g) => g.customer === previewCustomer);
    if (!group) return null;
    const invoiceNo = getInvoiceNo(group.customer);

    return (
      <div>
        {/* Back button (hidden in print) */}
        <button
          onClick={() => setPreviewCustomer(null)}
          className="mb-4 px-4 py-2 rounded-lg bg-surface border border-border text-text text-sm hover:bg-[rgba(0,0,0,0.03)] transition print:hidden"
        >
          ← 一覧に戻る
        </button>
        <button
          onClick={() => window.print()}
          className="mb-4 ml-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition print:hidden"
        >
          印刷
        </button>

        {/* A4 Invoice */}
        <div className="bg-white border border-border rounded-lg p-10 max-w-[210mm] mx-auto print:border-none print:rounded-none print:p-0 print:max-w-none">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-wider mb-3">請求書</h1>
            <div className="text-sm text-muted">
              請求日: {formatDate(new Date(invoiceDate + "T00:00:00"))}
            </div>
            <div className="text-sm text-muted">請求番号: {invoiceNo}</div>
          </div>

          {/* Addresses */}
          <div className="flex justify-between mb-8 gap-8">
            {/* To */}
            <div className="flex-1">
              <div className="text-xs text-muted mb-1">【請求先】</div>
              <div className="text-lg font-bold border-b-2 border-text pb-1 mb-2">
                {group.customer} 御中
              </div>
            </div>
            {/* From */}
            <div className="flex-1 text-right text-sm">
              <div className="text-xs text-muted mb-1">【請求元】</div>
              <div className="font-bold">
                {company.name || "（会社情報未設定）"}
              </div>
              {company.postal && <div>〒{company.postal}</div>}
              {company.address && <div>{company.address}</div>}
              {company.tel && <div>TEL: {company.tel}</div>}
              {company.fax && <div>FAX: {company.fax}</div>}
              {company.invoiceNumber && <div>登録番号: {company.invoiceNumber}</div>}
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6 text-sm flex items-center gap-1">
            <span className="text-muted">件名: </span>
            <input
              type="text"
              value={subjects[group.customer] ?? `${monthLabel}分 作業費`}
              onChange={(e) => setSubjects((prev) => ({ ...prev, [group.customer]: e.target.value }))}
              className="font-medium border-b border-transparent hover:border-border focus:border-accent focus:outline-none px-1 py-0.5 bg-transparent print:border-none"
            />
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-y-2 border-text/20 text-left text-xs text-muted">
                <th className="py-2 px-2">現場名</th>
                <th className="py-2 px-2">業務</th>
                <th className="py-2 px-2 text-right">人数</th>
                <th className="py-2 px-2 text-right">単価</th>
                <th className="py-2 px-2 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {group.lines.map((l, i) => (
                <tr key={`${l.site}-${l.task}-${i}`} className="border-b border-border/50">
                  <td className="py-2 px-2">{l.site}</td>
                  <td className="py-2 px-2">{l.task}</td>
                  <td className="py-2 px-2 text-right font-mono">{l.count}</td>
                  <td className="py-2 px-2 text-right font-mono">¥{l.unitPrice.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right font-mono">¥{l.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span>小計</span>
                <span className="font-mono">
                  ¥{group.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border text-sm">
                <span>消費税（10%）</span>
                <span className="font-mono">
                  ¥{group.tax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-text text-base font-bold">
                <span>合計</span>
                <span className="font-mono">
                  ¥{group.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Bank info */}
          {company.bankName && (
            <div className="border-t-2 border-text/20 pt-4 text-sm">
              <div className="text-xs text-muted mb-2">【振込先】</div>
              <div>
                {company.bankName} {company.bankBranch} {company.bankType}{" "}
                {company.bankNumber}
              </div>
              {company.bankHolder && <div>{company.bankHolder}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">請求書作成</h2>

      {/* Month picker */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-muted">対象月:</label>
        <input
          type="month"
          value={targetMonth}
          onChange={(e) => {
            setTargetMonth(e.target.value);
            setInvoiceDate(getLastDayOfMonth(e.target.value));
            setInvoiceNumbers({});
          }}
          className="bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
        <label className="text-sm text-muted">請求日:</label>
        <input
          type="date"
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          className="bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
        <span className="text-sm text-muted">
          {filtered.length} 件の売上データ
        </span>
      </div>

      {/* Customer list */}
      {groups.length === 0 ? (
        <p className="text-muted text-sm">
          {targetMonth
            ? `${monthLabel}の売上データがありません。直接入力ページで売上を入力してください。`
            : "対象月を選択してください。"}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div
              key={g.customer}
              className="bg-white border border-border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{g.customer}</div>
                <div className="text-sm text-muted mt-1">
                  {g.lines.length} 項目 ・ 小計 ¥{g.subtotal.toLocaleString()} ・
                  税込 ¥{g.total.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setPreviewCustomer(g.customer)}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition"
              >
                プレビュー
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
