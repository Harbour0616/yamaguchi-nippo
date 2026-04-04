import { supabase, TENANT_ID } from "../utils/supabase";

export type SiteWorkType = "" | "常用" | "自社受" | "出来高";

export interface Site {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  workType: SiteWorkType;
  billingAmount: number | "";
  startDate: string;
  endDate: string;
}

const TABLE = "yamaguchi_sites";

interface DbRow {
  id: string;
  tenant_id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  work_type: string;
  billing_amount: number | null;
  start_date: string;
  end_date: string;
}

function toSite(row: DbRow): Site {
  return {
    id: row.id,
    name: row.name,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    workType: (row.work_type || "") as SiteWorkType,
    billingAmount: row.billing_amount ?? "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
  };
}

function toDb(s: Site): Omit<DbRow, "tenant_id"> & { tenant_id: string } {
  return {
    id: s.id,
    tenant_id: TENANT_ID,
    name: s.name,
    customer_id: s.customer_id,
    customer_name: s.customer_name,
    work_type: s.workType,
    billing_amount: s.billingAmount === "" ? null : s.billingAmount,
    start_date: s.startDate,
    end_date: s.endDate,
  };
}

export async function loadSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) { console.error("loadSites", error); return []; }
  return (data as DbRow[]).map(toSite);
}

export async function addSite(
  name: string,
  customerId: string,
  customerName: string,
  workType: SiteWorkType,
  billingAmount: number | "",
  startDate: string,
  endDate: string
): Promise<Site[]> {
  const trimmed = name.trim();
  if (!trimmed) return loadSites();
  const existing = await loadSites();
  if (existing.some((s) => s.name === trimmed)) return existing;
  const newSite: Site = {
    id: crypto.randomUUID(),
    name: trimmed,
    customer_id: customerId,
    customer_name: customerName.trim(),
    workType,
    billingAmount,
    startDate,
    endDate,
  };
  const { error } = await supabase.from(TABLE).insert(toDb(newSite));
  if (error) console.error("addSite", error);
  return loadSites();
}

export async function updateSite(id: string, patch: Partial<Omit<Site, "id">>): Promise<Site[]> {
  // Build DB patch
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.customer_id !== undefined) dbPatch.customer_id = patch.customer_id;
  if (patch.customer_name !== undefined) dbPatch.customer_name = patch.customer_name;
  if (patch.workType !== undefined) dbPatch.work_type = patch.workType;
  if (patch.billingAmount !== undefined) dbPatch.billing_amount = patch.billingAmount === "" ? null : patch.billingAmount;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;

  const { error } = await supabase
    .from(TABLE)
    .update(dbPatch)
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("updateSite", error);
  return loadSites();
}

export async function removeSite(id: string): Promise<Site[]> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("removeSite", error);
  return loadSites();
}
