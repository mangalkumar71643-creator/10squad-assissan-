import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, matchmakingSessionsTable } from "@workspace/db";

const router: IRouter = Router();

// Single-player prototype: no auth yet, always use player id 1.
const PLAYER_ID = 1;
const PROGRESS_INTERVAL_SECONDS = 5;

function computeState(session: {
  status: string;
  startedAt: Date | null;
  totalPlayers: number;
}) {
  if (session.status !== "searching" || !session.startedAt) {
    return {
      status: "idle",
      queueTime: 0,
      estimatedWait: 0,
      playersFound: 0,
      totalPlayers: session.totalPlayers,
    };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
  );
  const playersFound = Math.min(
    session.totalPlayers,
    1 + Math.floor(elapsedSeconds / PROGRESS_INTERVAL_SECONDS),
  );
  const found = playersFound >= session.totalPlayers;

  return {
    status: found ? "found" : "searching",
    queueTime: elapsedSeconds,
    estimatedWait: Math.max(0, 30 - elapsedSeconds),
    playersFound,
    totalPlayers: session.totalPlayers,
  };
}

// Start matchmaking
router.post("/matchmaking", async (req, res) => {
  const { playerCount } = req.body;
  const totalPlayers = Number(playerCount) || 5;

  const startedAt = new Date();

  const existing = await db.query.matchmakingSessionsTable.findFirst({
    where: eq(matchmakingSessionsTable.playerId, PLAYER_ID),
  });

  if (existing) {
    await db
      .update(matchmakingSessionsTable)
      .set({ status: "searching", startedAt, totalPlayers })
      .where(eq(matchmakingSessionsTable.playerId, PLAYER_ID));
  } else {
    await db.insert(matchmakingSessionsTable).values({
      playerId: PLAYER_ID,
      status: "searching",
      startedAt,
      totalPlayers,
    });
  }

  res.json(computeState({ status: "searching", startedAt, totalPlayers }));
});

// Get matchmaking status
router.get("/matchmaking/status", async (req, res) => {
  const session = await db.query.matchmakingSessionsTable.findFirst({
    where: eq(matchmakingSessionsTable.playerId, PLAYER_ID),
  });

  if (!session) {
    res.json(computeState({ status: "idle", startedAt: null, totalPlayers: 5 }));
    return;
  }

  res.json(computeState(session));
});

// Cancel matchmaking
router.post("/matchmaking/cancel", async (req, res) => {
  await db
    .update(matchmakingSessionsTable)
    .set({ status: "idle", startedAt: null })
    .where(eq(matchmakingSessionsTable.playerId, PLAYER_ID));

  res.json({
    status: "idle",
    queueTime: 0,
    estimatedWait: 0,
    playersFound: 0,
    totalPlayers: 5,
  });
});

export default router;
