import Dexie, { type EntityTable } from "dexie";
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

const db = new Dexie("DataFinDB") as Dexie & {
  projects: EntityTable<DBProject, "id">;
  files: EntityTable<DBFileData, "id">;
  mappings: EntityTable<DBColumnMapping, "id">;
  transactions: EntityTable<DBTransaction, "id">;
  users: EntityTable<DBUser, "username">;
  layouts: EntityTable<DBDashboardLayout, "id">;
  shares: EntityTable<DBShareSnapshot, "token">;
  dreRules: EntityTable<DBDRERule, "id">;
};

db.version(1).stores({
  projects: "id, status, createdAt",
  files: "++id, projectId",
  mappings: "++id, projectId",
  transactions: "++id, projectId, date, category, flowType",
  users: "username",
  layouts: "++id, projectId",
});

db.version(2).stores({
  projects: "id, status, createdAt",
  files: "++id, projectId",
  mappings: "++id, projectId",
  transactions: "++id, projectId, date, category, flowType",
  users: "username",
  layouts: "++id, projectId",
  shares: "token, createdAt",
});

db.version(3).stores({
  projects: "id, status, createdAt",
  files: "++id, projectId",
  mappings: "++id, projectId",
  transactions: "++id, projectId, date, category, flowType",
  users: "username",
  layouts: "++id, projectId",
  shares: "token, createdAt",
  dreRules: "id, projectId, priority, dreGroup, field",
});

export { db };

export async function saveProject(project: DBProject) {
  return db.projects.put(project);
}

export async function getProjects(): Promise<DBProject[]> {
  return db.projects.orderBy("createdAt").reverse().toArray();
}

export async function getProject(id: string): Promise<DBProject | undefined> {
  return db.projects.get(id);
}

export async function deleteProject(id: string) {
  await db.projects.delete(id);
  await db.files.where("projectId").equals(id).delete();
  await db.mappings.where("projectId").equals(id).delete();
  await db.transactions.where("projectId").equals(id).delete();
  await db.dreRules.where("projectId").equals(id).delete();
}

export async function saveFileData(data: DBFileData) {
  await db.files.where("projectId").equals(data.projectId).delete();
  return db.files.add(data);
}

export async function getFileData(projectId: string): Promise<DBFileData | undefined> {
  return db.files.where("projectId").equals(projectId).first();
}

export async function saveMappings(
  projectId: string,
  mappings: Omit<DBColumnMapping, "id" | "projectId">[],
) {
  await db.mappings.where("projectId").equals(projectId).delete();
  return db.mappings.bulkAdd(mappings.map((m) => ({ ...m, projectId })));
}

export async function getMappings(projectId: string): Promise<DBColumnMapping[]> {
  return db.mappings.where("projectId").equals(projectId).toArray();
}

export async function saveTransactions(
  projectId: string,
  transactions: Omit<DBTransaction, "projectId">[],
) {
  await db.transactions.where("projectId").equals(projectId).delete();
  return db.transactions.bulkAdd(
    transactions.map((transaction, index) => {
      const scopedId = transaction.id?.startsWith(`${projectId}::`)
        ? transaction.id
        : `${projectId}::${transaction.id ?? index}`;

      return {
        ...transaction,
        id: scopedId,
        projectId,
      };
    }),
  );
}

export async function getTransactions(projectId: string): Promise<DBTransaction[]> {
  return db.transactions.where("projectId").equals(projectId).toArray();
}

export async function saveDashboardLayout(layout: DBDashboardLayout) {
  await db.layouts.where("projectId").equals(layout.projectId).delete();
  return db.layouts.add(layout);
}

export async function getDashboardLayout(projectId: string): Promise<DBDashboardLayout | undefined> {
  return db.layouts.where("projectId").equals(projectId).first();
}

export async function saveDRERules(projectId: string, rules: DBDRERule[]) {
  await db.dreRules.where("projectId").equals(projectId).delete();
  if (rules.length === 0) {
    return;
  }

  return db.dreRules.bulkPut(rules.map((rule) => ({ ...rule, projectId })));
}

export async function getDRERules(projectId: string): Promise<DBDRERule[]> {
  return db.dreRules.where("projectId").equals(projectId).sortBy("priority");
}

export async function getUser(username: string): Promise<DBUser | undefined> {
  return db.users.get(username);
}

export async function saveUser(user: DBUser) {
  return db.users.put(user);
}

export async function deleteUser(username: string) {
  return db.users.delete(username);
}

export async function getShare(token: string): Promise<DBShareSnapshot | undefined> {
  return db.shares.get(token);
}

export async function saveShare(snapshot: DBShareSnapshot) {
  return db.shares.put(snapshot);
}
