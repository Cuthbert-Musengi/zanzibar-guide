import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { MapLocationLike } from "./usersTypes";
import type { TravelProfile } from "./profileLearning";
import { readState, writeState } from "./database";

export interface TripDay {
  day: number;
  title: string;
  locationIds: string[];
  notes?: string;
}

export interface SavedTrip {
  id: string;
  title: string;
  days: TripDay[];
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  favorites: MapLocationLike[];
  trips: SavedTrip[];
  bookingIds: string[];
  travelProfile?: TravelProfile;
  createdAt: string;
}

export interface SessionToken {
  token: string;
  userId: string;
  expiresAt: number;
}

type StoreFile = { users: AppUser[]; sessions?: SessionToken[] };

const sessions = new Map<string, SessionToken>();
let store: StoreFile = { users: [] };

export async function initializeUsersStore(): Promise<void> {
  store = await readState("users", { users: [], sessions: [] });
  store.sessions = (store.sessions || []).filter((session) => session.expiresAt > Date.now());
  sessions.clear();
  for (const session of store.sessions) sessions.set(session.token, session);
  await writeState("users", store);
}

export async function registerUser(email: string, password: string, name: string): Promise<AppUser> {
  const normalized = email.trim().toLowerCase();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error("Email already registered");
  }
  const user: AppUser = {
    id: `usr_${randomUUID().slice(0, 8)}`,
    email: normalized,
    name: name.trim() || "Traveller",
    passwordHash: await bcrypt.hash(password, 8),
    favorites: [],
    trips: [],
    bookingIds: [],
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await writeState("users", store);
  return sanitize(user);
}

export async function loginUser(email: string, password: string): Promise<{ user: AppUser; token: string }> {
  const user = store.users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }
  const token = `tg_${randomUUID().replace(/-/g, "")}`;
  const session = { token, userId: user.id, expiresAt: Date.now() + 7 * 24 * 3600_000 };
  sessions.set(token, session);
  store.sessions = [...(store.sessions || []).filter((row) => row.expiresAt > Date.now()), session];
  await writeState("users", store);
  return { user: sanitize(user), token };
}

export function getUserByToken(token?: string | null): AppUser | null {
  if (!token) return null;
  const sess = sessions.get(token);
  if (!sess || sess.expiresAt < Date.now()) return null;
  const user = store.users.find((u) => u.id === sess.userId);
  return user ? sanitize(user) : null;
}

function sanitize(u: AppUser): AppUser {
  const { passwordHash: _, ...rest } = u;
  return { ...rest, passwordHash: "" } as AppUser;
}

export async function updateUser(
  userId: string,
  patch: Partial<Pick<AppUser, "favorites" | "trips" | "bookingIds" | "name" | "travelProfile">>,
): Promise<AppUser | null> {
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  store.users[idx] = { ...store.users[idx], ...patch };
  await writeState("users", store);
  return sanitize(store.users[idx]);
}

export function getUserById(userId: string): AppUser | null {
  const user = store.users.find((u) => u.id === userId);
  return user ? sanitize(user) : null;
}

export function authFromHeader(header?: string): AppUser | null {
  if (!header?.startsWith("Bearer ")) return null;
  return getUserByToken(header.slice(7));
}
