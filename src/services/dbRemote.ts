import { apiFetch } from "./apiClient";
import type {
  DBColumnMapping,
  DBDRERule,
  DBDashboardLayout,
  DBFileData,
  DBProject,
  DBShareSnapshot,
  DBTransaction,
} from "./dbTypes";

export async function saveProject(project: DBProject): Promise<void> {
  await apiFetch("/projects", { method: "POST", body: project });
}

export async function getProjects(): Promise<DBProject[]> {
  return apiFetch<DBProject[]>("/projects");
}

export async function getProject(id: string): Promise<DBProject | undefined> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id);
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveFileData(data: DBFileData): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(data.projectId)}/file`, {
    method: "PUT",
    body: data,
  });
}

export async function getFileData(projectId: string): Promise<DBFileData | undefined> {
  const file = await apiFetch<DBFileData | null>(
    `/projects/${encodeURIComponent(projectId)}/file`,
  );
  return file ?? undefined;
}

export async function saveMappings(
  projectId: string,
  mappings: Omit<DBColumnMapping, "id" | "projectId">[],
): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(projectId)}/mappings`, {
    method: "PUT",
    body: mappings,
  });
}

export async function getMappings(projectId: string): Promise<DBColumnMapping[]> {
  return apiFetch<DBColumnMapping[]>(`/projects/${encodeURIComponent(projectId)}/mappings`);
}

export async function saveTransactions(
  projectId: string,
  transactions: Omit<DBTransaction, "projectId">[],
): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(projectId)}/transactions`, {
    method: "PUT",
    body: transactions,
  });
}

export async function getTransactions(projectId: string): Promise<DBTransaction[]> {
  return apiFetch<DBTransaction[]>(`/projects/${encodeURIComponent(projectId)}/transactions`);
}

export async function saveDashboardLayout(layout: DBDashboardLayout): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(layout.projectId)}/layout`, {
    method: "PUT",
    body: { name: layout.name, layout: layout.layout },
  });
}

export async function getDashboardLayout(
  projectId: string,
): Promise<DBDashboardLayout | undefined> {
  const layout = await apiFetch<DBDashboardLayout | null>(
    `/projects/${encodeURIComponent(projectId)}/layout`,
  );
  return layout ?? undefined;
}

export async function saveDRERules(projectId: string, rules: DBDRERule[]): Promise<void> {
  await apiFetch(`/projects/${encodeURIComponent(projectId)}/dre-rules`, {
    method: "PUT",
    body: rules,
  });
}

export async function getDRERules(projectId: string): Promise<DBDRERule[]> {
  return apiFetch<DBDRERule[]>(`/projects/${encodeURIComponent(projectId)}/dre-rules`);
}

export async function getShare(token: string): Promise<DBShareSnapshot | undefined> {
  const snapshot = await apiFetch<DBShareSnapshot | null>(
    `/shares/${encodeURIComponent(token)}`,
  );
  return snapshot ?? undefined;
}

export async function saveShare(snapshot: DBShareSnapshot): Promise<void> {
  await apiFetch("/shares", { method: "POST", body: snapshot });
}
