import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { AuthField } from "@/components/AuthField";
import { useAuth } from "@/context/AuthContext";
import { USE_FAKE_DATA } from "@/config";
import { login } from "@/api/authApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Log in — GlobeTrotter" },
      {
        name: "description",
        content:
          "Log in to GlobeTrotter to plan multi-city itineraries, budgets and day-wise travel plans.",
      },
      { property: "og:title", content: "Log in — GlobeTrotter" },
      {
        property: "og:description",
        content: "Access your trips, itineraries and travel budgets.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }


    setLoading(true);
    try {
      if (USE_FAKE_DATA) {
        // Fake response matching POST /auth/login → { user_id, token }
        signIn("fake_jwt_token", {
          user_id: 1,
          email,
          name: email.split("@")[0] ?? "Traveller",
        });
      } else {
        const { data } = await login(email, password);
        signIn(data.token, {
          user_id: data.user_id,
          email,
          name: email.split("@")[0] ?? "Traveller",
        });
      }
      toast.success("Welcome back, the road is calling");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Pick up your itinerary right where you left it."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => toast("Password reset comes with the backend hookup")}
          className="text-xs font-semibold text-ocean-foreground/70 underline"
        >
          Forgot password?
        </button>
        <button
          type="submit"
          disabled={loading}
          className="gradient-sunset h-12 w-full rounded-xl text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-lift transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Boarding…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
