const STORAGE_KEY = "yamaguchi_invoice_numbers";

interface InvoiceCounter {
  [yearMonth: string]: number;
}

function load(): InvoiceCounter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function save(data: InvoiceCounter): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getNextInvoiceNumber(yearMonth: string): string {
  const data = load();
  const current = data[yearMonth] ?? 0;
  const next = current + 1;
  data[yearMonth] = next;
  save(data);
  return `${yearMonth}-${String(next).padStart(3, "0")}`;
}
