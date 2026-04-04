import { supabase, TENANT_ID } from "../utils/supabase";

const TABLE = "yamaguchi_invoice_counters";

export async function getNextInvoiceNumber(yearMonth: string): Promise<string> {
  // Try to increment existing counter
  const { data: existing } = await supabase
    .from(TABLE)
    .select("counter")
    .eq("tenant_id", TENANT_ID)
    .eq("month", yearMonth)
    .maybeSingle();

  const next = (existing?.counter ?? 0) + 1;

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { tenant_id: TENANT_ID, month: yearMonth, counter: next },
      { onConflict: "tenant_id,month" }
    );
  if (error) console.error("getNextInvoiceNumber", error);

  return `${yearMonth}-${String(next).padStart(3, "0")}`;
}
