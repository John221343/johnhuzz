import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  message: text("message").notNull(),
});

export const insertWebhookSchema = createInsertSchema(webhooks)
  .pick({
    sourceUrl: true,
    message: true,
  })
  .extend({
    sourceUrl: z.string().url().regex(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//, 
      "Must be a valid Discord webhook URL"),
    message: z.string().min(1, "Message is required").max(2000, "Message too long")
  });

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
