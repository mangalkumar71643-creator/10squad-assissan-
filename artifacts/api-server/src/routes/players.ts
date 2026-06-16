import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable, charactersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
const router: IRouter = Router();

// Get current player (mock - returns player 1)
router.get("/players/me", async (req, res) => {
  try {
    const player = await db.select().from(playersTable).where(eq(playersTable.id, 1)).limit(1);
    if (player.length === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(player[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting current player");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get player characters
router.get("/players/me/characters", async (req, res) => {
  try {
    const characters = await db.select().from(charactersTable).where(eq(charactersTable.playerId, 1));
    res.json(characters);
  } catch (err) {
    req.log.error({ err }, "Error getting player characters");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get player by ID
router.get("/players/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid player ID" });
      return;
    }
    const player = await db.select().from(playersTable).where(eq(playersTable.id, id)).limit(1);
    if (player.length === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(player[0]);
  } catch (err) {
    req.log.error({ err }, "Error getting player by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
