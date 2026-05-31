import React, { createContext, useContext, useState, useCallback } from "react";

export interface Project {
  id: string;
  name: string;
  segment: string;
  status: "active" | "processing" | "error";
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
  flowType: "income" | "expense";
}

export interface ParsedFileData {
  name: string;
  sheets: string[];
  selectedSheet: string;
  headers: string[];
  preview: Record<string, unknown>[];
  allData: Record<string, unknown>[];
}

interface AppContextType {
  projects: Project[];
  currentProject: Project | null;
  currentFile: ParsedFileData | null;
  columnMappings: ColumnMapping[];
  transactions: Transaction[];
  addProject: (project: Project) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentFile: (file: ParsedFileData | null) => void;
  setColumnMappings: (mappings: ColumnMapping[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  updateProjectStatus: (id: string, status: Project["status"]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Análise Q1 2024",
      segment: "Serviços",
      status: "active",
      createdAt: "2024-01-15",
      lastProcessed: "2024-01-20",
    },
    {
      id: "2",
      name: "Fluxo de Caixa Cliente A",
      segment: "Consultoria",
      status: "active",
      createdAt: "2024-02-10",
      lastProcessed: "2024-02-12",
    },
  ]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentFile, setCurrentFile] = useState<ParsedFileData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  const updateProjectStatus = useCallback((id: string, status: Project["status"]) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, lastProcessed: new Date().toISOString().split("T")[0] } : p))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects,
        currentProject,
        currentFile,
        columnMappings,
        transactions,
        addProject,
        setCurrentProject,
        setCurrentFile,
        setColumnMappings,
        setTransactions,
        updateProjectStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};