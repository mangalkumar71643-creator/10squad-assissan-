import { Router, type IRouter } from "express";

const router: IRouter = Router();

let matchmakingState = {
  status: "idle",
  queueTime: 0,
  estimatedWait: 0,
  playersFound: 0,
  totalPlayers: 5
};

let matchmakingTimer: NodeJS.Timeout | null = null;

// Start matchmaking
router.post("/matchmaking", (req, res) => {
  const { gameMode, playerCount } = req.body;
  
  matchmakingState = {
    status: "searching",
    queueTime: 0,
    estimatedWait: 30,
    playersFound: 1,
    totalPlayers: playerCount || 5
  };

  // Simulate matchmaking progress
  if (matchmakingTimer) clearInterval(matchmakingTimer);
  matchmakingTimer = setInterval(() => {
    matchmakingState.queueTime += 1;
    if (matchmakingState.queueTime % 5 === 0 && matchmakingState.playersFound < matchmakingState.totalPlayers) {
      matchmakingState.playersFound += 1;
    }
    if (matchmakingState.playersFound >= matchmakingState.totalPlayers) {
      matchmakingState.status = "found";
      if (matchmakingTimer) clearInterval(matchmakingTimer);
    }
  }, 1000);

  res.json(matchmakingState);
});

// Get matchmaking status
router.get("/matchmaking/status", (req, res) => {
  res.json(matchmakingState);
});

// Cancel matchmaking
router.post("/matchmaking/cancel", (req, res) => {
  if (matchmakingTimer) clearInterval(matchmakingTimer);
  matchmakingState = {
    status: "idle",
    queueTime: 0,
    estimatedWait: 0,
    playersFound: 0,
    totalPlayers: 5
  };
  res.json(matchmakingState);
});

export default router;
