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

// Equip a character
router.post("/players/me/characters/:id/equip", async (req, res) => {
  try {
    const charId = parseInt(req.params.id);
    if (isNaN(charId)) {
      res.status(400).json({ error: "Invalid character ID" });
      return;
    }
    const char = await db.select().from(charactersTable).where(eq(charactersTable.id, charId)).limit(1);
    if (char.length === 0 || !char[0].unlocked) {
      res.status(404).json({ error: "Character not found or locked" });
      return;
    }
    await db.update(charactersTable).set({ selected: false }).where(eq(charactersTable.playerId, 1));
    await db.update(charactersTable).set({ selected: true }).where(eq(charactersTable.id, charId));
    await db.update(playersTable).set({ character: char[0].name }).where(eq(playersTable.id, 1));
    res.json({ success: true, character: char[0].name });
  } catch (err) {
    req.log.error({ err }, "Error equipping character");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
