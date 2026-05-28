import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Clean" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />
      <div className="clean-container py-14">
        <h1 className="clean-h1 text-center">Refund Policy</h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Clean Mobile App Limited · Last updated: May 2026
        </p>

        <div className="mt-10 space-y-8 text-white/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Introductory Offer</h2>
            <p>
              Your first payment of £19.99 grants you immediate access to Clean Quit Drugs premium
              features. After the introductory period your subscription automatically renews at
              £49.99/month.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. Refund Eligibility</h2>
            <p className="mb-2">Refunds are only available if all of the following apply:</p>
            <ul className="space-y-1 list-none">
              {[
                "You have not accessed any premium features in the app",
                "Your request is made within 14 days of your first payment",
                "You contact reece@cleanofficialapp.com with your account email and reason for refund",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. No Refunds After Access</h2>
            <p>
              Once you have logged into the app and accessed premium features you have consumed the
              digital service and are not eligible for a refund under the Consumer Contracts
              Regulations 2013 digital content exemption.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Renewal Charges</h2>
            <p>
              Monthly renewal charges of £49.99 are non-refundable once the billing period has
              started.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. How to Cancel</h2>
            <p>
              To cancel before your next renewal email{" "}
              <a
                href="mailto:reece@cleanofficialapp.com"
                className="text-white underline underline-offset-2"
              >
                reece@cleanofficialapp.com
              </a>{" "}
              at least 24 hours before your next billing date. Cancellations requested after the
              billing date take effect at the end of that billing period. No partial month refunds
              are issued.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Processing</h2>
            <p>
              Approved refunds are processed within 5–10 business days to your original payment
              method.
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
