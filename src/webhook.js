import express from "express";
import { pool } from "./db.js";

const router = express.Router();

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

router.post("/webhook/:secret", async (req, res) => {
  try {
    const secret = req.params.secret;
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.error("TELEGRAM_WEBHOOK_SECRET not set in env");
      return res.sendStatus(500);
    }
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.warn("Invalid webhook secret attempt");
      return res.sendStatus(403);
    }

    const update = req.body;
    console.log("TG update received:", { update_id: update && update.update_id });

    res.sendStatus(200);

    try {
      const now = new Date().toISOString();
      const payload = safeJson(update);
      await pool.query(
        `INSERT INTO messages (source_chat_id, source_message_id, payload, status, created_at)
         VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [
          (update.message && update.message.chat && update.message.chat.id) || null,
          (update.message && update.message.message_id) || null,
          payload,
          "received",
          now,
        ]
      );
    } catch (dbErr) {
      console.error("DB insert failed (continuing):", dbErr && dbErr.message);
    }
  } catch (err) {
    console.error("Unhandled error in webhook handler:", err && err.stack ? err.stack : err);
    if (!res.headersSent) {
      return res.sendStatus(500);
    }
  }
});

export default router;
