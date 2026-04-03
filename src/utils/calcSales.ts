import type { DailyRecord } from "../types/journal";
import type { Site } from "../data/sites";

/**
 * 日報レコード群の売上合計を計算する。
 *
 * 【常用】日報の請求金額を積み上げ
 * 【自社受・出来高】現場マスタの請求金額を現場ごとに1回だけ計上
 */
export function calcTotalSales(
  records: DailyRecord[],
  sites: Site[]
): number {
  let total = 0;
  const countedSites = new Set<string>();

  for (const r of records) {
    if (r.type === "自社受" || r.type === "出来高") {
      const siteName = r.site;
      if (!siteName || countedSites.has(siteName)) continue;
      countedSites.add(siteName);
      const matched = sites.find((s) => s.name === siteName);
      const billing = matched?.billingAmount ? Number(matched.billingAmount) : 0;
      total += billing;
    } else {
      total += Number(r.sales.totalAmount) || 0;
    }
  }
  return total;
}

/**
 * 現場別に売上を計算する。
 *
 * 常用 → 日報の請求金額を積み上げ
 * 自社受・出来高 → 現場マスタの請求金額（1回だけ）
 */
export function calcSalesBySite(
  records: DailyRecord[],
  sites: Site[]
): Map<string, number> {
  const result = new Map<string, number>();
  const countedSites = new Set<string>();

  for (const r of records) {
    const siteName = r.site || "（現場未設定）";

    if (r.type === "自社受" || r.type === "出来高") {
      if (!r.site || countedSites.has(r.site)) continue;
      countedSites.add(r.site);
      const matched = sites.find((s) => s.name === r.site);
      const billing = matched?.billingAmount ? Number(matched.billingAmount) : 0;
      result.set(siteName, (result.get(siteName) || 0) + billing);
    } else {
      const sales = Number(r.sales.totalAmount) || 0;
      result.set(siteName, (result.get(siteName) || 0) + sales);
    }
  }
  return result;
}
