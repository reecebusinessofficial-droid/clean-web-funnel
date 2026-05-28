import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { useCallback, useEffect, useState, type ComponentProps } from "react";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const stripePromise =
  publishableKey && publishableKey.length > 0 ? loadStripe(publishableKey) : null;

function ExpressCheckoutInner({ onPaymentError }: { onPaymentError: (message: string) => void }) {
  const checkoutState = useCheckoutElements();

  const handleConfirm = useCallback(
    async (
      event: Parameters<NonNullable<ComponentProps<typeof ExpressCheckoutElement>["onConfirm"]>>[0],
    ) => {
      if (checkoutState.type !== "success") return;

      const result = await checkoutState.checkout.confirm({
        expressCheckoutConfirmEvent: event,
      });

      if (result.type === "error") {
        const err = result.error as { message?: string };
        onPaymentError(err.message ?? "Payment could not be completed.");
        return;
      }

      const sessionId = result.session.id;
      window.location.assign(
        `${window.location.origin}/success?session_id=${encodeURIComponent(sessionId)}`,
      );
    },
    [checkoutState, onPaymentError],
  );

  if (checkoutState.type === "loading") {
    return (
      <p className="text-center text-xs text-white/50" aria-live="polite">
        Loading wallet…
      </p>
    );
  }

  if (checkoutState.type === "error") {
    return null;
  }

  return (
    <ExpressCheckoutElement
      onConfirm={handleConfirm}
      options={{
        paymentMethods: {
          applePay: "always",
          googlePay: "never",
          amazonPay: "never",
          link: "never",
          paypal: "never",
        },
        buttonType: {
          applePay: "plain",
        },
        buttonTheme: {
          applePay: "white",
        },
        layout: {
          maxColumns: 1,
          maxRows: 2,
        },
      }}
    />
  );
}

/**
 * Stripe Checkout Session (`ui_mode: custom`) + Express Checkout Element (Apple Pay, etc.).
 * Same subscription + intro + trial as hosted Checkout; falls back to the hosted button if
 * `VITE_STRIPE_PUBLISHABLE_KEY` is unset or wallets are unavailable.
 */
export function PaywallExpressCheckout({
  open,
  onError,
}: {
  open: boolean;
  onError: (message: string) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);

  useEffect(() => {
    if (!open || !stripePromise) {
      setClientSecret(null);
      setLoadingSecret(false);
      return;
    }

    let cancelled = false;
    setClientSecret(null);
    setLoadingSecret(true);

    (async () => {
      try {
        const res = await fetch("/api/create-checkout-session-custom", { method: "POST" });
        const text = await res.text();
        console.log("[create-checkout-session-custom] response", {
          ok: res.ok,
          status: res.status,
          body: text,
        });

        let data: { clientSecret?: string; error?: string };
        try {
          data = text ? (JSON.parse(text) as { clientSecret?: string; error?: string }) : {};
        } catch {
          if (!cancelled) onError("Checkout (wallet): server returned non-JSON. See console.");
          return;
        }

        if (!res.ok || !data.clientSecret) {
          if (!cancelled) onError(data.error ?? `Checkout (wallet) failed (${res.status}).`);
          return;
        }

        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : "Checkout (wallet): network error.");
        }
      } finally {
        if (!cancelled) setLoadingSecret(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, onError]);

  if (!stripePromise || !publishableKey) {
    return null;
  }

  if (!open) return null;

  if (loadingSecret || !clientSecret) {
    return (
      <div className="mt-6 min-h-[44px]">
        <p className="text-center text-xs text-white/50" aria-live="polite">
          {loadingSecret ? "Preparing Apple Pay…" : null}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <CheckoutElementsProvider
        stripe={stripePromise}
        options={{
          clientSecret,
        }}
      >
        <ExpressCheckoutInner onPaymentError={onError} />
      </CheckoutElementsProvider>
    </div>
  );
}
