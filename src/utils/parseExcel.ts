import * as XLSX from "xlsx";
import type { ExcelRow, WorkType } from "../types/journal";

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function excelDateToISO(v: unknown): string {
  if (v == null) return "";
  // If it's a number, treat as Excel serial date
  if (typeof v === "number") {
    const date = XLSX.SSF.parse_date_code(v);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  // If it's a string, try to parse
  const s = String(v).trim();
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function excelMonthToStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    const date = XLSX.SSF.parse_date_code(v);
    if (date) {
      return `${date.y}年${date.m}月`;
    }
  }
  return String(v).trim();
}

export function parseExcel(buffer: ArrayBuffer): ExcelRow[] {
  const wb = XLSX.read(buffer, { type: "array" });

  // Try to find sheet named "エクセルデータ", fall back to first sheet
  const sheetName =
    wb.SheetNames.find((n) => n === "エクセルデータ") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  const rows: ExcelRow[] = [];

  for (const raw of data) {
    const workType = toStr(raw["［売］請負形態"]);
    const normalizedType: WorkType =
      workType === "出来高" ? "出来高" : "常用";

    const salesAmount = toNum(raw["［売］請求金額（税抜）"]);
    const paidSalary = toNum(raw["［支］支給給与"]);
    const dailySalary = toNum(raw["日割給与"]);
    const costTotal = toNum(raw["原価合計"]);

    // Determine amount
    let amount: number;
    if (normalizedType === "出来高") {
      amount = salesAmount;
    } else {
      // 常用: priority: paidSalary > dailySalary > costTotal
      amount = paidSalary > 0 ? paidSalary : dailySalary > 0 ? dailySalary : costTotal;
    }

    // Skip rows with amount <= 0
    if (amount <= 0) continue;

    rows.push({
      workDate: excelDateToISO(raw["［売］稼働日"]),
      targetMonth: excelMonthToStr(raw["［売］稼働月"]),
      workType: normalizedType,
      task: toStr(raw["［売］業務"]),
      client: toStr(raw["［売］顧客先名"]),
      siteName: toStr(raw["［売］現場名"]),
      staffName: toStr(raw["［売］スタッフ名"]),
      salesAmount,
      paidSalary,
      dailySalary,
      costTotal,
    });
  }

  return rows;
}
