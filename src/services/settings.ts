import { readStorage, writeStorage } from "./storage";

export interface UserPreferences {
  processingAlerts: boolean;
  weeklyReports: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  processingAlerts: true,
  weeklyReports: false,
};

function getSettingsKey(email: string): string {
  return `datafin:settings:${email}`;
}

export function getUserPreferences(email: string): UserPreferences {
  return readStorage<UserPreferences>(getSettingsKey(email), DEFAULT_PREFERENCES);
}

export function saveUserPreferences(email: string, preferences: UserPreferences): void {
  writeStorage(getSettingsKey(email), preferences);
}

