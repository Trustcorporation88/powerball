import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, FolderOpen, Layers, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  name: string;
  value: number;
  count: number;
  children?: TreeNode[];
  level: number;
  expanded?: boolean;
}

interface DecompositionTreeProps {
  transactions: Transaction[];
}

export const DecompositionTree = ({ transactions }: DecompositionTreeProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]));

  const buildTree = (): TreeNode => {
    const root: TreeNode = { id: "root", name: "Total", value: 0, count: 0, level: 0, children: [] };
    
    const byCategory: Record<string, { value: number; count: number; subcategories: Record<string, { value: number; count: number; costCenters: Record<string, { value: number; count: number }> }> }> = {};
    
    transactions.forEach((t) => {
      const absValue = Math.abs(t.value);
      root.value += absValue;
      root.count += 1;
      
      if (!byCategory[t.category]) {
        byCategory[t.category] = { value: 0, count: 0, subcategories: {} };
      }
      byCategory[t.category].value += absValue;
      byCategory[t.category].count += 1;
      
      const sub = t.subcategory || "Sem subcategoria";
      if (!byCategory[t.category].subcategories[sub]) {
        byCategory[t.category].subcategories[sub] = { value: 0, count: 0, costCenters: {} };
      }
      byCategory[t.category].subcategories[sub].value += absValue;
      byCategory[t.category].subcategories[sub].count += 1;
      
      if (!byCategory[t.category].subcategories[sub].costCenters[t.costCenter]) {
        byCategory[t.category].subcategories[sub].costCenters[t.costCenter] = { value: 0, count: 0 };
      }
      byCategory[t.category].subcategories[sub].costCenters[t.costCenter].value += absValue;
      byCategory[t.category].subcategories[sub].costCenters[t.costCenter].count += 1;
    });
    
    root.children = Object.entries(byCategory)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([catName, catData]) => ({
        id: `cat-${catName}`,
        name: catName,
        value: catData.value,
        count: catData.count,
        level: 1,
        children: Object.entries(catData.subcategories)
          .sort((a, b) => b[1].value - a[1].value)
          .map(([subName, subData]) => ({
            id: `sub-${catName}-${subName}`,
            name: subName,
            value: subData.value,
            count: subData.count,
            level: 2,
            children: Object.entries(subData.costCenters)
              .sort((a, b) => b[1].value - a[1].value)
              .map(([ccName, ccData]) => ({
                id: `cc-${catName}-${subName}-${ccName}`,
                name: ccName,
                value: ccData.value,
                count: ccData.count,
                level: 3,
              })),
          })),
      }));
    
    return root;
  };

  const tree = buildTree();

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const renderNode = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const percentage = tree.value > 0 ? (node.value / tree.value) * 100 : 0;
    
    const icons = [FolderOpen, Layers, Building2];
    const Icon = icons[node.level - 1] || FolderOpen;
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors cursor-pointer",
            node.level === 0 ? "bg-slate-50 font-semibold" : "hover:bg-slate-50",
            node.level === 1 && "ml-0",
            node.level === 2 && "ml-6",
            node.level === 3 && "ml-12"
          )}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
          {!hasChildren && <div className="w-3.5" />}
          
          <Icon className={cn("w-4 h-4", node.level === 1 ? "text-emerald-500" : node.level === 2 ? "text-blue-500" : "text-slate-400")} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm truncate", node.level === 0 ? "text-slate-900" : "text-slate-700")}>
                {node.name}
              </span>
              <span className="text-xs font-medium text-slate-600 ml-2">
                {node.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={cn(
                    "h-full rounded-full",
                    node.level === 1 ? "bg-emerald-400" : node.level === 2 ? "bg-blue-400" : "bg-slate-300"
                  )}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">{percentage.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children!.map((child) => renderNode(child))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Decomposição Hierárquica</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {renderNode(tree)}
      </CardContent>
    </Card>
  );
};