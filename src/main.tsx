import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./pages/App";

createRoot(document.getElementById("root")!).render(
  <App />
  // <StrictMode>
  //   <App />
  // </StrictMode>,
);
