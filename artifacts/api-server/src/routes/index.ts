import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import lobbyRouter from "./lobby";
import matchmakingRouter from "./matchmaking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(lobbyRouter);
router.use(matchmakingRouter);

export default router;
