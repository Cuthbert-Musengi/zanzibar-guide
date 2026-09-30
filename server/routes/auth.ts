import { Router } from "express";
import { authFromHeader, loginUser, registerUser, updateUser } from "../lib/users";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const user = await registerUser(email, password, name || "Traveller");
    const { token } = await loginUser(email, password);
    res.status(201).json({ data: { user, token } });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Register failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const result = await loginUser(email, password);
    res.json({ data: result });
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "Login failed" });
  }
});

authRouter.get("/me", (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ data: user });
});

authRouter.put("/me/favorites", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const favorites = (req.body as { favorites?: unknown }).favorites;
  if (!Array.isArray(favorites)) {
    res.status(400).json({ error: "favorites array required" });
    return;
  }
  const updated = await updateUser(user.id, { favorites: favorites as never });
  res.json({ data: updated });
});

authRouter.put("/me/trips", async (req, res) => {
  const user = authFromHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const trips = (req.body as { trips?: unknown }).trips;
  if (!Array.isArray(trips)) {
    res.status(400).json({ error: "trips array required" });
    return;
  }
  const updated = await updateUser(user.id, { trips: trips as never });
  res.json({ data: updated });
});
