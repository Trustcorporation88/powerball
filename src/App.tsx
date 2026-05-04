import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { AppLayout } from "./components/layout/AppLayout";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Home = lazy(() => import("./pages/Home"));
const Projects = lazy(() => import("./pages/Projects"));
const NewProject = lazy(() => import("./pages/NewProject"));
const ImportFile = lazy(() => import("./pages/ImportFile"));
const ColumnMapping = lazy(() => import("./pages/ColumnMapping"));
const DRE = lazy(() => import("./pages/DRE"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const CostCenterResult = lazy(() => import("./pages/CostCenterResult"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DetailView = lazy(() => import("./pages/DetailView"));
const Settings = lazy(() => import("./pages/Settings"));
const ETLPipeline = lazy(() => import("./pages/ETLPipeline"));
const Relationships = lazy(() => import("./pages/Relationships"));
const SharedDashboard = lazy(() => import("./pages/SharedDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" />;
}

const AppRoutes = () => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shared/:token" element={<SharedDashboard />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/import" element={<ImportFile />} />
        <Route path="/etl" element={<ETLPipeline />} />
        <Route path="/relationships" element={<Relationships />} />
        <Route path="/mapping" element={<ColumnMapping />} />
        <Route path="/dre" element={<DRE />} />
        <Route path="/fluxo-caixa" element={<CashFlow />} />
        <Route path="/resultado-centro-custo" element={<CostCenterResult />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/detail" element={<DetailView />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
