import type { DailyRecord } from "../types/journal";
import { supabase, TENANT_ID } from "../utils/supabase";

const TABLE = "yamaguchi_daily_records";

// DailyRecord is stored as a jsonb `data` column (no field-level mapping needed)
interface DbRow {
  id: string;
  tenant_id: string;
  data: DailyRecord;
}

function toRecord(row: DbRow): DailyRecord {
  return row.data;
}

export async function loadSavedRecords(): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) { console.error("loadSavedRecords", error); return []; }
  return (data as DbRow[]).map(toRecord);
}

export async function saveDailyRecords(records: DailyRecord[]): Promise<DailyRecord[]> {
  const rows = records.map((r) => ({
    id: r.id,
    tenant_id: TENANT_ID,
    data: r,
  }));
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "id" });
  if (error) console.error("saveDailyRecords", error);
  return loadSavedRecords();
}

export async function updateSavedRecord(updated: DailyRecord): Promise<DailyRecord[]> {
  const { error } = await supabase
    .from(TABLE)
    .update({ data: updated })
    .eq("id", updated.id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("updateSavedRecord", error);
  return loadSavedRecords();
}

export async function removeSavedRecord(id: string): Promise<DailyRecord[]> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("removeSavedRecord", error);
  return loadSavedRecords();
}
