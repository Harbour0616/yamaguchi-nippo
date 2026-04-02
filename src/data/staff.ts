export interface Staff {
  id: string;
  name: string;
}

const STORAGE_KEY = "yamaguchi_staff";

export function loadStaff(): Staff[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Staff[];
  } catch {
    return [];
  }
}

export function saveStaff(staff: Staff[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
}

export function addStaff(name: string): Staff[] {
  const staff = loadStaff();
  const trimmed = name.trim();
  if (!trimmed || staff.some((s) => s.name === trimmed)) return staff;
  const updated = [...staff, { id: crypto.randomUUID(), name: trimmed }];
  saveStaff(updated);
  return updated;
}

export function removeStaff(id: string): Staff[] {
  const staff = loadStaff().filter((s) => s.id !== id);
  saveStaff(staff);
  return staff;
}
