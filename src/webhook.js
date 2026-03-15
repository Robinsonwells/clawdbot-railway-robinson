import express from "express";
const router = express.Router();

function safeJson(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}

async function insertMessage(update) {
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
}

router.post("/:secret", (req, res) => {
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

    // Acknowledge Telegram immediately; DB write is fire-and-forget
    res.sendStatus(200);

    insertMessage(update).catch((dbErr) => {
      console.error("DB insert failed (continuing):", dbErr?.message ?? dbErr);
    });
  } catch (err) {
    console.error("Unhandled error in webhook handler:", err?.stack ?? err);
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
});

export default router;
