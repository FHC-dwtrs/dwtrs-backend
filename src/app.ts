import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import caseRoutes from "./modules/cases/case.routes";
import workflowRoutes from "./modules/workflow/workflow.routes";
import documentRoutes from "./modules/documents/document.route";

const app = express();

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "DWTRS API is healthy",
  });
});

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/cases", caseRoutes);
//post//http://localhost:5000/api/v1/cases//create case

app.use("/api/v1/workflow", workflowRoutes); //to what assign
//http://localhost:5000/api/v1/workflow/cases/a8594008-49d2-4521-8e3d-c40f4d6bec49/assign
//http://localhost:5000/api/v1/workflow/cases/a8594008-49d2-4521-8e3d-c40f4d6bec49/decision

app.use("/api/v1/documents", documentRoutes);

export default app;