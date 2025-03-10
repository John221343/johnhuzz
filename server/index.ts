import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { createServer } from 'http'; // Import createServer

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Directory-based routes - handle BEFORE the catch-all
  app.get("/:directory", async (req, res, next) => {
    const { directory } = req.params;

    // Skip API routes and reserved paths
    if (directory === "api" || directory === "assets" || directory === "_app") {
      return next();
    }

    // Check if directory exists in our storage
    const directoryExists = await storage.directoryExists(directory);

    // If directory doesn't exist, just continue to normal routes
    if (!directoryExists) {
      return next();
    }

    // Serve the index.html but inject the directory name
    if (app.get("env") === "development") {
      // In dev, let Vite handle it
      req.url = "/";
      return next();
    } else {
      // In production, manually serve and inject the directory
      const indexPath = path.join(process.cwd(), "dist", "index.html");
      fs.readFile(indexPath, "utf8", (err, data) => {
        if (err) {
          return next(err);
        }

        // Replace title with directory name
        const modifiedData = data
          .replace(/<title>.*?<\/title>/, `<title>Age Bypasser - ${directory}</title>`)
          .replace(/\/api\/webhook/g, `/api/${directory}/webhook`);

        res.send(modifiedData);
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try to find an available port starting from 5000
  const startPort = 5000;
  let currentPort = startPort;

  // Function to try binding to a port
  const tryPort = (port: number) => {
    return new Promise<boolean>((resolve) => {
      const testServer = createServer();
      testServer.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is in use
        } else {
          resolve(false); // Some other error
        }
      });
      testServer.once('listening', () => {
        testServer.close(() => {
          resolve(true); // Port is available
        });
      });
      testServer.listen(port, '0.0.0.0');
    });
  };

  // Find an available port
  const findAvailablePort = async (startPort: number, maxAttempts: number = 10) => {
    let attempts = 0;
    let port = startPort;

    while (attempts < maxAttempts) {
      const available = await tryPort(port);
      if (available) {
        return port;
      }
      log(`Port ${port} is in use, trying port ${port + 1}...`);
      port++;
      attempts++;
    }

    // If all attempts fail, return a random high port
    return Math.floor(Math.random() * (65535 - 49152)) + 49152;
  };

  // Start the server on an available port
  findAvailablePort(currentPort).then(port => {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  }).catch(err => {
    log(`Error finding available port: ${err.message}`);
    // Fallback to a random high port
    const fallbackPort = Math.floor(Math.random() * (65535 - 49152)) + 49152;
    server.listen({
      port: fallbackPort,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on fallback port ${fallbackPort}`);
    });
  });
})();