import { useMemo } from "react";
import { Transaction } from "@/contexts/AppContext";

export interface DashboardFilters {
  period: string;
  category: string;
  costCenter: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface KpiData {
  income: number;
  expense: number;
  balance: number;
  margin: number;
  incomeTrend: number;
  expenseTrend: number;
  balanceTrend: number;
  marginTrend: number;
  transactionCount: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

export interface CostCenterData {
  name: string;
  value: number;
  income: number;
  expense: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function useDashboardData(transactions: Transaction[], filters: DashboardFilters) {
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.costCenter !== "all" && t.costCenter !== filters.costCenter) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const match = 
          t.description.toLowerCase().includes(searchLower) ||
          t.category.toLowerCase().includes(searchLower) ||
          t.costCenter.toLowerCase().includes(searchLower);
        if (!match) return false;
      }
      
      const tDate = new Date(t.date);
      const now = new Date();
      
      switch (filters.period) {
        case "today": {
          const today = now.toISOString().split("T")[0];
          if (t.date !== today) return false;
          break;
        }
        case "7days": {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (tDate < sevenDaysAgo) return false;
          break;
        }
        case "30days": {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (tDate < thirtyDaysAgo) return false;
          break;
        }
        case "thisMonth": {
          if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
          break;
        }
        case "thisQuarter": {
          const quarter = Math.floor(now.getMonth() / 3);
          const tQuarter = Math.floor(tDate.getMonth() / 3);
          if (tQuarter !== quarter || tDate.getFullYear() !== now.getFullYear()) return false;
          break;
        }
        case "thisYear": {
          if (tDate.getFullYear() !== now.getFullYear()) return false;
          break;
        }
        case "q1": {
          if (tDate.getMonth() > 2 || tDate.getFullYear() !== 2024) return false;
          break;
        }
        case "q2": {
          if (tDate.getMonth() < 3 || tDate.getMonth() > 5 || tDate.getFullYear() !== 2024) return false;
          break;
        }
        case "custom": {
          if (filters.startDate && t.date < filters.startDate) return false;
          if (filters.endDate && t.date > filters.endDate) return false;
          break;
        }
      }
      return true;
    });
  }, [transactions, filters]);

  const previousPeriodTransactions = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    const dates = filteredTransactions.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const periodLength = maxDate.getTime() - minDate.getTime();
    
    const prevStart = new Date(minDate.getTime() - periodLength - 86400000);
    const prevEnd = new Date(minDate.getTime() - 86400000);
    
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevStart && d <= prevEnd;
    });
  }, [filteredTransactions, transactions]);

  const kpis = useMemo((): KpiData => {
    const income = filteredTransactions.filter((t) => t.flowType === "income").reduce((sum, t) => sum + t.value, 0);
    const expense = filteredTransactions.filter((t) => t.flowType === "expense").reduce((sum, t) => sum + Math.abs(t.value), 0);
    const balance = income - expense;
    const margin = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    const prevIncome = previousPeriodTransactions.filter((t) => t.flowType === "income").reduce((sum, t) => sum + t.value, 0);
    const prevExpense = previousPeriodTransactions.filter((t) => t.flowType === "expense").reduce((sum, t) => sum + Math.abs(t.value), 0);
    const prevBalance = prevIncome - prevExpense;
    const prevMargin = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome) * 100 : 0;
    
    const safeTrend = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / Math.abs(prev)) * 100;
    
    return {
      income: round2(income),
      expense: round2(expense),
      balance: round2(balance),
      margin: round2(margin),
      incomeTrend: round2(safeTrend(income, prevIncome)),
      expenseTrend: round2(safeTrend(expense, prevExpense)),
      balanceTrend: round2(safeTrend(balance, prevBalance)),
      marginTrend: round2(safeTrend(margin, prevMargin)),
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions, previousPeriodTransactions]);

  const monthlyData = useMemo((): MonthlyData[] => {
    const grouped: Record<string, MonthlyData> = {};
    filteredTransactions.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, income: 0, expense: 0, balance: 0 };
      if (t.flowType === "income") grouped[month].income += t.value;
      else grouped[month].expense += Math.abs(t.value);
      grouped[month].balance = grouped[month].income - grouped[month].expense;
    });
    return Object.values(grouped)
      .map(m => ({ ...m, income: round2(m.income), expense: round2(m.expense), balance: round2(m.balance) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions]);

  const categoryData = useMemo((): CategoryData[] => {
    const grouped: Record<string, number> = {};
    let total = 0;
    filteredTransactions.filter((t) => t.flowType === "expense").forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + Math.abs(t.value);
      total += Math.abs(t.value);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: round2(value), percentage: total > 0 ? round2((value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTransactions]);

  const costCenterData = useMemo((): CostCenterData[] => {
    const grouped: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach((t) => {
      if (!grouped[t.costCenter]) grouped[t.costCenter] = { income: 0, expense: 0 };
      if (t.flowType === "income") grouped[t.costCenter].income += t.value;
      else grouped[t.costCenter].expense += Math.abs(t.value);
    });
    return Object.entries(grouped)
      .map(([name, { income, expense }]) => ({ 
        name, 
        value: round2(Math.abs(income - expense)), 
        income: round2(income), 
        expense: round2(expense) 
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))], [transactions]);
  const costCenters = useMemo(() => [...new Set(transactions.map((t) => t.costCenter))], [transactions]);

  const topCategories = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + Math.abs(t.value);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: round2(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredTransactions]);

  const ytdData = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdTransactions = transactions.filter(t => new Date(t.date) >= yearStart);
    const income = ytdTransactions.filter(t => t.flowType === "income").reduce((s, t) => s + t.value, 0);
    const expense = ytdTransactions.filter(t => t.flowType === "expense").reduce((s, t) => s + Math.abs(t.value), 0);
    return { income: round2(income), expense: round2(expense), balance: round2(income - expense) };
  }, [transactions]);

  return {
    filteredTransactions,
    kpis,
    monthlyData,
    categoryData,
    costCenterData,
    categories,
    costCenters,
    topCategories,
    ytdData,
  };
}