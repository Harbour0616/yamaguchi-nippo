import { useState, useCallback, useRef, useEffect } from "react";
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

const RATE_COUNT = RATE_LABELS.length;

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [newRates, setNewRates] = useState<CustomerRates>({ ...emptyRates });

  useEffect(() => {
    loadCustomers().then(setCustomers).catch(console.error).finally(() => setLoading(false));
  }, []);

  // --- Refs for Enter-key navigation ---
  const newRateRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newAddBtnRef = useRef<HTMLButtonElement | null>(null);
  const editRateRefs = useRef<(HTMLInputElement | null)[]>([]);
  const editSaveBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleEnterKey = (
    e: React.KeyboardEvent,
    index: number,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    lastRef: React.MutableRefObject<HTMLButtonElement | null>,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (index < RATE_COUNT - 1) {
      refs.current[index + 1]?.focus();
    } else {
      lastRef.current?.focus();
    }
  };

  // --- Inline edit ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; rates: CustomerRates }>({ name: "", rates: { ...emptyRates } });

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomers(await addCustomer(trimmed, { ...newRates }));
    setName("");
    setNewRates({ ...emptyRates });
  };

  const handleRemove = async (id: string) => {
    setCustomers(await removeCustomer(id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = useCallback((c: Customer) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, rates: { ...emptyRates, ...c.rates } });
    editRateRefs.current = [];
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft.name.trim()) return;
    setCustomers(await updateCustomer(editingId, { name: editDraft.name.trim(), rates: editDraft.rates }));
    setEditingId(null);
  }, [editingId, editDraft]);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";
  const numCls = `${inputCls} font-mono text-right`;

  if (loading) return <div className="text-sm text-muted p-4">読み込み中...</div>;

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                newRateRefs.current[0]?.focus();
              }
            }}
            placeholder="顧客先名を入力"
            className={inputCls}
          />
          <div className="border border-border rounded-lg p-3 bg-[#f8fafc]">
            <div className="text-xs font-bold text-muted mb-2">単価設定</div>
            <div className="grid grid-cols-2 gap-2">
              {RATE_LABELS.map(({ key, label }, i) => (
                <div key={key}>
                  <label className="text-[11px] text-muted">{label}</label>
                  <input
                    ref={(el) => { newRateRefs.current[i] = el; }}
                    type="number"
                    value={newRates[key]}
                    onChange={(e) =>
                      setNewRates((r) => ({ ...r, [key]: e.target.value === "" ? "" : Number(e.target.value) }))
                    }
                    onKeyDown={(e) => handleEnterKey(e, i, newRateRefs, newAddBtnRef)}
                    className={numCls}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            ref={newAddBtnRef}
            onClick={handleAdd}
            disabled={!name.trim()}
            className="w-full px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {/* 一覧 */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          {customers.length === 0 ? (
            <p className="text-muted text-sm py-2">
              登録された顧客先はありません。左のフォームから追加してください。
            </p>
          ) : (
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                  <th className="px-3 py-1.5 whitespace-nowrap">顧客先名</th>
                  {RATE_LABELS.map(({ key, label }) => (
                    <th key={key} className="px-3 py-1.5 text-right whitespace-nowrap">{label}</th>
                  ))}
                  <th className="px-3 py-1.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) =>
                  editingId === c.id ? (
                    <tr key={c.id} className="border-b border-border/50 bg-accent/5">
                      <td colSpan={RATE_COUNT + 2} className="px-4 py-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editDraft.name}
                              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  editRateRefs.current[0]?.focus();
                                }
                              }}
                              className={`${inputCls} flex-1`}
                            />
                            <button ref={editSaveBtnRef} onClick={saveEdit} className="text-accent hover:text-accent/80 text-xs font-medium transition">保存</button>
                            <button onClick={cancelEdit} className="text-muted hover:text-text text-xs transition">キャンセル</button>
                          </div>
                          <div className="border border-border rounded-lg p-3 bg-white">
                            <div className="text-xs font-bold text-muted mb-2">単価設定</div>
                            <div className="grid grid-cols-2 gap-2">
                              {RATE_LABELS.map(({ key, label }, i) => (
                                <div key={key}>
                                  <label className="text-[11px] text-muted">{label}</label>
                                  <input
                                    ref={(el) => { editRateRefs.current[i] = el; }}
                                    type="number"
                                    value={editDraft.rates[key]}
                                    onChange={(e) =>
                                      setEditDraft((d) => ({
                                        ...d,
                                        rates: { ...d.rates, [key]: e.target.value === "" ? "" : Number(e.target.value) },
                                      }))
                                    }
                                    onKeyDown={(e) => handleEnterKey(e, i, editRateRefs, editSaveBtnRef)}
                                    className={numCls}
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)] cursor-pointer"
                      onClick={() => startEdit(c)}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">{c.name}</td>
                      {RATE_LABELS.map(({ key }) => (
                        <td key={key} className="px-3 py-1.5 text-right font-mono text-xs whitespace-nowrap">
                          {c.rates?.[key] ? Number(c.rates[key]).toLocaleString() : "-"}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(c.id); }}
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
            {customers.length} 件登録済み
          </p>
        </div>
      </div>
    </div>
  );
}
