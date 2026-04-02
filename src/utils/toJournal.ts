import type { DailyRecord, JournalEntry } from "../types/journal";

export function isValidRecord(record: DailyRecord): boolean {
  return (
    record.date !== "" &&
    record.site.trim() !== "" &&
    record.staff.trim() !== "" &&
    record.cost.paidSalary !== "" &&
    Number(record.cost.paidSalary) > 0
  );
}

export function buildDescription(record: DailyRecord): string {
  if (record.cost.description.trim()) return record.cost.description;
  const parts = [record.site, record.staff, record.task].filter(Boolean);
  return parts.join(" / ");
}

export function toJournalEntries(records: DailyRecord[]): JournalEntry[] {
  return records.filter(isValidRecord).map((record, i) => ({
    index: i + 1,
    workDate: record.date,
    workType: record.type,
    debitAccount: "未成工事支出金" as const,
    debitAmount: Number(record.cost.paidSalary),
    creditAccount: record.cost.creditAccount,
    creditAmount: Number(record.cost.paidSalary),
    description: buildDescription(record),
    status:
      record.type === "出来高" ? ("warn" as const) : ("ok" as const),
  }));
}
