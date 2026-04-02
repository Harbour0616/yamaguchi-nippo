import { useState, useCallback, useMemo } from "react";
import { loadCustomers } from "../data/customers";
import { loadSites, addSite, removeSite, type Site } from "../data/sites";

export default function SiteMaster() {
  const customers = useMemo(() => loadCustomers(), []);
  const [sites, setSites] = useState<Site[]>(loadSites);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCustomer, setNewSiteCustomer] = useState("");

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedCustomer = newSiteCustomer.trim();
    if (!trimmedName) return;
    const matched = customers.find((c) => c.name === trimmedCustomer);
    setSites(addSite(trimmedName, matched?.id ?? "", trimmedCustomer));
    setNewSiteName("");
    setNewSiteCustomer("");
  }, [newSiteName, newSiteCustomer, customers]);

  const handleRemoveSite = useCallback((id: string) => {
    setSites(removeSite(id));
  }, []);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
        現場登録
      </h2>
      <div className="flex gap-6 items-start">
        {/* 現場一覧 */}
        <div className="flex-1 min-w-0">
          {sites.length === 0 ? (
            <p className="text-muted text-sm py-2">
              現場が未登録です。右のフォームから追加してください。
            </p>
          ) : (
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                  <th className="px-3 py-1.5">現場名</th>
                  <th className="px-3 py-1.5">顧客先名</th>
                  <th className="px-3 py-1.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)]"
                  >
                    <td className="px-3 py-1.5">{s.name}</td>
                    <td className="px-3 py-1.5 text-muted">
                      {s.customer_name || "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleRemoveSite(s.id)}
                        className="text-muted hover:text-red-500 text-xs transition"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-muted text-xs mt-2">
            {sites.length} 件登録済み
          </p>
        </div>
        {/* 追加フォーム */}
        <div className="flex flex-col gap-2 w-[280px] shrink-0">
          <input
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
            placeholder="現場名を入力"
            className={inputCls}
          />
          <input
            type="text"
            list="site-customer-list"
            value={newSiteCustomer}
            onChange={(e) => setNewSiteCustomer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
            placeholder="顧客先名"
            className={inputCls}
          />
          <datalist id="site-customer-list">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <button
            onClick={handleAddSite}
            disabled={!newSiteName.trim()}
            className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
