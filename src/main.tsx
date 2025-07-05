import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./pages/App";

// fix for inspector
import * as Core from '@babylonjs/core'
import FormApp from "./pages/FormApp";
window.BABYLON = { ...Core }

createRoot(document.getElementById("root")!).render(
  <FormApp />
  // <StrictMode>
  //   <App />
  // </StrictMode>,
);
