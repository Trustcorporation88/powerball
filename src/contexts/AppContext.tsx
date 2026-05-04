import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as db from '@/services/db';
import { generateMockTransactions } from '@/data/mockData';
import { buildProjectStorageKey, readStorage, removeStorage, writeStorage } from '@/services/storage';

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

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const loadedProjects = await db.getProjects();

      if (cancelled) {
        return;
      }

      if (loadedProjects.length > 0) {
        setProjects(loadedProjects);
        setLoading(false);
        return;
      }

      const demoProject: Project = {
        id: `demo-${Date.now()}`,
        name: 'Projeto Demo',
        segment: 'Serviços',
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        lastProcessed: new Date().toISOString(),
      };
      const mockTxns = generateMockTransactions();

      await Promise.all([
        db.saveProject(demoProject),
        db.saveTransactions(demoProject.id, mockTxns),
      ]);

      if (cancelled) {
        return;
      }

      setProjects([demoProject]);
      setCurrentProjectState(demoProject);
      setTransactionsState(mockTxns);
      setLoading(false);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

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
    }
  }, [currentProject]);

  const setCurrentProject = useCallback(async (p: Project | null) => {
    setCurrentProjectState(p);
    if (!p) {
      setCurrentFileState(null);
      setColumnMappingsState([]);
      setTransactionsState([]);
      setAdditionalTables([]);
      setTableRelationships([]);
      setRLSRulesState([]);
      return;
    }

    const [file, mappings, txns] = await Promise.all([
      db.getFileData(p.id),
      db.getMappings(p.id),
      db.getTransactions(p.id),
    ]);

    setCurrentFileState(file ? (file as ParsedFileData) : null);
    setColumnMappingsState(mappings as ColumnMapping[]);
    setTransactionsState(txns as Transaction[]);
    setAdditionalTables(readStorage<AdditionalTable[]>(getTablesKey(p.id), []));
    setTableRelationships(readStorage<TableRelationship[]>(getRelationshipsKey(p.id), []));
    setRLSRulesState(readStorage<RLSRule[]>(getRlsKey(p.id), []));
  }, []);

  const setCurrentFile = useCallback(async (f: ParsedFileData | null) => {
    setCurrentFileState(f);
    if (f && currentProject) {
      await db.saveFileData({
        projectId: currentProject.id,
        name: f.name,
        sheets: f.sheets,
        selectedSheet: f.selectedSheet,
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
      additionalTables, tableRelationships, rlsRules,
      addProject, removeProject, setCurrentProject, setCurrentFile, setColumnMappings,
      setTransactions, updateProjectStatus,
      addTable, removeTable, addRelationship, removeRelationship,
      setRLSRules, addRLSRule, removeRLSRule, getRLSFilteredData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
