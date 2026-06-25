import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as db from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { buildProjectStorageKey, readStorage, removeStorage, writeStorage } from '@/services/storage';
import type { DREClassificationRule } from '@/services/dreRules';

export interface Project {
  id: string;
  name: string;
  segment: string;
  status: 'active' | 'processing' | 'error';
  createdAt: string;
  lastProcessed?: string;
}

export interface ColumnMapping {
  originalName: string;
  detectedType: string;
  confirmedType: string;
  financialRole: string;
}

export interface Transaction {
  id: string;
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
  flowType: 'income' | 'expense';
}

export interface ParsedFileData {
  name: string;
  sheets: any[];
  selectedSheet: string;
  selectedSheets?: string[];
  importMode?: 'single' | 'combine';
  headers: string[];
  preview: any[];
  allData: any[];
}

export interface AdditionalTable {
  id: string;
  name: string;
  fileName: string;
  headers: string[];
  data: any[];
  rowCount: number;
}

export interface TableRelationship {
  id: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: 'inner' | 'left';
}

export interface RLSRule {
  id: string;
  column: string;
  values: string[];
  role: string;
}

interface AppContextType {
  projects: Project[];
  currentProject: Project | null;
  currentFile: ParsedFileData | null;
  columnMappings: ColumnMapping[];
  transactions: Transaction[];
  loading: boolean;
  additionalTables: AdditionalTable[];
  tableRelationships: TableRelationship[];
  rlsRules: RLSRule[];
  dreRules: DREClassificationRule[];
  addProject: (p: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  setCurrentProject: (p: Project | null) => Promise<void>;
  setCurrentFile: (f: ParsedFileData | null) => Promise<void>;
  setColumnMappings: (m: ColumnMapping[]) => Promise<void>;
  setTransactions: (t: Transaction[]) => Promise<void>;
  updateProjectStatus: (id: string, status: 'active' | 'processing' | 'error') => Promise<void>;
  addTable: (table: AdditionalTable) => void;
  removeTable: (id: string) => void;
  addRelationship: (rel: TableRelationship) => void;
  removeRelationship: (id: string) => void;
  setRLSRules: (rules: RLSRule[]) => void;
  addRLSRule: (rule: RLSRule) => void;
  removeRLSRule: (id: string) => void;
  setDRERules: (rules: DREClassificationRule[]) => Promise<void>;
  getRLSFilteredData: (userRole: string) => Transaction[];
}

const AppContext = createContext<AppContextType>({} as AppContextType);

function getTablesKey(projectId: string): string {
  return buildProjectStorageKey(projectId, 'tables');
}

function getRelationshipsKey(projectId: string): string {
  return buildProjectStorageKey(projectId, 'relationships');
}

function getRlsKey(projectId: string): string {
  return buildProjectStorageKey(projectId, 'rls');
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [currentFile, setCurrentFileState] = useState<ParsedFileData | null>(null);
  const [columnMappings, setColumnMappingsState] = useState<ColumnMapping[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionalTables, setAdditionalTables] = useState<AdditionalTable[]>([]);
  const [tableRelationships, setTableRelationships] = useState<TableRelationship[]>([]);
  const [rlsRules, setRLSRulesState] = useState<RLSRule[]>([]);
  const [dreRules, setDRERulesState] = useState<DREClassificationRule[]>([]);

  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // Sem usuário autenticado não há nada para carregar (e, no modo remoto,
      // a API exige token). Recarrega sempre que o usuário muda (login/logout).
      if (!userId) {
        if (!cancelled) {
          setProjects([]);
          setCurrentProjectState(null);
          setCurrentFileState(null);
          setColumnMappingsState([]);
          setTransactionsState([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const loadedProjects = await db.getProjects();

      if (cancelled) {
        return;
      }

      setProjects(loadedProjects);
      setLoading(false);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addProject = useCallback(async (p: Project) => {
    await db.saveProject(p);
    setProjects(prev => [p, ...prev]);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await db.deleteProject(id);
    removeStorage(getTablesKey(id));
    removeStorage(getRelationshipsKey(id));
    removeStorage(getRlsKey(id));
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProjectState(null);
      setCurrentFileState(null);
      setColumnMappingsState([]);
      setTransactionsState([]);
      setAdditionalTables([]);
      setTableRelationships([]);
      setRLSRulesState([]);
      setDRERulesState([]);
    }
  }, [currentProject]);

  const setCurrentProject = useCallback(async (p: Project | null) => {
    setCurrentProjectState(p);
    setCurrentFileState(null);
    setColumnMappingsState([]);
    setTransactionsState([]);
    setAdditionalTables([]);
    setTableRelationships([]);
    setRLSRulesState([]);
    setDRERulesState([]);

    if (!p) {
      return;
    }

    const [file, mappings, txns, projectDreRules] = await Promise.all([
      db.getFileData(p.id),
      db.getMappings(p.id),
      db.getTransactions(p.id),
      db.getDRERules(p.id),
    ]);

    setCurrentFileState(file ? (file as ParsedFileData) : null);
    setColumnMappingsState(mappings as ColumnMapping[]);
    setTransactionsState(txns as Transaction[]);
    setAdditionalTables(readStorage<AdditionalTable[]>(getTablesKey(p.id), []));
    setTableRelationships(readStorage<TableRelationship[]>(getRelationshipsKey(p.id), []));
    setRLSRulesState(readStorage<RLSRule[]>(getRlsKey(p.id), []));
    setDRERulesState(projectDreRules as DREClassificationRule[]);
  }, []);

  const setCurrentFile = useCallback(async (f: ParsedFileData | null) => {
    setCurrentFileState(f);
    if (f && currentProject) {
      await db.saveFileData({
        projectId: currentProject.id,
        name: f.name,
        sheets: f.sheets,
        selectedSheet: f.selectedSheet,
        selectedSheets: f.selectedSheets,
        importMode: f.importMode,
        headers: f.headers,
        preview: f.preview,
        allData: f.allData,
      });
    }
  }, [currentProject]);

  const setColumnMappings = useCallback(async (m: ColumnMapping[]) => {
    setColumnMappingsState(m);
    if (currentProject) {
      await db.saveMappings(currentProject.id, m);
    }
  }, [currentProject]);

  const setTransactions = useCallback(async (t: Transaction[]) => {
    setTransactionsState(t);
    if (currentProject) {
      await db.saveTransactions(currentProject.id, t);
    }
  }, [currentProject]);

  const updateProjectStatus = useCallback(async (id: string, status: 'active' | 'processing' | 'error') => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status, lastProcessed: new Date().toISOString() } : p));
    const project = projects.find(p => p.id === id);
    if (project) {
      await db.saveProject({ ...project, status, lastProcessed: new Date().toISOString() });
    }
  }, [projects]);

