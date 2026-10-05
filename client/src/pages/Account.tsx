import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionId } from "@/lib/session";
import { fetchMyBookings, statusLabel, type PublicBooking } from "@/lib/bookings";
import { useCurrency } from "@/contexts/CurrencyContext";

interface User {
  id: string;
  email: string;
  name: string;
  favorites: Array<{ id: string; name: string }>;
  trips: Array<{ id: string; title: string; createdAt: string }>;
  bookingIds: string[];
}

export default function Account() {
  const { formatMoney, formatPriceLabel } = useCurrency();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gamification, setGamification] = useState<{
    data: { points: number; badges: string[]; reviewsWritten: number; bookingsCount: number };
    deal: { unlocked: boolean; deal: { code: string } | null; need: number };
  } | null>(null);
  const [travelProfile, setTravelProfile] = useState<{
    travelStyle: string;
    historySummary: string;
    badges: Array<{ id: string; label: string }>;
    interests: string[];
    bookingCount: number;
  } | null>(null);
  const [favShare, setFavShare] = useState<string | null>(null);
  const [myBookings, setMyBookings] = useState<PublicBooking[]>([]);

  const token = () => localStorage.getItem("travelguide_token");

  const refresh = async () => {
    const t = token();
    if (!t) return;
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setUser(data.data);
    }
  };

  const loadGame = async () => {
    const key = user?.id || getSessionId();
    const res = await fetch(`/api/engagement/gamification/${key}`);
    const data = await res.json();
    setGamification(data);
  };

  const loadTravelProfile = async () => {
    const t = token();
    const res = await fetch(`/api/profile/me?sessionId=${encodeURIComponent(getSessionId())}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok) return;
    const data = await res.json();
    setTravelProfile(data.data?.profile || null);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setMyBookings([]);
      return;
    }
    fetchMyBookings()
      .then(setMyBookings)
      .catch(() => setMyBookings([]));
  }, [user?.id, user?.bookingIds?.length]);

  useEffect(() => {
    loadGame().catch(() => {});
    loadTravelProfile().catch(() => {});
  }, [user?.id]);

  const register = async () => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Register failed");
      return;
    }
    localStorage.setItem("travelguide_token", data.data.token);
    setUser(data.data.user);
  };

  const login = async () => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    localStorage.setItem("travelguide_token", data.data.token);
    setUser(data.data.user);
  };

  const logout = () => {
    localStorage.removeItem("travelguide_token");
    setUser(null);
  };

  const shareFavorites = async () => {
    const items = (user?.favorites || []).map((f) => ({ id: f.id, name: f.name || f.id }));
    if (!items.length) {
      setFavShare("No favorites to share");
      return;
    }
    const res = await fetch("/api/engagement/favorites/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${user?.name}'s favorites`, items }),
    });
    const data = await res.json();
    if (res.ok) {
      const url = `${window.location.origin}${data.publicPath}`;
      setFavShare(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const labels: Record<string, string> = {
    explorer: "Explorer",
    culture: "Culture Enthusiast",
    reviewer: "Helpful Reviewer",
    booker: "Seasoned Booker",
    vip: "VIP Traveller",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <h1 className="text-xl font-bold">Account</h1>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-lg space-y-4">
        {!user ? (
          <Card className="p-4 space-y-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={login}>Log in</Button>
              <Button variant="secondary" onClick={register}>
                Register
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 space-y-3">
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs">Favorites synced: {user.favorites?.length || 0}</p>
            <p className="text-xs">Saved trips: {user.trips?.length || 0}</p>
            {myBookings.length > 0 ? (
              <div className="text-xs border rounded p-2 space-y-2">
                <p className="font-medium">My bookings ({myBookings.length})</p>
                <ul className="space-y-2">
                  {myBookings.map((b) => (
                    <li key={b.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <p className="font-medium">{b.itemName}</p>
                      <p className="text-muted-foreground">
                        {statusLabel(b.status)} · {b.amountUsd ? formatMoney(b.amountUsd) : formatPriceLabel(b.priceLabel)}
                      </p>
                      {b.confirmationCode && (
                        <Link href={`/bookings/${encodeURIComponent(b.confirmationCode)}`} className="text-primary hover:underline font-mono">
                          {b.confirmationCode}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No bookings linked to this account yet.</p>
            )}
            <ul className="text-xs space-y-1">
              {(user.trips || []).map((t) => (
                <li key={t.id}>
                  {t.title} <span className="text-muted-foreground">({t.createdAt.slice(0, 10)})</span>
                </li>
              ))}
            </ul>
            {travelProfile && (
              <div className="text-xs border rounded p-2 space-y-1">
                <p className="font-medium">Learned travel profile</p>
                <p>{travelProfile.travelStyle}</p>
                <p className="text-muted-foreground">{travelProfile.historySummary}</p>
                <p>Interests: {travelProfile.interests.join(", ") || "—"}</p>
                <p>
                  Badges:{" "}
                  {travelProfile.badges.map((b) => b.label).join(", ") || "earn by booking & favouriting"}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[10px]"
                  onClick={async () => {
                    const t = token();
                    await fetch("/api/profile/learn", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(t ? { Authorization: `Bearer ${t}` } : {}),
                      },
                      body: JSON.stringify({ sessionId: getSessionId() }),
                    });
                    await loadTravelProfile();
                  }}
                >
                  Re-learn from booking history
                </Button>
              </div>
            )}
            {gamification && (
              <div className="text-xs border rounded p-2 space-y-1">
                <p className="font-medium">Travel profile</p>
                <p>{gamification.data.points} points</p>
                <p>
                  Badges:{" "}
                  {gamification.data.badges.map((b) => labels[b] || b).join(", ") || "earn badges by visiting & reviewing"}
                </p>
                <p className="text-muted-foreground">
                  {gamification.deal.unlocked && gamification.deal.deal
                    ? `Deal unlocked: ${gamification.deal.deal.code}`
                    : `${gamification.deal.need} pts to VIP deal`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={shareFavorites}>
                Share favorites link
              </Button>
              <Link href="/compare-trips" className="text-sm text-primary hover:underline self-center">
                Compare saved itineraries
              </Link>
            </div>
            {favShare && <p className="text-[10px] break-all text-muted-foreground">{favShare}</p>}
            <Button variant="outline" onClick={logout}>
              Log out
            </Button>
          </Card>
        )}
        {!user && gamification && (
          <Card className="p-4 text-xs space-y-1">
            <p className="font-medium">Guest travel profile</p>
            <p>{gamification.data.points} pts · {gamification.data.badges.map((b) => labels[b] || b).join(", ") || "no badges yet"}</p>
          </Card>
        )}
      </main>
    </div>
  );
}
