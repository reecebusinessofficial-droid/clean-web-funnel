import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Clean" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />
      <div className="clean-container py-14">
        <h1 className="clean-h1 text-center">Terms of Service</h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Clean Mobile App Limited · Last updated: May 2026
        </p>

        <div className="mt-10 space-y-8 text-white/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Acceptance</h2>
            <p>By using Clean Quit Drugs you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. Subscription</h2>
            <ul className="space-y-1 list-none">
              {[
                "Your subscription begins with a £0.99 introductory charge",
                "You will be billed £12.99 per month after the introductory period",
                "You can cancel at any time by contacting reece@cleanofficialapp.com",
                "No refunds are provided for partial months",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Account</h2>
            <p>
              You are responsible for keeping your account credentials secure. You must be 18 or
              older to use this service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Acceptable use</h2>
            <p>
              You agree not to misuse the platform, share your account, or attempt to circumvent
              payment.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Disclaimer</h2>
            <p>
              Clean Quit Drugs is a support tool and does not constitute medical advice. Always
              consult a healthcare professional for medical concerns.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Governing law</h2>
            <p>These terms are governed by the laws of England and Wales.</p>
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
