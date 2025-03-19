/**
 * Save data to local storage
 * @param key Storage key
 * @param data Data to store
 */
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Get data from local storage
 * @param key Storage key
 * @returns Retrieved data or null if not found
 */
export function getFromLocalStorage<T>(key: string): T | null {
  try {
    const serializedData = localStorage.getItem(key);
    if (!serializedData) return null;
    return JSON.parse(serializedData) as T;
  } catch (error) {
    console.error('Error retrieving from localStorage:', error);
    return null;
  }
}

/**
 * Remove data from local storage
 * @param key Storage key to remove
 */
export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

/**
 * Clear all data from local storage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}
