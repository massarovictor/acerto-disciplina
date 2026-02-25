import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import "./index.css";

if (typeof document !== "undefined") {
  document.documentElement.lang = "pt-BR";
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>,
);
