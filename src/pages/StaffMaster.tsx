import { useState } from "react";
import {
  loadStaff,
  addStaff,
  removeStaff,
  type Staff,
} from "../data/staff";

export default function StaffMaster() {
  const [staff, setStaff] = useState<Staff[]>(loadStaff);
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStaff(addStaff(trimmed));
    setName("");
  };

  const handleRemove = (id: string) => {
    setStaff(removeStaff(id));
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold mb-4">スタッフマスタ</h2>

      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="スタッフ名を入力"
          className="flex-1 bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>

      {/* List */}
      {staff.length === 0 ? (
        <p className="text-muted text-sm">
          登録されたスタッフはいません。上のフォームから追加してください。
        </p>
      ) : (
        <ul className="border border-border rounded-lg divide-y divide-border">
          {staff.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(0,0,0,0.02)]"
            >
              <span className="text-sm">{s.name}</span>
              <button
                onClick={() => handleRemove(s.id)}
                className="text-muted hover:text-red-500 text-sm transition"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted text-xs mt-4">
        {staff.length} 件登録済み・ブラウザのローカルストレージに保存されます
      </p>
    </div>
  );
}
