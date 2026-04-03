import { useState, useCallback, useMemo } from "react";
import { loadCustomers } from "../data/customers";
import { loadSites, addSite, removeSite, updateSite, type Site } from "../data/sites";

export default function SiteMaster() {
  const customers = useMemo(() => loadCustomers(), []);
  const [sites, setSites] = useState<Site[]>(loadSites);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCustomer, setNewSiteCustomer] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedCustomer = newSiteCustomer.trim();
    if (!trimmedName || !newStartDate) return;
    const matched = customers.find((c) => c.name === trimmedCustomer);
    setSites(addSite(trimmedName, matched?.id ?? "", trimmedCustomer, newStartDate, newEndDate));
    setNewSiteName("");
    setNewSiteCustomer("");
    setNewStartDate("");
    setNewEndDate("");
  }, [newSiteName, newSiteCustomer, newStartDate, newEndDate, customers]);

  const handleRemoveSite = useCallback((id: string) => {
    setSites(removeSite(id));
    setEditingId(null);
  }, []);

  // --- Inline edit ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", customer_name: "", startDate: "", endDate: "" });

  const startEdit = useCallback((s: Site) => {
    setEditingId(s.id);
    setEditDraft({ name: s.name, customer_name: s.customer_name, startDate: s.startDate, endDate: s.endDate });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editDraft.name.trim() || !editDraft.startDate) return;
    const matched = customers.find((c) => c.name === editDraft.customer_name.trim());
    setSites(updateSite(editingId, {
      name: editDraft.name.trim(),
      customer_id: matched?.id ?? "",
      customer_name: editDraft.customer_name.trim(),
      startDate: editDraft.startDate,
      endDate: editDraft.endDate,
    }));
    setEditingId(null);
  }, [editingId, editDraft, customers]);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const editInputCls =
    "w-full bg-white border border-accent/40 rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
        現場登録
      </h2>
      <div className="flex gap-6 items-start">
        {/* 追加フォーム */}
        <div className="flex flex-col gap-2 w-[320px] shrink-0">
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
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted">着工日 *</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted">完工日</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <button
            onClick={handleAddSite}
            disabled={!newSiteName.trim() || !newStartDate}
            className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>
        {/* 現場一覧 */}
        <div className="flex-1 min-w-0">
          {sites.length === 0 ? (
            <p className="text-muted text-sm py-2">
              現場が未登録です。左のフォームから追加してください。
            </p>
          ) : (
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                  <th className="px-3 py-1.5">現場名</th>
                  <th className="px-3 py-1.5">顧客先名</th>
                  <th className="px-3 py-1.5">着工日</th>
                  <th className="px-3 py-1.5">完工日</th>
                  <th className="px-3 py-1.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) =>
                  editingId === s.id ? (
                    <tr key={s.id} className="border-b border-border/50 bg-accent/5">
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          className={editInputCls}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          list="site-customer-list"
                          value={editDraft.customer_name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, customer_name: e.target.value }))}
                          className={editInputCls}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={editDraft.startDate}
                          onChange={(e) => setEditDraft((d) => ({ ...d, startDate: e.target.value }))}
                          className={editInputCls}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={editDraft.endDate}
                          onChange={(e) => setEditDraft((d) => ({ ...d, endDate: e.target.value }))}
                          className={editInputCls}
                        />
                      </td>
                      <td className="px-2 py-1 text-right whitespace-nowrap">
                        <button onClick={saveEdit} className="text-accent hover:text-accent/80 text-xs font-medium mr-2 transition">保存</button>
                        <button onClick={cancelEdit} className="text-muted hover:text-text text-xs transition">キャンセル</button>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)] cursor-pointer"
                      onClick={() => startEdit(s)}
                    >
                      <td className="px-3 py-1.5">{s.name}</td>
                      <td className="px-3 py-1.5 text-muted">
                        {s.customer_name || "-"}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {s.startDate || "-"}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted">
                        {s.endDate || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveSite(s.id); }}
                          className="text-muted hover:text-red-500 text-xs transition"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
          <p className="text-muted text-xs mt-2">
            {sites.length} 件登録済み
          </p>
        </div>
      </div>
    </div>
  );
}
