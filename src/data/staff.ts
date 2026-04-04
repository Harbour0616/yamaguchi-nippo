import { supabase, TENANT_ID } from "../utils/supabase";

export interface Staff {
  id: string;
  name: string;
  unitPrice: number | "";
}

const TABLE = "yamaguchi_staff";

interface DbRow {
  id: string;
  tenant_id: string;
  name: string;
  unit_price: number | null;
}

function toStaff(row: DbRow): Staff {
  return {
    id: row.id,
    name: row.name,
    unitPrice: row.unit_price ?? "",
  };
}

function toDb(s: Staff): DbRow {
  return {
    id: s.id,
    tenant_id: TENANT_ID,
    name: s.name,
    unit_price: s.unitPrice === "" ? null : s.unitPrice,
  };
}

export async function loadStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) { console.error("loadStaff", error); return []; }
  return (data as DbRow[]).map(toStaff);
}

export async function addStaff(name: string, unitPrice: number | "" = ""): Promise<Staff[]> {
  const trimmed = name.trim();
  if (!trimmed) return loadStaff();
  const existing = await loadStaff();
  if (existing.some((s) => s.name === trimmed)) return existing;
  const newStaff: Staff = { id: crypto.randomUUID(), name: trimmed, unitPrice };
  const { error } = await supabase.from(TABLE).insert(toDb(newStaff));
  if (error) console.error("addStaff", error);
  return loadStaff();
}

export async function updateStaff(id: string, patch: Partial<Omit<Staff, "id">>): Promise<Staff[]> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.unitPrice !== undefined) dbPatch.unit_price = patch.unitPrice === "" ? null : patch.unitPrice;
  const { error } = await supabase
    .from(TABLE)
    .update(dbPatch)
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("updateStaff", error);
  return loadStaff();
}

export async function removeStaff(id: string): Promise<Staff[]> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("removeStaff", error);
  return loadStaff();
}
