import type { InputRow, JournalEntry } from "../types/journal";

export function isValidRow(row: InputRow): boolean {
  return (
    row.workDate !== "" &&
    row.siteName.trim() !== "" &&
    row.staffName.trim() !== "" &&
    row.amount !== "" &&
    Number(row.amount) > 0
  );
}

export function buildDescription(row: InputRow): string {
  if (row.description.trim()) return row.description;
  const parts = [row.siteName, row.staffName, row.task].filter(Boolean);
  return parts.join(" / ");
}

export function toJournalEntries(rows: InputRow[]): JournalEntry[] {
  return rows.filter(isValidRow).map((row, i) => ({
    index: i + 1,
    workDate: row.workDate,
    workType: row.workType,
    debitAccount: "未成工事支出金" as const,
    debitAmount: Number(row.amount),
    creditAccount: row.creditAccount,
    creditAmount: Number(row.amount),
    description: buildDescription(row),
    status: row.workType === "出来高" ? ("warn" as const) : ("ok" as const),
  }));
}
