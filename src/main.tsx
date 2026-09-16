import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Photography } from "./Photography";
import "lenis/dist/lenis.css";
import "./styles.css";
import "./motion.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.location.pathname.startsWith("/photography") ? <Photography /> : <App />}
  </React.StrictMode>
);
