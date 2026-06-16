import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { lobbySlotsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Get lobby state
router.get("/lobby", async (req, res) => {
  try {
    const slots = await db.select().from(lobbySlotsTable).orderBy(lobbySlotsTable.position);
    const lobby = {
      id: "lobby-1",
      name: "Pre-Game Lobby",
      gameMode: "Ranked Match",
      maxPlayers: 5,
      currentPlayers: slots.filter(s => s.status === "occupied").length,
      slots: slots
    };
    res.json(lobby);
  } catch (err) {
    req.log.error({ err }, "Error getting lobby");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get lobby slots
router.get("/lobby/slots", async (req, res) => {
  try {
    const slots = await db.select().from(lobbySlotsTable).orderBy(lobbySlotsTable.position);
    res.json(slots);
  } catch (err) {
    req.log.error({ err }, "Error getting lobby slots");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
