export interface CustomerRates {
  kaitaiDay: number | "";
  kaitaiDayOt: number | "";
  hanshutuDay: number | "";
  hanshutuDayOt: number | "";
  kaitaiNight: number | "";
  kaitaiNightOt: number | "";
  hanshutuNight: number | "";
  hanshutuNightOt: number | "";
}

export const RATE_LABELS: { key: keyof CustomerRates; label: string }[] = [
  { key: "kaitaiDay", label: "解体日勤" },
  { key: "kaitaiDayOt", label: "解体日勤残業" },
  { key: "hanshutuDay", label: "搬出日勤" },
  { key: "hanshutuDayOt", label: "搬出日勤残業" },
  { key: "kaitaiNight", label: "解体夜勤" },
  { key: "kaitaiNightOt", label: "解体夜勤残業" },
  { key: "hanshutuNight", label: "搬出夜勤" },
  { key: "hanshutuNightOt", label: "搬出夜勤残業" },
];

export const emptyRates: CustomerRates = {
  kaitaiDay: "",
  kaitaiDayOt: "",
  hanshutuDay: "",
  hanshutuDayOt: "",
  kaitaiNight: "",
  kaitaiNightOt: "",
  hanshutuNight: "",
  hanshutuNightOt: "",
};

export interface Customer {
  id: string;
  name: string;
  rates: CustomerRates;
}

const STORAGE_KEY = "yamaguchi-nippo-customers";

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Customer[];
    return parsed.map((c) => ({ ...c, rates: { ...emptyRates, ...c.rates } }));
  } catch {
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function addCustomer(name: string, rates?: CustomerRates): Customer[] {
  const customers = loadCustomers();
  const trimmed = name.trim();
  if (!trimmed || customers.some((c) => c.name === trimmed)) return customers;
  const updated = [
    ...customers,
    { id: crypto.randomUUID(), name: trimmed, rates: rates ?? { ...emptyRates } },
  ];
  saveCustomers(updated);
  return updated;
}

export function updateCustomer(id: string, patch: Partial<Omit<Customer, "id">>): Customer[] {
  const customers = loadCustomers().map((c) =>
    c.id === id ? { ...c, ...patch } : c
  );
  saveCustomers(customers);
  return customers;
}

export function removeCustomer(id: string): Customer[] {
  const customers = loadCustomers().filter((c) => c.id !== id);
  saveCustomers(customers);
  return customers;
}
