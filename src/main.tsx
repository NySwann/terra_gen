import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import App2D from "./2dApp.tsx";

createRoot(document.getElementById("root")!).render(
  <App />
  // <StrictMode>
  //   <App />
  // </StrictMode>,
);
