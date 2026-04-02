export type WorkType = "常用" | "出来高";

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

export function createEmptyRow(overrides?: Partial<InputRow>): InputRow {
  return {
    id: crypto.randomUUID(),
    workDate: "",
    workType: "常用",
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
