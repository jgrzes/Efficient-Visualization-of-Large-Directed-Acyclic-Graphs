import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./style.css";

function applyInitialTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const theme = saved ?? (prefersDark ? "dark" : "light");

  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

applyInitialTheme();

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  // <FavoritesProvider>
  <App />
  // </FavoritesProvider>
);