  const addTable = useCallback((table: AdditionalTable) => {
    setAdditionalTables(prev => {
      const updated = [...prev, table];
      if (currentProject) {
        writeStorage(getTablesKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const removeTable = useCallback((id: string) => {
    setAdditionalTables(prev => {
      const updated = prev.filter(t => t.id !== id);
      if (currentProject) {
        writeStorage(getTablesKey(currentProject.id), updated);
      }
      return updated;
    });
    setTableRelationships(prev => {
      const updated = prev.filter(r => r.leftTable !== id && r.rightTable !== id);
      if (currentProject) {
        writeStorage(getRelationshipsKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const addRelationship = useCallback((rel: TableRelationship) => {
    setTableRelationships(prev => {
      const updated = [...prev, rel];
      if (currentProject) {
        writeStorage(getRelationshipsKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const removeRelationship = useCallback((id: string) => {
    setTableRelationships(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (currentProject) {
        writeStorage(getRelationshipsKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const setRLSRules = useCallback((rules: RLSRule[]) => {
    setRLSRulesState(rules);
    if (currentProject) {
      writeStorage(getRlsKey(currentProject.id), rules);
    }
  }, [currentProject]);

  const addRLSRule = useCallback((rule: RLSRule) => {
    setRLSRulesState(prev => {
      const updated = [...prev, rule];
      if (currentProject) {
        writeStorage(getRlsKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const removeRLSRule = useCallback((id: string) => {
    setRLSRulesState(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (currentProject) {
        writeStorage(getRlsKey(currentProject.id), updated);
      }
      return updated;
    });
  }, [currentProject]);

  const setDRERules = useCallback(async (rules: DREClassificationRule[]) => {
    setDRERulesState(rules);
    if (currentProject) {
      await db.saveDRERules(currentProject.id, rules);
    }
  }, [currentProject]);

  const getRLSFilteredData = useCallback((userRole: string): Transaction[] => {
    if (userRole === 'admin') return transactions;
    const userRule = rlsRules.find(r => r.role === userRole);
    if (!userRule) return transactions;
    return transactions.filter(t => {
      const val = t[userRule.column as keyof Transaction];
      return userRule.values.includes(String(val));
    });
  }, [transactions, rlsRules]);

  return (
    <AppContext.Provider value={{
      projects, currentProject, currentFile, columnMappings, transactions, loading,
      additionalTables, tableRelationships, rlsRules, dreRules,
      addProject, removeProject, setCurrentProject, setCurrentFile, setColumnMappings,
      setTransactions, updateProjectStatus,
      addTable, removeTable, addRelationship, removeRelationship,
      setRLSRules, addRLSRule, removeRLSRule, setDRERules, getRLSFilteredData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
