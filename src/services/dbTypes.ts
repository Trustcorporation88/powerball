export interface DBProject {
  id: string;
  name: string;
  segment: string;
  status: "active" | "processing" | "error";
  createdAt: string;
  lastProcessed?: string;
}

export interface DBFileData {
  id?: number;
  projectId: string;
  name: string;
  sheets: any[];
  selectedSheet: string;
  selectedSheets?: string[];
  importMode?: "single" | "combine";
  headers: string[];
  preview: any[];
  allData: any[];
}

export interface DBColumnMapping {
  id?: number;
  projectId: string;
  originalName: string;
  detectedType: string;
  confirmedType: string;
  financialRole: string;
}

export interface DBTransaction {
  id?: string;
  projectId: string;
  date: string;
  description: string;
  category: string;
  dreGroup?: string;
  dreOriginalGroup?: string;
  subcategory: string;
  account: string;
  costCenter: string;
  unit: string;
  value: number;
  currency: string;
  flowType: "income" | "expense";
}

export interface DBUser {
  username: string;
  passwordHash: string;
  salt: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface DBDashboardLayout {
  id?: number;
  projectId: string;
  layout: any;
  name: string;
}

export interface DBShareSnapshot {
  token: string;
  createdAt: string;
  projectName: string;
  snapshotJson: string;
}

export interface DBDRERule {
  id: string;
  projectId: string;
  field: string;
  operator: string;
  value: string;
  dreGroup: string;
  priority: number;
  createdAt: string;
}
