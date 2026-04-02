import { useState, useMemo } from "react";
import { loadSites, addSite, removeSite, type Site } from "../data/sites";
import { loadCustomers } from "../data/customers";

export default function SiteMaster() {
  const [sites, setSites] = useState<Site[]>(loadSites);
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const customers = useMemo(() => loadCustomers(), []);

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedCustomer = customerName.trim();
    if (!trimmedName) return;
    const matched = customers.find((c) => c.name === trimmedCustomer);
    setSites(
      addSite(trimmedName, matched?.id ?? "", trimmedCustomer)
    );
    setName("");
    setCustomerName("");
  };

  const handleRemove = (id: string) => {
    setSites(removeSite(id));
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold mb-4">現場マスタ</h2>

      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="現場名を入力"
          className="flex-1 bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        <input
          type="text"
          list="site-customer-list"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="顧客先名"
          className="flex-1 bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        <datalist id="site-customer-list">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>

      {/* List */}
      {sites.length === 0 ? (
        <p className="text-muted text-sm">
          登録された現場はありません。上のフォームから追加してください。
        </p>
      ) : (
        <table className="w-full border border-border rounded-lg text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
              <th className="px-4 py-2">現場名</th>
              <th className="px-4 py-2">顧客先名</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)]"
              >
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-muted">
                  {s.customer_name || "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemove(s.id)}
                    className="text-muted hover:text-red-500 text-sm transition"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-muted text-xs mt-4">
        {sites.length} 件登録済み・ブラウザのローカルストレージに保存されます
      </p>
    </div>
  );
}
