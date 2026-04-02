import { useState } from "react";
import type { DailyRecord } from "./types/journal";
import { createEmptyDailyRecord } from "./types/journal";
import ManualInput from "./components/ManualInput";
import ExcelImport from "./components/ExcelImport";
import CustomerMaster from "./pages/CustomerMaster";

import StaffMaster from "./pages/StaffMaster";
import CompanyMaster from "./pages/CompanyMaster";
import InvoicePage from "./pages/InvoicePage";
import PayslipPage from "./pages/PayslipPage";
import SiteMaster from "./pages/SiteMaster";

type Page =
  | "site"
  | "manual"
  | "excel"
  | "customers"
  | "staff"
  | "company"
  | "invoice"
  | "payslip";

interface MenuItem {
  id: Page;
  icon: string;
  label: string;
}

const TOP_MENU: MenuItem = { id: "site", icon: "🏗️", label: "現場登録" };

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "日報入力",
    items: [
      { id: "manual", icon: "📋", label: "日報入力" },
      { id: "excel", icon: "📂", label: "Excelインポート" },
    ],
  },
  {
    title: "売上管理",
    items: [{ id: "invoice", icon: "🧾", label: "請求書作成" }],
  },
  {
    title: "給与管理",
    items: [{ id: "payslip", icon: "📋", label: "給与明細作成" }],
  },
  {
    title: "マスタ管理",
    items: [
      { id: "customers", icon: "🏢", label: "顧客先マスタ" },
      { id: "staff", icon: "👷", label: "スタッフマスタ" },
      { id: "company", icon: "⚙️", label: "会社情報" },
    ],
  },
];

function App() {
  const [page, setPage] = useState<Page>("manual");
  const [records, setRecords] = useState<DailyRecord[]>([
    createEmptyDailyRecord(),
  ]);

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-[220px] h-screen bg-white border-r border-border flex flex-col z-50 print:hidden">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="text-accent font-bold text-base">山口興業</div>
          <div className="text-muted text-xs mt-0.5">日報管理</div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Top-level item — no section header */}
          <div className="mb-4">
            <button
              onClick={() => setPage(TOP_MENU.id)}
              className={`w-full text-left px-5 py-2 text-sm flex items-center gap-2.5 transition ${
                page === TOP_MENU.id
                  ? "bg-accent/10 text-accent font-medium border-r-2 border-accent"
                  : "text-text/70 hover:bg-[rgba(0,0,0,0.03)] hover:text-text"
              }`}
            >
              <span className="text-base leading-none">{TOP_MENU.icon}</span>
              {TOP_MENU.label}
            </button>
          </div>
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="px-5 mb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">
                {section.title}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`w-full text-left px-5 py-2 text-sm flex items-center gap-2.5 transition ${
                    page === item.id
                      ? "bg-accent/10 text-accent font-medium border-r-2 border-accent"
                      : "text-text/70 hover:bg-[rgba(0,0,0,0.03)] hover:text-text"
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <button
            disabled
            className="w-full px-3 py-1.5 rounded-md bg-bg border border-border text-muted text-xs cursor-not-allowed opacity-50 text-center"
          >
            ⚡ journal_entries書込（準備中）
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="ml-[220px] flex-1 min-h-screen print:ml-0">
        <div className="px-4 py-6 print:px-0 print:py-0">
          {page === "site" && <SiteMaster />}
          {page === "manual" && (
            <ManualInput records={records} setRecords={setRecords} />
          )}
          {page === "excel" && <ExcelImport />}
          {page === "invoice" && <InvoicePage records={records} />}
          {page === "customers" && <CustomerMaster />}

          {page === "staff" && <StaffMaster />}
          {page === "company" && <CompanyMaster />}
          {page === "payslip" && <PayslipPage records={records} />}
        </div>
      </main>
    </div>
  );
}

export default App;
