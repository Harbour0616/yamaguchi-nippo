import { useState } from "react";
import {
  loadCustomers,
  addCustomer,
  removeCustomer,
  type Customer,
} from "../data/customers";

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomers(addCustomer(trimmed));
    setName("");
  };

  const handleRemove = (id: string) => {
    setCustomers(removeCustomer(id));
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold mb-4">顧客先名マスタ</h2>

      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="顧客先名を入力"
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
      {customers.length === 0 ? (
        <p className="text-muted text-sm">
          登録された顧客先はありません。上のフォームから追加してください。
        </p>
      ) : (
        <ul className="border border-border rounded-lg divide-y divide-border">
          {customers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(0,0,0,0.02)]"
            >
              <span className="text-sm">{c.name}</span>
              <button
                onClick={() => handleRemove(c.id)}
                className="text-muted hover:text-red-500 text-sm transition"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted text-xs mt-4">
        {customers.length} 件登録済み・ブラウザのローカルストレージに保存されます
      </p>
    </div>
  );
}
