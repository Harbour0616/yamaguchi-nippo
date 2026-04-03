import type { DailyRecord } from "../types/journal";

const STORAGE_KEY = "yamaguchi_daily_records";

export function loadSavedRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DailyRecord[];
  } catch {
    return [];
  }
}

export function saveDailyRecords(records: DailyRecord[]): DailyRecord[] {
  const existing = loadSavedRecords();
  const updated = [...records, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeSavedRecord(id: string): DailyRecord[] {
  const records = loadSavedRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}
