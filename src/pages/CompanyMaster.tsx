import { useState } from "react";
import {
  loadCompanyInfo,
  saveCompanyInfo,
  type CompanyInfo,
} from "../data/companyInfo";

const FIELDS: { key: keyof CompanyInfo; label: string; placeholder: string }[] =
  [
    { key: "name", label: "会社名", placeholder: "山口興業株式会社" },
    { key: "postal", label: "〒", placeholder: "000-0000" },
    { key: "address", label: "住所", placeholder: "東京都..." },
    { key: "tel", label: "TEL", placeholder: "03-0000-0000" },
    { key: "fax", label: "FAX", placeholder: "03-0000-0000" },
    { key: "bankName", label: "銀行名", placeholder: "〇〇銀行" },
    { key: "bankBranch", label: "支店名", placeholder: "〇〇支店" },
    { key: "bankType", label: "口座種別", placeholder: "普通" },
    { key: "bankNumber", label: "口座番号", placeholder: "1234567" },
    { key: "bankHolder", label: "口座名義", placeholder: "ヤマグチコウギョウ（カ" },
  ];

export default function CompanyMaster() {
  const [info, setInfo] = useState<CompanyInfo>(loadCompanyInfo);
  const [saved, setSaved] = useState(false);

  const update = (key: keyof CompanyInfo, value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveCompanyInfo(info);
    setSaved(true);
  };

  const inputCls =
    "w-full bg-white border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20";

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold mb-4">会社情報</h2>

      <div className="space-y-3 mb-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-muted mb-1">{f.label}</label>
            <input
              type="text"
              value={info[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition"
      >
        保存
      </button>
      {saved && (
        <span className="ml-3 text-sm text-credit">保存しました</span>
      )}

      <p className="text-muted text-xs mt-4">
        ブラウザのローカルストレージに保存されます
      </p>
    </div>
  );
}
