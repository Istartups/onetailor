import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error";
import { rateLimiter } from "./middlewares/rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Apply rate limiting to all /api routes
app.use("/api", rateLimiter);

app.use("/api", router);

// Serve uploads directory under /api/uploads so frontends can load evidence images
const uploadsPath = path.resolve(__dirname, "..", "uploads");
if (fs.existsSync(uploadsPath)) {
  app.use("/api/uploads", express.static(uploadsPath));
}

// Serve static files ONLY if the directory exists
const publicPath = path.resolve(__dirname, "..", "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  
  app.get("/admin-portal*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const adminPath = path.join(publicPath, "admin-portal", "index.html");
    if (fs.existsSync(adminPath)) {
      res.sendFile(adminPath);
    } else {
      res.status(404).send("Admin Portal build files not found.");
    }
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/admin-portal")) {
      return next();
    }
    const indexPath = path.join(publicPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("App build files not found.");
    }
  });
} else {
  // If public folder doesn't exist, just provide a basic root response for dev
  app.get("/", (req, res) => {
    res.json({ message: "API Server is running. Visit port 5173 for the app." });
  });
}

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
