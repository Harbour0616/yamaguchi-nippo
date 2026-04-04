import { supabase, TENANT_ID } from "../utils/supabase";

export interface CustomerRates {
  kaitaiDay: number | "";
  kaitaiDayOt: number | "";
  hanshutuDay: number | "";
  hanshutuDayOt: number | "";
  kaitaiNight: number | "";
  kaitaiNightOt: number | "";
  hanshutuNight: number | "";
  hanshutuNightOt: number | "";
}

export const RATE_LABELS: { key: keyof CustomerRates; label: string }[] = [
  { key: "kaitaiDay", label: "解体日勤" },
  { key: "kaitaiDayOt", label: "解体日勤残業" },
  { key: "hanshutuDay", label: "搬出日勤" },
  { key: "hanshutuDayOt", label: "搬出日勤残業" },
  { key: "kaitaiNight", label: "解体夜勤" },
  { key: "kaitaiNightOt", label: "解体夜勤残業" },
  { key: "hanshutuNight", label: "搬出夜勤" },
  { key: "hanshutuNightOt", label: "搬出夜勤残業" },
];

export const emptyRates: CustomerRates = {
  kaitaiDay: "",
  kaitaiDayOt: "",
  hanshutuDay: "",
  hanshutuDayOt: "",
  kaitaiNight: "",
  kaitaiNightOt: "",
  hanshutuNight: "",
  hanshutuNightOt: "",
};

export interface Customer {
  id: string;
  name: string;
  rates: CustomerRates;
}

const TABLE = "yamaguchi_customers";

interface DbRow {
  id: string;
  tenant_id: string;
  name: string;
  rates: CustomerRates;
}

function toCustomer(row: DbRow): Customer {
  return {
    id: row.id,
    name: row.name,
    rates: { ...emptyRates, ...row.rates },
  };
}

export async function loadCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tenant_id", TENANT_ID);
  if (error) { console.error("loadCustomers", error); return []; }
  return (data as DbRow[]).map(toCustomer);
}

export async function addCustomer(name: string, rates?: CustomerRates): Promise<Customer[]> {
  const trimmed = name.trim();
  if (!trimmed) return loadCustomers();
  const existing = await loadCustomers();
  if (existing.some((c) => c.name === trimmed)) return existing;
  const row = {
    id: crypto.randomUUID(),
    tenant_id: TENANT_ID,
    name: trimmed,
    rates: rates ?? { ...emptyRates },
  };
  const { error } = await supabase.from(TABLE).insert(row);
  if (error) console.error("addCustomer", error);
  return loadCustomers();
}

export async function updateCustomer(id: string, patch: Partial<Omit<Customer, "id">>): Promise<Customer[]> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.rates !== undefined) dbPatch.rates = patch.rates;
  const { error } = await supabase
    .from(TABLE)
    .update(dbPatch)
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("updateCustomer", error);
  return loadCustomers();
}

export async function removeCustomer(id: string): Promise<Customer[]> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("tenant_id", TENANT_ID);
  if (error) console.error("removeCustomer", error);
  return loadCustomers();
}
