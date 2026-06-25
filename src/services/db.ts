/**
 * Camada de dados unificada.
 *
 * - Sem `VITE_API_URL`: usa IndexedDB local (Dexie) — comportamento original.
 * - Com `VITE_API_URL`: usa o backend (Railway) via API REST.
 *
 * As leituras falham de forma segura (retornam vazio) e as escritas registram
 * erros sem derrubar a aplicação.
 */

export * from "./dbTypes";

import { isRemote } from "./apiClient";
import * as local from "./dbLocal";
import * as remote from "./dbRemote";
import type {
  DBColumnMapping,
  DBDRERule,
  DBDashboardLayout,
  DBFileData,
  DBProject,
  DBShareSnapshot,
  DBTransaction,
  DBUser,
} from "./dbTypes";

const remoteMode = isRemote();

async function safeRead<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[db] ${label} falhou`, error);
    return fallback;
  }
}

async function safeWrite(fn: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[db] ${label} falhou`, error);
  }
}

export async function getProjects(): Promise<DBProject[]> {
  return safeRead(() => (remoteMode ? remote.getProjects() : local.getProjects()), [], "getProjects");
}

export async function getProject(id: string): Promise<DBProject | undefined> {
  return safeRead(
    () => (remoteMode ? remote.getProject(id) : local.getProject(id)),
    undefined,
    "getProject",
  );
}

export async function saveProject(project: DBProject): Promise<void> {
  return safeWrite(() => (remoteMode ? remote.saveProject(project) : local.saveProject(project)), "saveProject");
}

export async function deleteProject(id: string): Promise<void> {
  return safeWrite(() => (remoteMode ? remote.deleteProject(id) : local.deleteProject(id)), "deleteProject");
}

export async function saveFileData(data: DBFileData): Promise<void> {
  return safeWrite(() => (remoteMode ? remote.saveFileData(data) : local.saveFileData(data)), "saveFileData");
}

export async function getFileData(projectId: string): Promise<DBFileData | undefined> {
  return safeRead(
    () => (remoteMode ? remote.getFileData(projectId) : local.getFileData(projectId)),
    undefined,
    "getFileData",
  );
}

export async function saveMappings(
  projectId: string,
  mappings: Omit<DBColumnMapping, "id" | "projectId">[],
): Promise<void> {
  return safeWrite(
    () => (remoteMode ? remote.saveMappings(projectId, mappings) : local.saveMappings(projectId, mappings)),
    "saveMappings",
  );
}

export async function getMappings(projectId: string): Promise<DBColumnMapping[]> {
  return safeRead(
    () => (remoteMode ? remote.getMappings(projectId) : local.getMappings(projectId)),
    [],
    "getMappings",
  );
}

export async function saveTransactions(
  projectId: string,
  transactions: Omit<DBTransaction, "projectId">[],
): Promise<void> {
  return safeWrite(
    () =>
      remoteMode
        ? remote.saveTransactions(projectId, transactions)
        : local.saveTransactions(projectId, transactions),
    "saveTransactions",
  );
}

export async function getTransactions(projectId: string): Promise<DBTransaction[]> {
  return safeRead(
    () => (remoteMode ? remote.getTransactions(projectId) : local.getTransactions(projectId)),
    [],
    "getTransactions",
  );
}

export async function saveDashboardLayout(layout: DBDashboardLayout): Promise<void> {
  return safeWrite(
    () => (remoteMode ? remote.saveDashboardLayout(layout) : local.saveDashboardLayout(layout)),
    "saveDashboardLayout",
  );
}

export async function getDashboardLayout(
  projectId: string,
): Promise<DBDashboardLayout | undefined> {
  return safeRead(
    () => (remoteMode ? remote.getDashboardLayout(projectId) : local.getDashboardLayout(projectId)),
    undefined,
    "getDashboardLayout",
  );
}

export async function saveDRERules(projectId: string, rules: DBDRERule[]): Promise<void> {
  return safeWrite(
    () => (remoteMode ? remote.saveDRERules(projectId, rules) : local.saveDRERules(projectId, rules)),
    "saveDRERules",
  );
}

export async function getDRERules(projectId: string): Promise<DBDRERule[]> {
  return safeRead(
    () => (remoteMode ? remote.getDRERules(projectId) : local.getDRERules(projectId)),
    [],
    "getDRERules",
  );
}

export async function getShare(token: string): Promise<DBShareSnapshot | undefined> {
  return safeRead(
    () => (remoteMode ? remote.getShare(token) : local.getShare(token)),
    undefined,
    "getShare",
  );
}

export async function saveShare(snapshot: DBShareSnapshot): Promise<void> {
  return safeWrite(() => (remoteMode ? remote.saveShare(snapshot) : local.saveShare(snapshot)), "saveShare");
}

// Usuários: usados apenas no modo local (no modo remoto a autenticação é no servidor).
export async function getUser(username: string): Promise<DBUser | undefined> {
  return local.getUser(username);
}

export async function saveUser(user: DBUser): Promise<unknown> {
  return local.saveUser(user);
}

export async function deleteUser(username: string): Promise<unknown> {
  return local.deleteUser(username);
}
