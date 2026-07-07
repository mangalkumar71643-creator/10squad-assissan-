import { Router, type IRouter } from "express";
import { db, playersTable, charactersTable, weaponsTable, type Player } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, comparePassword } from "../lib/auth";

const router: IRouter = Router();

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Never send the password hash back to the client.
function sanitizePlayer(player: Player): Omit<Player, "passwordHash"> {
  const { passwordHash: _passwordHash, ...rest } = player;
  return rest;
}

// New accounts start with the same starter loadout so Character/Weapon
// select has something to show and equip right away.
async function seedStarterLoadout(playerId: number) {
  await db.insert(charactersTable).values([
    { playerId, name: "Neon Runner", image: "/assets/neon-runner-card.png", rarity: "epic", unlocked: true, selected: true },
    { playerId, name: "Havoc", image: "/assets/havoc-card.png", rarity: "legendary", unlocked: true, selected: false },
  ]);
  await db.insert(weaponsTable).values([
    { playerId, name: "Purple Mirage Rifle", image: "/assets/character-model.png", type: "rifle", rarity: "epic", unlocked: true, selected: true },
  ]);
  await db.update(playersTable).set({ character: "Neon Runner" }).where(eq(playersTable.id, playerId));
}

// Register with email + password
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Valid email and a password of at least 6 characters are required" });
      return;
    }

    const existing = await db.select().from(playersTable).where(eq(playersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const username = email.split("@")[0];
    const [player] = await db
      .insert(playersTable)
      .values({ username, email, passwordHash, isGuest: false })
      .returning();
    await seedStarterLoadout(player.id);

    const token = signToken({ playerId: player.id });
    res.status(201).json({ token, player: sanitizePlayer({ ...player, character: "Neon Runner" }) });
  } catch (err) {
    req.log.error({ err }, "Error registering player");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login with email + password
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string") {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [player] = await db.select().from(playersTable).where(eq(playersTable.email, email)).limit(1);
    if (!player || !player.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, player.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ playerId: player.id });
    res.json({ token, player: sanitizePlayer(player) });
  } catch (err) {
    req.log.error({ err }, "Error logging in player");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Guest login — creates a brand new anonymous account every time
router.post("/auth/guest", async (req, res) => {
  try {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const [player] = await db
      .insert(playersTable)
      .values({ username: `Guest${suffix}`, isGuest: true })
      .returning();
    await seedStarterLoadout(player.id);

    const token = signToken({ playerId: player.id });
    res.status(201).json({ token, player: sanitizePlayer({ ...player, character: "Neon Runner" }) });
  } catch (err) {
    req.log.error({ err }, "Error creating guest player");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Facebook login — expects a Facebook access token obtained client-side
router.post("/auth/facebook", async (req, res) => {
  try {
    const { accessToken } = req.body ?? {};
    if (typeof accessToken !== "string" || !accessToken) {
      res.status(400).json({ error: "Facebook access token is required" });
      return;
    }

    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!fbRes.ok) {
      res.status(401).json({ error: "Invalid Facebook access token" });
      return;
    }
    const fbUser = (await fbRes.json()) as { id: string; name?: string; email?: string };

    const existing = await db.select().from(playersTable).where(eq(playersTable.facebookId, fbUser.id)).limit(1);
    let player = existing[0];

    if (!player) {
      [player] = await db
        .insert(playersTable)
        .values({
          username: fbUser.name ?? `Player${fbUser.id.slice(-6)}`,
          email: fbUser.email,
          facebookId: fbUser.id,
          isGuest: false,
        })
        .returning();
      await seedStarterLoadout(player.id);
      player = { ...player, character: "Neon Runner" };
    }

    const token = signToken({ playerId: player.id });
    res.json({ token, player: sanitizePlayer(player) });
  } catch (err) {
    req.log.error({ err }, "Error logging in with Facebook");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
