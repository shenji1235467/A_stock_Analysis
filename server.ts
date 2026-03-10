import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import stockRouter from "./src/server/routers/stocks.ts";
import { config } from "./src/server/config.ts";
import { initDb } from "./src/server/models.ts";
import { crud } from "./src/server/crud.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize Database
  try {
    await initDb();
    console.log("Database initialized successfully");
    
    // Initial cleanup and schedule daily cleanup
    await crud.cleanupOldData();
    setInterval(async () => {
      try {
        await crud.cleanupOldData();
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  const app = express();
  const PORT = config.PORT;

  app.use(express.json());

  // API Routes
  app.use("/api/stocks", stockRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
