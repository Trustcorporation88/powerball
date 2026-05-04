import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  Wallet,
  Building2,
  Settings,
  LogOut,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Wand2,
  GitBranch,
  Bell,
  MapPin,
  Bookmark,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandIdentity } from "@/components/BrandIdentity";

type MenuItem = {
  key: string;
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  isActive: (pathname: string, panel: string | null) => boolean;
};

const menuItems: MenuItem[] = [
  { key: "home", icon: LayoutDashboard, label: "Entregas", path: "/home", isActive: (pathname) => pathname === "/home" },
  { key: "dre", icon: FileText, label: "DRE", path: "/dre", isActive: (pathname) => pathname === "/dre" },
  { key: "cash-flow", icon: Wallet, label: "Fluxo de Caixa", path: "/fluxo-caixa", isActive: (pathname) => pathname === "/fluxo-caixa" },
  { key: "cost-center", icon: Building2, label: "Centro de Custo", path: "/resultado-centro-custo", isActive: (pathname) => pathname === "/resultado-centro-custo" },
  { key: "projects", icon: FolderOpen, label: "Projetos", path: "/projects", isActive: (pathname) => pathname === "/projects" },
  { key: "import", icon: FileSpreadsheet, label: "Importar", path: "/import", isActive: (pathname) => pathname === "/import" },
  { key: "etl", icon: Wand2, label: "ETL Pipeline", path: "/etl", isActive: (pathname) => pathname === "/etl" },
  { key: "relationships", icon: GitBranch, label: "Relacionamentos", path: "/relationships", isActive: (pathname) => pathname === "/relationships" },
  { key: "dashboard", icon: BarChart3, label: "Dashboard Analítico", path: "/dashboard", isActive: (pathname, panel) => pathname === "/dashboard" && !panel },
  { key: "audit", icon: FileSpreadsheet, label: "Visão Auditável", path: "/detail", isActive: (pathname) => pathname === "/detail" },
  { key: "alerts", icon: Bell, label: "Alertas", path: "/dashboard?panel=alerts", isActive: (pathname, panel) => pathname === "/dashboard" && panel === "alerts" },
  { key: "bookmarks", icon: Bookmark, label: "Bookmarks", path: "/dashboard?panel=bookmarks", isActive: (pathname, panel) => pathname === "/dashboard" && panel === "bookmarks" },
  { key: "map", icon: MapPin, label: "Mapas", path: "/dashboard?panel=map", isActive: (pathname, panel) => pathname === "/dashboard" && panel === "map" },
  { key: "settings", icon: Settings, label: "Configurações", path: "/settings", isActive: (pathname) => pathname === "/settings" },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const panel = new URLSearchParams(location.search).get("panel");

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col transition-all duration-300 h-screen sticky top-0 overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
        {collapsed ? <BrandIdentity variant="icon" /> : <BrandIdentity variant="sidebar" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-700 rounded-md transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = item.isActive(location.pathname, panel);
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-slate-700">
        {!collapsed && (
          <div className="mb-3 px-3">
            <p className="text-xs text-slate-400">Logado como</p>
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
