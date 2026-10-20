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
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    console.error("API request failed:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error.",
    });
  });
  return app;
}
