import { supabase, TENANT_ID } from "../utils/supabase";

export interface CompanyInfo {
  name: string;
  postal: string;
  address: string;
  tel: string;
  fax: string;
  bankName: string;
  bankBranch: string;
  bankType: string;
  bankNumber: string;
  bankHolder: string;
  invoiceNumber: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "",
  postal: "",
  address: "",
  tel: "",
  fax: "",
  bankName: "",
  bankBranch: "",
  bankType: "普通",
  bankNumber: "",
  bankHolder: "",
  invoiceNumber: "",
};

const TABLE = "yamaguchi_company_info";

export async function loadCompanyInfo(): Promise<CompanyInfo> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();
  if (error) { console.error("loadCompanyInfo", error); return { ...DEFAULT_COMPANY_INFO }; }
  if (!data) return { ...DEFAULT_COMPANY_INFO };
  return { ...DEFAULT_COMPANY_INFO, ...(data.data as CompanyInfo) };
}

export async function saveCompanyInfo(info: CompanyInfo): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { tenant_id: TENANT_ID, data: info },
      { onConflict: "tenant_id" }
    );
  if (error) console.error("saveCompanyInfo", error);
}
