import express from "express";
import apiRoutes from "./routes";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
const app = express();

app.use(express.json());


app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "DWTRS API is healthy",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", apiRoutes);

export default app;