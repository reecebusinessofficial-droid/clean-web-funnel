import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Clean" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />
      <div className="clean-container py-14">
        <h1 className="clean-h1 text-center">Privacy Policy</h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Clean Mobile App Limited · Last updated: May 2026
        </p>

        <div className="mt-10 space-y-8 text-white/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Who we are</h2>
            <p>
              Clean Mobile App Limited is a company registered in England and Wales.
              Contact:{" "}
              <a href="mailto:reece@cleanofficialapp.com" className="text-white underline underline-offset-2">
                reece@cleanofficialapp.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. What data we collect</h2>
            <ul className="space-y-1 list-none">
              {[
                "Quiz answers you provide during onboarding",
                "Email address and password when you create an account",
                "Payment information processed securely by Stripe (we never store card details)",
                "Usage analytics via Mixpanel (anonymous usage data)",
                "Advertising data via Meta Pixel (page views, purchase events)",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. How we use your data</h2>
            <ul className="space-y-1 list-none">
              {[
                "To provide and personalise your Clean experience",
                "To process payments and manage your subscription",
                "To improve our product via analytics",
                "To measure advertising effectiveness",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Data sharing</h2>
            <p className="mb-2">We share data only with:</p>
            <ul className="space-y-1 list-none mb-2">
              {[
                "Stripe (payment processing)",
                "Mixpanel (analytics)",
                "Meta (advertising)",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  {item}
                </li>
              ))}
            </ul>
            <p>We never sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Your rights (UK GDPR)</h2>
            <p>
              You have the right to access, correct, or delete your data at any time. Email{" "}
              <a href="mailto:reece@cleanofficialapp.com" className="text-white underline underline-offset-2">
                reece@cleanofficialapp.com
              </a>{" "}
              to exercise your rights.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Cookies</h2>
            <p>
              We use essential cookies and advertising pixels. By using this site you consent to
              this use.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Contact</h2>
            <p>
              Clean Mobile App Limited
              <br />
              <a href="mailto:reece@cleanofficialapp.com" className="text-white underline underline-offset-2">
                reece@cleanofficialapp.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 mb-6 text-center">
          <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            ← Back
          </a>
        </div>
      </div>
    </main>
  );
}
