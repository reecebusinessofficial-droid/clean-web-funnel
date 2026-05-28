import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackMetaPurchase } from "../lib/metaPixel";
import { trackPurchaseCompleted, trackScreenView } from "../lib/mixpanel";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Success — Welcome to Clean" },
      {
        name: "description",
        content:
          "Your Clean Premium is unlocked. Download the app and start your personalized plan.",
      },
      { property: "og:title", content: "Success — Welcome to Clean" },
      { property: "og:description", content: "Your Clean Premium is unlocked." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

const features = [
  { icon: "🧠", label: "Personalized Clean Plan" },
  { icon: "🛡️", label: "AI-Powered Tools" },
  { icon: "👥", label: "Community Access" },
  { icon: "📈", label: "Progress Tracking" },
];

function SuccessPage() {
  const analyticsTracked = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    if (analyticsTracked.current) return;
    analyticsTracked.current = true;
    trackScreenView("success");
    trackMetaPurchase();
    trackPurchaseCompleted();
  }, []);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://cleanmobileapp.com/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error ${res.status}`);
      }
      setAccountCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />

      <div className="clean-container">
        <div className="flex justify-center pt-10">
          <div className="clean-check">
            <Check strokeWidth={3} className="h-16 w-16" />
          </div>
        </div>

        <h1 className="clean-h1 mt-8 text-center">Success!</h1>
        <p className="clean-sub mt-3 text-center">You&apos;re in. Time to get Clean.</p>

        <div className="clean-card-outer mt-10">
          <div className="clean-card-inner">
            <h2 className="text-center text-2xl font-bold text-white">Premium Unlocked</h2>
            <ul className="mt-6 space-y-4">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-white/90">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a84c]" />
                  <span className="text-xl leading-none">{f.icon}</span>
                  <span className="text-lg font-medium">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!accountCreated ? (
          <form onSubmit={handleCreateAccount} className="mt-10 w-full space-y-4">
            <h2 className="text-center text-2xl font-bold text-white">Create your account</h2>
            <p className="text-center text-sm text-white/55">Set a password to log in to the app</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-2xl bg-white/10 border border-white/20 text-white px-5 py-4 w-full placeholder:text-white/40 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-2xl bg-white/10 border border-white/20 text-white px-5 py-4 w-full placeholder:text-white/40 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="clean-cta !py-4 !text-base !font-semibold mx-auto !w-auto px-10"
            >
              <span>{loading ? "Creating account…" : "Create Account"}</span>
              {!loading && <ChevronRight className="h-5 w-5" />}
            </button>
            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
          </form>
        ) : (
          <>
            <a href="https://apps.apple.com/in/app/clean-quit-drugs/id6752792624" target="_blank" rel="noopener noreferrer" className="clean-cta mt-10">
              <span>Download Clean</span>
              <ChevronRight className="h-6 w-6" />
            </a>

            <div className="mt-6 mb-10 flex items-center justify-center gap-3">
          <a href="#" className="clean-badge" aria-label="Download on the App Store">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
              <path d="M17.05 12.04c-.03-2.79 2.28-4.13 2.39-4.2-1.3-1.9-3.33-2.16-4.05-2.19-1.72-.17-3.36 1.01-4.24 1.01-.88 0-2.22-.99-3.66-.96-1.88.03-3.62 1.09-4.59 2.78-1.96 3.4-.5 8.43 1.41 11.19.93 1.35 2.04 2.87 3.49 2.82 1.4-.06 1.93-.91 3.62-.91 1.69 0 2.17.91 3.65.88 1.51-.03 2.46-1.38 3.38-2.74 1.07-1.57 1.51-3.09 1.53-3.17-.03-.01-2.93-1.12-2.96-4.47zM14.5 4.04c.77-.94 1.29-2.24 1.15-3.54-1.11.05-2.46.74-3.26 1.67-.72.83-1.35 2.15-1.18 3.42 1.24.1 2.51-.63 3.29-1.55z" />
            </svg>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[9px] uppercase tracking-wide opacity-80">
                Download on the
              </span>
              <span className="text-base font-semibold">App Store</span>
            </div>
          </a>
          <a href="#" className="clean-badge" aria-label="Get it on Google Play">
            <svg viewBox="0 0 24 24" className="h-7 w-7">
              <path
                fill="#34a853"
                d="M3.6 2.4 14.3 13 3.6 23.6c-.4-.3-.6-.8-.6-1.4V3.8c0-.6.2-1.1.6-1.4z"
              />
              <path fill="#fbbc04" d="M17.5 9.6 14.3 13l3.2 3.4 4.1-2.3c1-.6 1-2 0-2.6z" />
              <path fill="#ea4335" d="m14.3 13 3.2-3.4L4.7 2.2c-.4-.2-.8-.2-1.1 0z" />
              <path fill="#4285f4" d="m14.3 13-10.7 10.6c.3.2.7.2 1.1 0l12.8-7.2z" />
            </svg>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[9px] uppercase tracking-wide opacity-80">Get it on</span>
              <span className="text-base font-semibold">Google Play</span>
            </div>
          </a>
        </div>
          </>
        )}
      </div>
    </main>
  );
}
