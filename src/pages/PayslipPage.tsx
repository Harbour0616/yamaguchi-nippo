import { useState, useMemo } from "react";
import type { InputRow } from "../types/journal";
import { loadCompanyInfo } from "../data/companyInfo";

interface Props {
  costRows: InputRow[];
}

interface StaffSummary {
  staffName: string;
  rows: InputRow[];
  basicWage: number;
  overtimePay: number;
  allowance: number;
  transport: number;
  grossPay: number;
  mgmtFee: number;
  insurance: number;
  dormFee: number;
  withholdingTax: number;
  totalDeduction: number;
  netPay: number;
}

function num(v: number | ""): number {
  return Number(v) || 0;
}

function aggregateStaff(staffName: string, rows: InputRow[]): StaffSummary {
  // Map existing InputRow.amount to basicWage
  // TODO: When InputRow gains dedicated fields (basicWage, overtimePay, etc.),
  //       switch to summing those instead.
  const basicWage = rows.reduce((s, r) => s + num(r.amount), 0);
  const overtimePay = 0;
  const allowance = 0;
  const transport = 0;
  const grossPay = basicWage + overtimePay + allowance + transport;

  const mgmtFee = 0;
  const insurance = 0;
  const dormFee = 0;
  const withholdingTax = 0;
  const totalDeduction = mgmtFee + insurance + dormFee + withholdingTax;

  const netPay = grossPay - totalDeduction;

  return {
    staffName,
    rows,
    basicWage,
    overtimePay,
    allowance,
    transport,
    grossPay,
    mgmtFee,
    insurance,
    dormFee,
    withholdingTax,
    totalDeduction,
    netPay,
  };
}

export default function PayslipPage({ costRows }: Props) {
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [previewStaff, setPreviewStaff] = useState<string | null>(null);

  const company = useMemo(() => loadCompanyInfo(), []);

  // Filter by month
  const filtered = useMemo(() => {
    return costRows.filter((r) => {
      if (!r.workDate || !r.staffName.trim() || r.amount === "" || num(r.amount) <= 0)
        return false;
      return r.workDate.startsWith(targetMonth);
    });
  }, [costRows, targetMonth]);

  // Group by staff
  const staffGroups = useMemo<StaffSummary[]>(() => {
    const map = new Map<string, InputRow[]>();
    for (const r of filtered) {
      const key = r.staffName.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([name, rows]) =>
      aggregateStaff(name, rows)
    );
  }, [filtered]);

  const [ymYear, ymMonth] = targetMonth.split("-");
  const monthLabel = `${ymYear}年${Number(ymMonth)}月`;

  // Preview mode
  if (previewStaff !== null) {
    const summary = staffGroups.find((g) => g.staffName === previewStaff);
    if (!summary) return null;

    const payItems = [
      { label: "基本給", value: summary.basicWage },
      { label: "残業手当", value: summary.overtimePay },
      { label: "各種手当", value: summary.allowance },
      { label: "交通費", value: summary.transport },
    ];
    const deductItems = [
      { label: "管理費", value: summary.mgmtFee },
      { label: "補償保険", value: summary.insurance },
      { label: "寮費", value: summary.dormFee },
      { label: "源泉徴収税額", value: summary.withholdingTax },
    ];

    return (
      <div>
        <div className="print:hidden flex gap-2 mb-4">
          <button
            onClick={() => setPreviewStaff(null)}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-text text-sm hover:bg-[rgba(0,0,0,0.03)] transition"
          >
            ← 一覧に戻る
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition"
          >
            印刷
          </button>
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-surface border border-border text-muted text-sm cursor-not-allowed opacity-50"
          >
            PDF出力（準備中）
          </button>
        </div>

        {/* A4 Payslip */}
        <div className="bg-white border border-border rounded-lg p-10 max-w-[210mm] mx-auto print:border-none print:rounded-none print:p-0 print:max-w-none print:break-after-page">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-wider mb-2">
              給与明細書
            </h1>
            <div className="text-base text-muted">{monthLabel}分</div>
          </div>

          {/* Meta */}
          <div className="mb-8 text-sm space-y-1">
            <div>
              <span className="text-muted">会社名: </span>
              {company.name || "（会社情報未設定）"}
            </div>
            <div>
              <span className="text-muted">スタッフ名: </span>
              <span className="font-bold text-base">
                {summary.staffName} 様
              </span>
            </div>
          </div>

          {/* 支給 */}
          <div className="mb-6">
            <div className="text-sm font-bold text-accent mb-2">【支給】</div>
            <table className="w-full text-sm">
              <tbody>
                {payItems.map((item) => (
                  <tr key={item.label} className="border-b border-border/30">
                    <td className="py-2 px-2">{item.label}</td>
                    <td className="py-2 px-2 text-right font-mono">
                      ¥{item.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-text/20 font-bold">
                  <td className="py-2 px-2">支給合計</td>
                  <td className="py-2 px-2 text-right font-mono">
                    ¥{summary.grossPay.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 控除 */}
          <div className="mb-6">
            <div className="text-sm font-bold text-warn mb-2">【控除】</div>
            <table className="w-full text-sm">
              <tbody>
                {deductItems.map((item) => (
                  <tr key={item.label} className="border-b border-border/30">
                    <td className="py-2 px-2">{item.label}</td>
                    <td className="py-2 px-2 text-right font-mono">
                      ¥{item.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-text/20 font-bold">
                  <td className="py-2 px-2">控除合計</td>
                  <td className="py-2 px-2 text-right font-mono">
                    ¥{summary.totalDeduction.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 差引支給額 */}
          <div className="border-y-4 border-text/20 py-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>差引支給額</span>
              <span className="font-mono text-xl">
                ¥{summary.netPay.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 稼働明細 */}
          <div className="mt-6">
            <div className="text-xs text-muted mb-2">
              【稼働明細】{summary.rows.length}件
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted text-left">
                  <th className="py-1 px-1">稼働日</th>
                  <th className="py-1 px-1">現場名</th>
                  <th className="py-1 px-1">業務</th>
                  <th className="py-1 px-1 text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows
                  .sort((a, b) => a.workDate.localeCompare(b.workDate))
                  .map((r) => (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-1 px-1 font-mono">{r.workDate}</td>
                      <td className="py-1 px-1">{r.siteName}</td>
                      <td className="py-1 px-1">{r.task}</td>
                      <td className="py-1 px-1 text-right font-mono">
                        ¥{num(r.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">給与明細作成</h2>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-muted">対象月:</label>
        <input
          type="month"
          value={targetMonth}
          onChange={(e) => setTargetMonth(e.target.value)}
          className="bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
        <span className="text-sm text-muted">
          {filtered.length} 件の原価データ / {staffGroups.length} 名
        </span>
      </div>

      {staffGroups.length === 0 ? (
        <p className="text-muted text-sm">
          {targetMonth
            ? `${monthLabel}の原価データがありません。直接入力ページで原価を入力してください。`
            : "対象月を選択してください。"}
        </p>
      ) : (
        <div className="space-y-3">
          {staffGroups.map((g) => (
            <div
              key={g.staffName}
              className="bg-white border border-border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{g.staffName}</div>
                <div className="text-sm text-muted mt-1">
                  {g.rows.length} 件 ・ 支給合計 ¥
                  {g.grossPay.toLocaleString()} ・ 差引支給額 ¥
                  {g.netPay.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setPreviewStaff(g.staffName)}
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
