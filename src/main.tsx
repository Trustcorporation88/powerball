import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { registerServiceWorker } from "./services/lotteryNotifications";

createRoot(document.getElementById("root")!).render(<App />);

// Habilita o modo offline e os avisos de resultado. Registrado fora do React
// para não depender do ciclo de vida de nenhum componente.
registerServiceWorker();
