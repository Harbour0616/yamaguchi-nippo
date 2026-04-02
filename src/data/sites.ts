export interface Site {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  startDate: string;
  endDate: string;
}

const STORAGE_KEY = "yamaguchi_sites";

export function loadSites(): Site[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Site[];
  } catch {
    return [];
  }
}

export function saveSites(sites: Site[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

export function addSite(
  name: string,
  customerId: string,
  customerName: string,
  startDate: string,
  endDate: string
): Site[] {
  const sites = loadSites();
  const trimmed = name.trim();
  if (!trimmed || sites.some((s) => s.name === trimmed)) return sites;
  const updated = [
    ...sites,
    {
      id: crypto.randomUUID(),
      name: trimmed,
      customer_id: customerId,
      customer_name: customerName.trim(),
      startDate,
      endDate,
    },
  ];
  saveSites(updated);
  return updated;
}

export function removeSite(id: string): Site[] {
  const sites = loadSites().filter((s) => s.id !== id);
  saveSites(sites);
  return sites;
}
