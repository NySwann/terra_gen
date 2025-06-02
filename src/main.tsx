import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./pages/App";

// fix for inspector
import * as Core from '@babylonjs/core'
window.BABYLON = { ...Core }

createRoot(document.getElementById("root")!).render(
  <App />
  // <StrictMode>
  //   <App />
  // </StrictMode>,
);
