import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SimulationDashboardV2 } from "../src/components/SimulationDashboardV2";
import "../src/components/simulator-v2.css";
import "../src/components/editorial-simulator.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root mount point");

createRoot(root).render(
  <StrictMode>
    <SimulationDashboardV2 />
  </StrictMode>,
);
