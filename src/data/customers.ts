export interface Customer {
  id: string;
  name: string;
}

const STORAGE_KEY = "yamaguchi-nippo-customers";

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Customer[];
  } catch {
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function addCustomer(name: string): Customer[] {
  const customers = loadCustomers();
  const trimmed = name.trim();
  if (!trimmed || customers.some((c) => c.name === trimmed)) return customers;
  const updated = [...customers, { id: crypto.randomUUID(), name: trimmed }];
  saveCustomers(updated);
  return updated;
}

export function removeCustomer(id: string): Customer[] {
  const customers = loadCustomers().filter((c) => c.id !== id);
  saveCustomers(customers);
  return customers;
}
