export type WorkType = "自社受" | "出来高" | "常用";

export type CreditAccount = "未払費用" | "外注費未払金（仮）" | "未払金";

export interface CostRow {
  id: string;
  workType: WorkType;
  task: string;
  client: string;
  siteName: string;
  creditAccount: CreditAccount;
  description: string;
  basicWage: number | "";
  overtimePay: number | "";
  allowance: number | "";
  transport: number | "";
  mgmtFee: number | "";
  insurance: number | "";
  dormFee: number | "";
  withholdingTax: number | "";
  paidSalary: number | "";
  isManualPaidSalary: boolean;
}

/** @deprecated Use CostRow instead */
export type InputRow = CostRow;

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
  type: WorkType;
  task: string;
  customer: string;
  site: string;
  unitPrice: number | "";
  headcount: number | "";
  overtimeRate: number | "";
  overtimePay: number | "";
  allowance: number | "";
  transport: number | "";
  totalAmount: number | "";
  isManualTotal: boolean;
}

export interface DailyRecord {
  id: string;
  date: string;
  staff: string;
  sales: SalesRow;
  cost: CostRow;
}

export function createEmptySalesRow(
  overrides?: Partial<SalesRow>
): SalesRow {
  return {
    id: crypto.randomUUID(),
    type: "自社受",
    task: "",
    customer: "",
    site: "",
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

export function createEmptyCostRow(
  overrides?: Partial<CostRow>
): CostRow {
  return {
    id: crypto.randomUUID(),
    workType: "自社受",
    task: "",
    client: "",
    siteName: "",
    creditAccount: "未払費用",
    description: "",
    basicWage: "",
    overtimePay: "",
    allowance: "",
    transport: "",
    mgmtFee: "",
    insurance: "",
    dormFee: "",
    withholdingTax: "",
    paidSalary: "",
    isManualPaidSalary: false,
    ...overrides,
  };
}

/** @deprecated Use createEmptyCostRow instead */
export const createEmptyRow = createEmptyCostRow;

export function calcSalesTotal(row: SalesRow): number {
  const unit = Number(row.unitPrice) || 0;
  const head = Number(row.headcount) || 0;
  const ot = Number(row.overtimePay) || 0;
  const allow = Number(row.allowance) || 0;
  const trans = Number(row.transport) || 0;
  return unit * head + ot + allow + trans;
}

export function calcCostPaidSalary(row: CostRow): number {
  const basic = Number(row.basicWage) || 0;
  const ot = Number(row.overtimePay) || 0;
  const allow = Number(row.allowance) || 0;
  const trans = Number(row.transport) || 0;
  const mgmt = Number(row.mgmtFee) || 0;
  const ins = Number(row.insurance) || 0;
  const dorm = Number(row.dormFee) || 0;
  const tax = Number(row.withholdingTax) || 0;
  return basic + ot + allow + trans - mgmt - ins - dorm - tax;
}

export function createEmptyDailyRecord(
  overrides?: Partial<Pick<DailyRecord, "date" | "staff">>
): DailyRecord {
  return {
    id: crypto.randomUUID(),
    date: overrides?.date ?? "",
    staff: overrides?.staff ?? "",
    sales: createEmptySalesRow(),
    cost: createEmptyCostRow(),
  };
}
