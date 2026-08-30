import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:8443",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

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