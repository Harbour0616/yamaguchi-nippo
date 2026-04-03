import { useState, useCallback } from "react";
import {
  loadCustomers,
  addCustomer,
  updateCustomer,
  removeCustomer,
  emptyRates,
  RATE_LABELS,
  type Customer,
  type CustomerRates,
} from "../data/customers";

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [name, setName] = useState("");
  const [newRates, setNewRates] = useState<CustomerRates>({ ...emptyRates });

  // --- Inline edit ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; rates: CustomerRates }>({ name: "", rates: { ...emptyRates } });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomers(addCustomer(trimmed, { ...newRates }));
    setName("");
    setNewRates({ ...emptyRates });
  };

  const handleRemove = (id: string) => {
    setCustomers(removeCustomer(id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = useCallback((c: Customer) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, rates: { ...emptyRates, ...c.rates } });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editDraft.name.trim()) return;
    setCustomers(updateCustomer(editingId, { name: editDraft.name.trim(), rates: editDraft.rates }));
    setEditingId(null);
  }, [editingId, editDraft]);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const numCls = `${inputCls} font-mono text-right`;

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
        顧客先マスタ
      </h2>

      <div className="flex gap-6 items-start">
        {/* 登録フォーム */}
        <div className="w-[320px] shrink-0 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="顧客先名を入力"
            className={inputCls}
          />
          <div className="border border-border rounded-lg p-3 bg-[#f8fafc]">
            <div className="text-xs font-bold text-muted mb-2">単価設定</div>
            <div className="grid grid-cols-2 gap-2">
              {RATE_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted">{label}</label>
                  <input
                    type="number"
                    value={newRates[key]}
                    onChange={(e) =>
                      setNewRates((r) => ({ ...r, [key]: e.target.value === "" ? "" : Number(e.target.value) }))
                    }
                    className={numCls}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="w-full px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {/* 一覧 */}
        <div className="flex-1 min-w-0">
          {customers.length === 0 ? (
            <p className="text-muted text-sm py-2">
              登録された顧客先はありません。左のフォームから追加してください。
            </p>
          ) : (
            <ul className="border border-border rounded-lg divide-y divide-border">
              {customers.map((c) =>
                editingId === c.id ? (
                  <li key={c.id} className="px-4 py-3 bg-accent/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        className={`${inputCls} flex-1`}
                      />
                      <button onClick={saveEdit} className="text-accent hover:text-accent/80 text-xs font-medium transition">保存</button>
                      <button onClick={cancelEdit} className="text-muted hover:text-text text-xs transition">キャンセル</button>
                    </div>
                    <div className="border border-border rounded-lg p-3 bg-white">
                      <div className="text-xs font-bold text-muted mb-2">単価設定</div>
                      <div className="grid grid-cols-2 gap-2">
                        {RATE_LABELS.map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-[11px] text-muted">{label}</label>
                            <input
                              type="number"
                              value={editDraft.rates[key]}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  rates: { ...d.rates, [key]: e.target.value === "" ? "" : Number(e.target.value) },
                                }))
                              }
                              className={numCls}
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ) : (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(0,0,0,0.02)] cursor-pointer"
                    onClick={() => startEdit(c)}
                  >
                    <span className="text-sm">{c.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(c.id); }}
                      className="text-muted hover:text-red-500 text-sm transition"
                    >
                      削除
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
          <p className="text-muted text-xs mt-2">
            {customers.length} 件登録済み
          </p>
        </div>
      </div>
    </div>
  );
}
