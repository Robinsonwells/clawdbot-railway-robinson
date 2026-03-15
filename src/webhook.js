import express from "express";
const router = express.Router();

function safeJson(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}

router.post("/:secret", async (req, res) => {
  try {
    const secret = req.params.secret;
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.error("TELEGRAM_WEBHOOK_SECRET not set in env");
      return res.sendStatus(500);
    }
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.warn("Invalid webhook secret attempted");
      return res.sendStatus(403);
    }

    const update = req.body;
    console.log("TG update received:", { update_id: update?.update_id ?? null });

    // Best-effort DB write: failures are logged but do not block response
    try {
      const { pool } = await import("./db.js");
      const now = new Date().toISOString();
      const payload = safeJson(update);
      await pool.query(
        `INSERT INTO messages (source_chat_id, source_message_id, payload, status, created_at)
         VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [
          update?.message?.chat?.id ?? null,
          update?.message?.message_id ?? null,
          payload,
          "received",
          now,
        ]
      );
    } catch (dbErr) {
      console.error("DB insert failed (continuing):", dbErr?.message ?? dbErr);
    }

    // Respond fast so Telegram does not retry
    return res.sendStatus(200);
  } catch (err) {
    console.error("Unhandled error in webhook handler:", err?.stack ?? err);
    return res.sendStatus(500);
  }
});

export default router;
