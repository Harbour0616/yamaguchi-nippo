import { useState, useCallback } from "react";
import {
  loadStaff,
  addStaff,
  updateStaff,
  removeStaff,
  type Staff,
} from "../data/staff";

export default function StaffMaster() {
  const [staff, setStaff] = useState<Staff[]>(loadStaff);
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  // --- Inline edit ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; unitPrice: number | "" }>({ name: "", unitPrice: "" });

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStaff(addStaff(trimmed, unitPrice));
    setName("");
    setUnitPrice("");
  };

  const handleRemove = (id: string) => {
    setStaff(removeStaff(id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = useCallback((s: Staff) => {
    setEditingId(s.id);
    setEditDraft({ name: s.name, unitPrice: s.unitPrice });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editDraft.name.trim()) return;
    setStaff(updateStaff(editingId, { name: editDraft.name.trim(), unitPrice: editDraft.unitPrice }));
    setEditingId(null);
  }, [editingId, editDraft]);

  const inputCls =
    "w-full bg-white border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-5 bg-accent rounded-full inline-block"></span>
        スタッフマスタ
      </h2>

      <div className="flex gap-6 items-start">
        {/* 登録フォーム */}
        <div className="w-[320px] shrink-0 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="スタッフ名を入力"
            className={inputCls}
          />
          <div>
            <label className="text-xs text-muted">単価</label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={`${inputCls} font-mono text-right`}
              placeholder="0"
            />
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
          {staff.length === 0 ? (
            <p className="text-muted text-sm py-2">
              登録されたスタッフはいません。左のフォームから追加してください。
            </p>
          ) : (
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-muted text-left text-xs">
                  <th className="px-3 py-1.5">スタッフ名</th>
                  <th className="px-3 py-1.5 text-right">単価</th>
                  <th className="px-3 py-1.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) =>
                  editingId === s.id ? (
                    <tr key={s.id} className="border-b border-border/50 bg-accent/5">
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={editDraft.unitPrice}
                          onChange={(e) => setEditDraft((d) => ({ ...d, unitPrice: e.target.value === "" ? "" : Number(e.target.value) }))}
                          className={`${inputCls} font-mono text-right`}
                          placeholder="0"
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
                      <td className="px-3 py-1.5 text-right font-mono text-xs">
                        {s.unitPrice ? Number(s.unitPrice).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(s.id); }}
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
            {staff.length} 件登録済み
          </p>
        </div>
      </div>
    </div>
  );
}
