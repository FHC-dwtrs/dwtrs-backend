import express from "express";
import apiRoutes from "./routes";

const app = express();

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "DWTRS API is healthy",
  });
});

app.use("/api/v1", apiRoutes);

export default app;