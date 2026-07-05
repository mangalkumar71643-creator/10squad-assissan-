import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const matchmakingSessionsTable = pgTable("matchmaking_sessions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  status: text("status").notNull().default("idle"),
  startedAt: timestamp("started_at"),
  totalPlayers: integer("total_players").notNull().default(5),
});

export type MatchmakingSession = typeof matchmakingSessionsTable.$inferSelect;
