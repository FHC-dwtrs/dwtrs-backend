import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import caseRoutes from "./modules/cases/case.routes";

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

export default app;