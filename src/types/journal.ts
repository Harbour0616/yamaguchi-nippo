export type WorkType = "自社受" | "出来高" | "常用";

export type CreditAccount = "未払費用" | "外注費未払金（仮）" | "未払金";

export interface InputRow {
  id: string;
  workDate: string;
  workType: WorkType;
  client: string;
  siteName: string;
  staffName: string;
  task: string;
  amount: number | "";
  creditAccount: CreditAccount;
  description: string;
}

export interface JournalEntry {
  index: number;
  workDate: string;
  workType: WorkType;
  debitAccount: "未成工事支出金";
  debitAmount: number;
  creditAccount: CreditAccount;
  creditAmount: number;
  description: string;
  status: "ok" | "warn";
}

export interface ExcelRow {
  workDate: string;
  targetMonth: string;
  workType: WorkType;
  task: string;
  client: string;
  siteName: string;
  staffName: string;
  salesAmount: number;
  paidSalary: number;
  dailySalary: number;
  costTotal: number;
}

export interface SalesRow {
  id: string;
  date: string;
  type: WorkType;
  task: string;
  customer: string;
  site: string;
  staff: string;
  unitPrice: number | "";
  headcount: number | "";
  overtimeRate: number | "";
  overtimePay: number | "";
  allowance: number | "";
  transport: number | "";
  totalAmount: number | "";
  isManualTotal: boolean;
}

export function createEmptySalesRow(
  overrides?: Partial<SalesRow>
): SalesRow {
  return {
    id: crypto.randomUUID(),
    date: "",
    type: "自社受",
    task: "",
    customer: "",
    site: "",
    staff: "",
    unitPrice: "",
    headcount: 1,
    overtimeRate: "",
    overtimePay: "",
    allowance: "",
    transport: "",
    totalAmount: "",
    isManualTotal: false,
    ...overrides,
  };
}

export function calcSalesTotal(row: SalesRow): number {
  const unit = Number(row.unitPrice) || 0;
  const head = Number(row.headcount) || 0;
  const ot = Number(row.overtimePay) || 0;
  const allow = Number(row.allowance) || 0;
  const trans = Number(row.transport) || 0;
  return unit * head + ot + allow + trans;
}

export function createEmptyRow(overrides?: Partial<InputRow>): InputRow {
  return {
    id: crypto.randomUUID(),
    workDate: "",
    workType: "自社受",
    client: "",
    siteName: "",
    staffName: "",
    task: "",
    amount: "",
    creditAccount: "未払費用",
    description: "",
    ...overrides,
  };
}
