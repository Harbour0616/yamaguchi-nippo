import { useState } from "react";
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

  // --- Modal edit ---
  const [editDraft, setEditDraft] = useState<Staff | null>(null);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStaff(addStaff(trimmed, unitPrice));
    setName("");
    setUnitPrice("");
  };

  const handleRemove = (id: string) => {
    setStaff(removeStaff(id));
  };

  const handleSaveEdit = () => {
    if (!editDraft || !editDraft.name.trim()) return;
    setStaff(updateStaff(editDraft.id, { name: editDraft.name.trim(), unitPrice: editDraft.unitPrice }));
    setEditDraft(null);
  };

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
                  <th className="px-3 py-1.5 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 hover:bg-[rgba(0,0,0,0.02)]"
                  >
                    <td className="px-3 py-1.5">{s.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {s.unitPrice ? Number(s.unitPrice).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditDraft({ ...s })}
                        className="text-accent hover:text-accent/80 text-xs font-medium mr-2 transition"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleRemove(s.id)}
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
            {staff.length} 件登録済み
          </p>
        </div>
      </div>

      {/* 編集モーダル */}
      {editDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditDraft(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold">スタッフ編集</h3>
              <button onClick={() => setEditDraft(null)} className="text-muted hover:text-text text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">スタッフ名</label>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => d && ({ ...d, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">単価</label>
                <input
                  type="number"
                  value={editDraft.unitPrice}
                  onChange={(e) => setEditDraft((d) => d && ({ ...d, unitPrice: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className={`${inputCls} font-mono text-right`}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditDraft(null)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text text-sm hover:bg-[rgba(0,0,0,0.03)] transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editDraft.name.trim()}
                className="px-6 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
