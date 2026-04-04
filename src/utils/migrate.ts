import { supabase, TENANT_ID } from "./supabase";
import type { DailyRecord } from "../types/journal";

const FLAG_KEY = "yamaguchi_migrated_to_supabase_v1";

export async function runMigrationIfNeeded(): Promise<void> {
  if (localStorage.getItem(FLAG_KEY)) return;

  console.log("[migration] Starting localStorage → Supabase migration...");

  // 1. Daily records
  const recordsRaw = localStorage.getItem("yamaguchi_daily_records");
  if (recordsRaw) {
    try {
      const records = JSON.parse(recordsRaw) as DailyRecord[];
      // 「請負」→「自社受」変換も内包
      for (const r of records) {
        if ((r.type as string) === "請負") (r as { type: string }).type = "自社受";
      }
      if (records.length > 0) {
        const rows = records.map((r) => ({
          id: r.id,
          tenant_id: TENANT_ID,
          date: r.date || new Date().toISOString().slice(0, 10),
          data: r,
        }));
        const { error } = await supabase
          .from("yamaguchi_daily_records")
          .upsert(rows, { onConflict: "id" });
        if (error) console.error("[migration] daily_records error:", error);
        else console.log(`[migration] daily_records: ${records.length} 件`);
      }
    } catch { /* ignore */ }
  }

  // 2. Sites
  const sitesRaw = localStorage.getItem("yamaguchi_sites");
  if (sitesRaw) {
    try {
      const sites = JSON.parse(sitesRaw) as {
        id: string; name: string; customer_id: string; customer_name: string;
        workType?: string; billingAmount?: number | ""; startDate?: string; endDate?: string;
      }[];
      for (const s of sites) {
        if (s.workType === "請負") s.workType = "自社受";
      }
      if (sites.length > 0) {
        const rows = sites.map((s) => ({
          id: s.id,
          tenant_id: TENANT_ID,
          name: s.name,
          customer_id: s.customer_id || "",
          customer_name: s.customer_name || "",
          work_type: s.workType || "",
          billing_amount: s.billingAmount === "" || s.billingAmount === undefined ? null : s.billingAmount,
          start_date: s.startDate || "",
          end_date: s.endDate || "",
        }));
        const { error } = await supabase
          .from("yamaguchi_sites")
          .upsert(rows, { onConflict: "id" });
        if (error) console.error("[migration] sites error:", error);
        else console.log(`[migration] sites: ${sites.length} 件`);
      }
    } catch { /* ignore */ }
  }

  // 3. Staff
  const staffRaw = localStorage.getItem("yamaguchi_staff");
  if (staffRaw) {
    try {
      const staff = JSON.parse(staffRaw) as { id: string; name: string; unitPrice?: number | "" }[];
      if (staff.length > 0) {
        const rows = staff.map((s) => ({
          id: s.id,
          tenant_id: TENANT_ID,
          name: s.name,
          unit_price: s.unitPrice === "" || s.unitPrice === undefined ? null : s.unitPrice,
        }));
        const { error } = await supabase
          .from("yamaguchi_staff")
          .upsert(rows, { onConflict: "id" });
        if (error) console.error("[migration] staff error:", error);
        else console.log(`[migration] staff: ${staff.length} 件`);
      }
    } catch { /* ignore */ }
  }

  // 4. Customers
  const customersRaw = localStorage.getItem("yamaguchi-nippo-customers");
  if (customersRaw) {
    try {
      const customers = JSON.parse(customersRaw) as { id: string; name: string; rates: unknown }[];
      if (customers.length > 0) {
        const rows = customers.map((c) => ({
          id: c.id,
          tenant_id: TENANT_ID,
          name: c.name,
          rates: c.rates || {},
        }));
        const { error } = await supabase
          .from("yamaguchi_customers")
          .upsert(rows, { onConflict: "id" });
        if (error) console.error("[migration] customers error:", error);
        else console.log(`[migration] customers: ${customers.length} 件`);
      }
    } catch { /* ignore */ }
  }

  // 5. Company info
  const companyRaw = localStorage.getItem("yamaguchi_company");
  if (companyRaw) {
    try {
      const info = JSON.parse(companyRaw);
      const { error } = await supabase
        .from("yamaguchi_company_info")
        .upsert(
          { tenant_id: TENANT_ID, data: info },
          { onConflict: "tenant_id" }
        );
      if (error) console.error("[migration] company_info error:", error);
      else console.log("[migration] company_info: done");
    } catch { /* ignore */ }
  }

  // 6. Invoice numbers
  const invoiceRaw = localStorage.getItem("yamaguchi_invoice_numbers");
  if (invoiceRaw) {
    try {
      const data = JSON.parse(invoiceRaw) as Record<string, number>;
      const rows = Object.entries(data).map(([month, counter]) => ({
        tenant_id: TENANT_ID,
        month,
        counter,
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("yamaguchi_invoice_counters")
          .upsert(rows, { onConflict: "tenant_id,month" });
        if (error) console.error("[migration] invoice_counters error:", error);
        else console.log(`[migration] invoice_counters: ${rows.length} 件`);
      }
    } catch { /* ignore */ }
  }

  localStorage.setItem(FLAG_KEY, "1");
  console.log("[migration] Complete.");
}
