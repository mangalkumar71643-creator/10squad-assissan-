import { pgTable, serial, text, integer, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  avatar: text("avatar").default("/assets/avatars/default.png"),
  level: integer("level").default(1),
  gold: integer("gold").default(0),
  diamonds: integer("diamonds").default(0),
  tokens: integer("tokens").default(0),
  rank: text("rank").default("Bronze"),
  title: text("title").default("PROJECT"),
  character: text("character").default("default"),
});

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playersTable.id),
  name: text("name").notNull(),
  image: text("image").notNull(),
  rarity: text("rarity").default("common"),
  unlocked: boolean("unlocked").default(true),
  selected: boolean("selected").default(false),
});

export const lobbySlotsTable = pgTable("lobby_slots", {
  id: serial("id").primaryKey(),
  position: integer("position").notNull(),
  status: text("status").default("empty"),
  playerId: integer("player_id").references(() => playersTable.id),
  character: text("character"),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true });
export const insertLobbySlotSchema = createInsertSchema(lobbySlotsTable).omit({ id: true });

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
export type InsertLobbySlot = z.infer<typeof insertLobbySlotSchema>;
export type LobbySlot = typeof lobbySlotsTable.$inferSelect;
