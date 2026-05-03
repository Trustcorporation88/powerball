import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { AppLayout } from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import ImportFile from "./pages/ImportFile";
import ColumnMapping from "./pages/ColumnMapping";
import Dashboard from "./pages/Dashboard";
import DetailView from "./pages/DetailView";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" />;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/register" element={<Register />} />
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
      <Route path="/mapping" element={<ColumnMapping />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/detail" element={<DetailView />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
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