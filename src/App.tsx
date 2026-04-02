import { useState } from "react";
import ManualInput from "./components/ManualInput";
import ExcelImport from "./components/ExcelImport";

type Tab = "manual" | "excel";

function App() {
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent font-bold text-lg">仕訳</span>
            <span className="text-muted text-sm hidden sm:inline">
              山口興業 日報→仕訳変換ツール
            </span>
          </div>
          <button
            disabled
            className="px-4 py-1.5 rounded-lg bg-surface border border-border text-muted text-sm cursor-not-allowed opacity-50"
          >
            ⚡ journal_entriesに書込（準備中）
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "manual"
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            ✏️ 直接入力
          </button>
          <button
            onClick={() => setTab("excel")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "excel"
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            📂 Excelインポート
          </button>
        </div>

        {/* Tab content */}
        {tab === "manual" && <ManualInput />}
        {tab === "excel" && <ExcelImport />}
      </main>
    </div>
  );
}

export default App;
