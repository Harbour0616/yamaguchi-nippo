export interface Staff {
  id: string;
  name: string;
  unitPrice: number | "";
}

const STORAGE_KEY = "yamaguchi_staff";

export function loadStaff(): Staff[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Staff[];
    return parsed.map((s) => ({ ...s, unitPrice: s.unitPrice ?? "" }));
  } catch {
    return [];
  }
}

export function saveStaff(staff: Staff[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
}

export function addStaff(name: string, unitPrice: number | "" = ""): Staff[] {
  const staff = loadStaff();
  const trimmed = name.trim();
  if (!trimmed || staff.some((s) => s.name === trimmed)) return staff;
  const updated = [...staff, { id: crypto.randomUUID(), name: trimmed, unitPrice }];
  saveStaff(updated);
  return updated;
}

export function updateStaff(id: string, patch: Partial<Omit<Staff, "id">>): Staff[] {
  const staff = loadStaff().map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveStaff(staff);
  return staff;
}

export function removeStaff(id: string): Staff[] {
  const staff = loadStaff().filter((s) => s.id !== id);
  saveStaff(staff);
  return staff;
}
