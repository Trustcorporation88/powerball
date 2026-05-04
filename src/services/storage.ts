export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to read storage key "${key}"`, error);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write storage key "${key}"`, error);
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove storage key "${key}"`, error);
  }
}

export function buildProjectStorageKey(projectId: string, suffix: string): string {
  return `datafin:${projectId}:${suffix}`;
}

