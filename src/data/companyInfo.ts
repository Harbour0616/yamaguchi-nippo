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

const STORAGE_KEY = "yamaguchi_company";

const DEFAULT: CompanyInfo = {
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

export function loadCompanyInfo(): CompanyInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveCompanyInfo(info: CompanyInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}
