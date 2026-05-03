import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as db from '@/services/db';

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

interface AppContextType {
  projects: Project[];
  currentProject: Project | null;
  currentFile: ParsedFileData | null;
  columnMappings: ColumnMapping[];
  transactions: Transaction[];
  loading: boolean;
  addProject: (p: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  setCurrentProject: (p: Project | null) => Promise<void>;
  setCurrentFile: (f: ParsedFileData | null) => Promise<void>;
  setColumnMappings: (m: ColumnMapping[]) => Promise<void>;
  setTransactions: (t: Transaction[]) => Promise<void>;
  updateProjectStatus: (id: string, status: 'active' | 'processing' | 'error') => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [currentFile, setCurrentFileState] = useState<ParsedFileData | null>(null);
  const [columnMappings, setColumnMappingsState] = useState<ColumnMapping[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getProjects().then(loaded => {
      if (loaded.length > 0) {
        setProjects(loaded);
      }
      setLoading(false);
    });
  }, []);

  const addProject = useCallback(async (p: Project) => {
    await db.saveProject(p);
    setProjects(prev => [p, ...prev]);
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await db.deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const setCurrentProject = useCallback(async (p: Project | null) => {
    setCurrentProjectState(p);
    if (p) {
      const file = await db.getFileData(p.id);
      if (file) setCurrentFileState(file as ParsedFileData);
      const mappings = await db.getMappings(p.id);
      if (mappings.length) setColumnMappingsState(mappings as ColumnMapping[]);
      const txns = await db.getTransactions(p.id);
      if (txns.length) setTransactionsState(txns as unknown as Transaction[]);
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

  return (
    <AppContext.Provider value={{
      projects, currentProject, currentFile, columnMappings, transactions, loading,
      addProject, removeProject, setCurrentProject, setCurrentFile, setColumnMappings,
      setTransactions, updateProjectStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
