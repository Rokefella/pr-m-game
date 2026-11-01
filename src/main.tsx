import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/zIndex";

// After an update, old page files are removed; an open tab may still ask for
// them. Reload once to pick up the new files instead of showing a blank screen.
const RELOAD_KEY = "praem.chunkReloadAt";
const reloadForNewBuild = () => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10_000) return false;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
};
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});
window.addEventListener("unhandledrejection", (event) => {
  const msg = String((event.reason as Error)?.message ?? event.reason ?? "");
  if (/dynamically imported module|Importing a module script failed/i.test(msg)) {
    if (reloadForNewBuild()) event.preventDefault();
  }
});

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
