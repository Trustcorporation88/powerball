import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LotteryGate } from "./components/lottery/LotteryGate";

const LotteryPalpites = lazy(() => import("./pages/LotteryPalpites"));
const LotteryResultado = lazy(() => import("./pages/LotteryResultado"));
const Termos = lazy(() => import("./pages/Termos"));
const ComoUsar = lazy(() => import("./pages/ComoUsar"));

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
    <Routes>
      <Route
        path="/"
        element={
          <LotteryGate>
            <LotteryPalpites />
          </LotteryGate>
        }
      />
      <Route
        path="/loterias"
        element={
          <LotteryGate>
            <LotteryPalpites />
          </LotteryGate>
        }
      />
      <Route
        path="/loterias-publico"
        element={
          <LotteryGate>
            <LotteryPalpites />
          </LotteryGate>
        }
      />

      <Route path="/resultado/:lottery" element={<LotteryResultado />} />
      <Route path="/resultado/:lottery/:concurso" element={<LotteryResultado />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/como-usar" element={<ComoUsar />} />

      {/* Rotas do painel financeiro antigo: este site é só o Powerball. */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
