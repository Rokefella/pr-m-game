import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/zIndex";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
