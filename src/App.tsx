import { useState } from "react";
import type { SalesRow } from "./types/journal";
import { createEmptySalesRow } from "./types/journal";
import ManualInput from "./components/ManualInput";
import ExcelImport from "./components/ExcelImport";
import CustomerMaster from "./pages/CustomerMaster";
import SiteMaster from "./pages/SiteMaster";
import StaffMaster from "./pages/StaffMaster";
import CompanyMaster from "./pages/CompanyMaster";
import InvoicePage from "./pages/InvoicePage";

type Page =
  | "manual"
  | "excel"
  | "customers"
  | "sites"
  | "staff"
  | "company"
  | "invoice";

interface MenuItem {
  id: Page;
  icon: string;
  label: string;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "日報入力",
    items: [
      { id: "manual", icon: "✏️", label: "直接入力" },
      { id: "excel", icon: "📂", label: "Excelインポート" },
    ],
  },
  {
    title: "売上管理",
    items: [{ id: "invoice", icon: "🧾", label: "請求書作成" }],
  },
  {
    title: "マスタ管理",
    items: [
      { id: "customers", icon: "🏢", label: "顧客先マスタ" },
      { id: "sites", icon: "🏗️", label: "現場マスタ" },
      { id: "staff", icon: "👷", label: "スタッフマスタ" },
      { id: "company", icon: "⚙️", label: "会社情報" },
    ],
  },
];

function App() {
  const [page, setPage] = useState<Page>("manual");
  const [salesRows, setSalesRows] = useState<SalesRow[]>([
    createEmptySalesRow(),
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
        <div className="max-w-7xl mx-auto px-6 py-6 print:px-0 print:py-0 print:max-w-none">
          {page === "manual" && (
            <ManualInput salesRows={salesRows} setSalesRows={setSalesRows} />
          )}
          {page === "excel" && <ExcelImport />}
          {page === "invoice" && <InvoicePage salesRows={salesRows} />}
          {page === "customers" && <CustomerMaster />}
          {page === "sites" && <SiteMaster />}
          {page === "staff" && <StaffMaster />}
          {page === "company" && <CompanyMaster />}
        </div>
      </main>
    </div>
  );
}

export default App;
