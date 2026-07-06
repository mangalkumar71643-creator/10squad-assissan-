import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playersRouter from "./players";
import lobbyRouter from "./lobby";
import matchmakingRouter from "./matchmaking";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Everything below requires a valid session.
router.use(requireAuth);
router.use(playersRouter);
router.use(lobbyRouter);
router.use(matchmakingRouter);

export default router;
