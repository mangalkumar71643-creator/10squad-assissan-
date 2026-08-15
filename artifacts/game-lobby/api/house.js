// Short-code cloud save for a Map 4 house — POST stores the house JSON in
// Vercel Blob under a random short code and returns that code; GET fetches
// it back by code. This exists so a build can be recovered by typing a
// short code (instead of copy-pasting a multi-hundred-character text
// blob), and so it survives things a purely local save can't (an
// uninstall wipes the app's own local storage, not this).
import { put, get } from "@vercel/blob";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L ambiguity
const CODE_LENGTH = 6;
const MAX_BODY_BYTES = 300000; // generous for even a very large house

function randomCode() {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const data = body && body.data;
      if (typeof data !== "string" || data.length === 0 || data.length > MAX_BODY_BYTES) {
        res.status(400).json({ error: "invalid data" });
        return;
      }
      // Astronomically unlikely to collide (33^6 ≈ 1.3 billion codes), but
      // retry once with a fresh code rather than silently overwriting
      // someone else's save if it ever does.
      let code = randomCode();
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await put(`houses/${code}.json`, data, {
            access: "private",
            contentType: "application/json",
            addRandomSuffix: false,
            allowOverwrite: false,
          });
          res.status(200).json({ code });
          return;
        } catch (err) {
          if (attempt === 0) {
            code = randomCode();
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      console.error("house save error", err);
      res.status(500).json({ error: "save failed" });
    }
    return;
  }

  if (req.method === "GET") {
    const code = String(req.query.code || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9]{4,10}$/.test(code)) {
      res.status(400).json({ error: "invalid code" });
      return;
    }
    try {
      const result = await get(`houses/${code}.json`, { access: "private" });
      if (!result || !result.stream) {
        res.status(404).json({ error: "not found" });
        return;
      }
      const text = await new Response(result.stream).text();
      res.status(200).json({ data: text });
    } catch (err) {
      console.error("house load error", err);
      res.status(500).json({ error: "load failed" });
    }
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
