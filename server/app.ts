import cors from "cors";
import express from "express";
import agentRoutes from "./routes/agentRoutes.js";
import renderRoutes from "./routes/renderRoutes.js";

export function createApp() {
  const app = express();
  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/agent", agentRoutes);
  app.use("/api/render", renderRoutes);
  return app;
}
