import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as db from '@/services/db';
import { generateMockTransactions } from '@/data/mockData';

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
    db.getProjects().then(async loaded => {
      if (loaded.length > 0) {
        setProjects(loaded);
        setLoading(false);
      } else {
        const demoProject: Project = {
          id: 'demo-' + Date.now(),
          name: 'Projeto Demo',
          segment: 'Serviços',
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
          lastProcessed: new Date().toISOString(),
        };
        await db.saveProject(demoProject);
        setProjects([demoProject]);
        setCurrentProjectState(demoProject);

        const mockTxns = generateMockTransactions();
        setTransactionsState(mockTxns);
        await db.saveTransactions(demoProject.id, mockTxns as any);

        setLoading(false);
      }
    });
  }, []);

  const addProject = useCallback(async (p: Project) => {
    await db.saveProject(p);
    setProjects(prev => [p, ...prev]);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await db.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProjectState(null);
    }
  }, [currentProject]);

  const setCurrentProject = useCallback(async (p: Project | null) => {
    setCurrentProjectState(p);
    if (p) {
      const file = await db.getFileData(p.id);
      if (file) setCurrentFileState(file as ParsedFileData);
      const mappings = await db.getMappings(p.id);
      if (mappings.length) setColumnMappingsState(mappings as ColumnMapping[]);
      const txns = await db.getTransactions(p.id);
      if (txns.length) setTransactionsState(txns as unknown as Transaction[]);

      const savedTables = localStorage.getItem(`datfin_tables_${p.id}`);
      if (savedTables) setAdditionalTables(JSON.parse(savedTables));
      else setAdditionalTables([]);

      const savedRels = localStorage.getItem(`datfin_rels_${p.id}`);
      if (savedRels) setTableRelationships(JSON.parse(savedRels));
      else setTableRelationships([]);

      const savedRLS = localStorage.getItem(`datfin_rls_${p.id}`);
      if (savedRLS) setRLSRulesState(JSON.parse(savedRLS));
      else setRLSRulesState([]);
    }
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
      await db.saveMappings(currentProject.id, m as any);
    }
  }, [currentProject]);

  const setTransactions = useCallback(async (t: Transaction[]) => {
    setTransactionsState(t);
    if (currentProject) {
      await db.saveTransactions(currentProject.id, t as any);
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
        localStorage.setItem(`datfin_tables_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const removeTable = useCallback((id: string) => {
    setAdditionalTables(prev => {
      const updated = prev.filter(t => t.id !== id);
      if (currentProject) {
        localStorage.setItem(`datfin_tables_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
    setTableRelationships(prev => {
      const updated = prev.filter(r => r.leftTable !== id && r.rightTable !== id);
      if (currentProject) {
        localStorage.setItem(`datfin_rels_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const addRelationship = useCallback((rel: TableRelationship) => {
    setTableRelationships(prev => {
      const updated = [...prev, rel];
      if (currentProject) {
        localStorage.setItem(`datfin_rels_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const removeRelationship = useCallback((id: string) => {
    setTableRelationships(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (currentProject) {
        localStorage.setItem(`datfin_rels_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const setRLSRules = useCallback((rules: RLSRule[]) => {
    setRLSRulesState(rules);
    if (currentProject) {
      localStorage.setItem(`datfin_rls_${currentProject.id}`, JSON.stringify(rules));
    }
  }, [currentProject]);

  const addRLSRule = useCallback((rule: RLSRule) => {
    setRLSRulesState(prev => {
      const updated = [...prev, rule];
      if (currentProject) {
        localStorage.setItem(`datfin_rls_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const removeRLSRule = useCallback((id: string) => {
    setRLSRulesState(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (currentProject) {
        localStorage.setItem(`datfin_rls_${currentProject.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentProject]);

  const getRLSFilteredData = useCallback((userRole: string): Transaction[] => {
    if (userRole === 'admin') return transactions;
    const userRule = rlsRules.find(r => r.role === userRole);
    if (!userRule) return transactions;
    return transactions.filter(t => {
      const val = (t as any)[userRule.column];
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
