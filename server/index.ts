import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { AirtableSyncWorker } from "./airtable-sync-worker";
import { EmailService } from "./email-service";
import { config, logConfiguration } from "./config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  try {
    // Check environment variables and service configuration at startup
    log('🚀 Starting BillTracky server...');

    // Log configuration (validates environment variables)
    logConfiguration();

    // Check email service configuration
    const emailConfigured = EmailService.isConfigured();
    log(`Email Service: ${emailConfigured ? '✅ Configured' : '❌ Not configured'}`);

    if (emailConfigured && config.NODE_ENV !== 'production') {
      log('📧 Testing email service connection...');
      // Don't await this to avoid blocking startup
      EmailService.testConnection().then(success => {
        if (success) {
          log('✅ Email service test passed');
        } else {
          log('❌ Email service test failed - check logs above');
        }
      }).catch(error => {
        log('💥 Email service test error:', error.message);
      });
    }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize Airtable sync worker
  const syncWorker = new AirtableSyncWorker(storage);
  
  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen(config.PORT, () => {
    log(`serving on port ${config.PORT}`);

    // Start Airtable sync worker after server is ready
    syncWorker.start();
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully...');
    syncWorker.stop();
    server.close(() => {
      log('Server closed');
    });
  });

  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully...');
    syncWorker.stop();
    server.close(() => {
      log('Server closed');
    });
  });

  } catch (error) {
    log('💥 Failed to start server:', error);
    process.exit(1);
  }
})();
