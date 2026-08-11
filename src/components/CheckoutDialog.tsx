import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Globe,
  Landmark,
  Loader2,
  QrCode,
  Smartphone,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CURRENCIES,
  formatPrice,
  PAYMENT_METHODS,
  type CurrencyCode,
} from "@/lib/billing-config";
import { usePaymentProviders } from "@/lib/billing";
import { createCheckout, validateCoupon } from "@/lib/billing.functions";
import { cn } from "@/lib/utils";

export type CheckoutTarget = {
  kind: "subscription" | "pack";
  itemId: string;
  label: string;
  amount: number;
};

type Props = {
  target: CheckoutTarget | null;
  currency: CurrencyCode;
  country: string | null;
  onClose: () => void;
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  visa: <CreditCard size={18} />,
  mastercard: <CreditCard size={18} />,
  amex: <CreditCard size={18} />,
  apple_pay: <Wallet size={18} />,
  google_pay: <Wallet size={18} />,
  paypal: <Globe size={18} />,
  mtn_momo: <Smartphone size={18} />,
  orange_money: <Smartphone size={18} />,
  moov_money: <Smartphone size={18} />,
  wave: <QrCode size={18} />,
  mobile_money: <Smartphone size={18} />,
  bank_transfer: <Landmark size={18} />,
};

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  stripe: <CreditCard size={18} />,
  fedapay: <Building2 size={18} />,
};

/** Checkout multi-fournisseurs avec sélection radio façon provider-list. */
export function CheckoutDialog({ target, currency, country, onClose }: Props) {
  const { data: providers } = usePaymentProviders(currency);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);

  const activeProvider = (providers ?? []).find(
    (item) => item.id === expandedProvider,
  );
  const total = Math.max(0, (target?.amount ?? 0) - discount);

  function toggleProvider(id: string) {
    setExpandedProvider((current) => (current === id ? null : id));
    setSelectedMethod(null);
  }

  function selectMethod(providerId: string, methodKey: string) {
    setExpandedProvider(providerId);
    setSelectedMethod(methodKey);
  }

  async function applyCode() {
    if (!target || !code.trim()) return;
    setChecking(true);
    try {
      const result = await validateCoupon({
        data: { code, kind: target.kind, itemId: target.itemId, currency },
      });
      if (result.valid) {
        setDiscount(result.discount);
        toast.success("Code promo appliqué.");
      } else {
        setDiscount(0);
        toast.error("Code promo invalide ou expiré.");
      }
    } catch {
      toast.error("Vérification du code impossible.");
    } finally {
      setChecking(false);
    }
  }

  async function pay() {
    if (!target || !activeProvider || !selectedMethod) return;
    setPaying(true);
    try {
      const result = await createCheckout({
        data: {
          provider: activeProvider.id,
          kind: target.kind,
          itemId: target.itemId,
          currency,
          method: selectedMethod,
          ...(discount > 0 && code ? { couponCode: code } : {}),
          ...(country ? { country } : {}),
          origin: window.location.origin,
        },
      });
      if (result.url) window.location.href = result.url;
      else toast.success("Paiement initialisé.");
    } catch (error) {
      const message = (error as Error).message ?? "";
      toast.error(
        message.includes("PROVIDER_NOT_CONFIGURED")
          ? "Ce moyen de paiement n'est pas encore activé par l'administrateur."
          : "Le paiement n'a pas pu être lancé.",
      );
    } finally {
      setPaying(false);
    }
  }

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
          className="fixed inset-0 z-[85] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="card-premium relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-7"
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>

            <h2 id="checkout-title" className="font-display text-xl font-bold">
              Finaliser le paiement
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{target.label}</p>

            <div className="mt-5 space-y-2">
              {(providers ?? []).length === 0 && (
                <div className="rounded-xl border border-input p-4 text-sm text-muted-foreground">
                  Aucun moyen de paiement n'est encore activé pour{" "}
                  {CURRENCIES[currency].label}.
                </div>
              )}

              {(providers ?? []).map((provider) => {
                const expanded = expandedProvider === provider.id;
                const methods = (provider.methods as string[]) ?? [];
                return (
                  <div
                    key={provider.id}
                    className={cn(
                      "overflow-hidden rounded-xl border transition-colors",
                      expanded ? "border-primary bg-primary-soft/40" : "border-input",
                    )}
                  >
                    <button
                      onClick={() => toggleProvider(provider.id)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full",
                            expanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {PROVIDER_ICONS[provider.id] ?? <CreditCard size={18} />}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{provider.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {provider.description}
                          </span>
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-input px-2 pb-3 pt-1">
                            {methods.map((methodKey) => {
                              const selected = selectedMethod === methodKey;
                              return (
                                <button
                                  key={methodKey}
                                  onClick={() => selectMethod(provider.id, methodKey)}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                                    selected
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-accent",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                                      selected
                                        ? "border-primary-foreground bg-primary-foreground text-primary"
                                        : "border-muted-foreground",
                                    )}
                                  >
                                    {selected && <span className="size-2 rounded-full bg-current" />}
                                  </span>
                                  <span
                                    className={cn(
                                      "flex size-8 items-center justify-center rounded-lg",
                                      selected ? "bg-primary-foreground/20" : "bg-muted",
                                    )}
                                  >
                                    {METHOD_ICONS[methodKey] ?? <CreditCard size={16} />}
                                  </span>
                                  <span className="text-sm font-semibold">
                                    {PAYMENT_METHODS[methodKey] ?? methodKey}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2">
              <label className="sr-only" htmlFor="coupon">
                Code promo
              </label>
              <input
                id="coupon"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Code promo"
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={applyCode}
                disabled={checking || !code.trim()}
                className="flex h-11 items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold hover:bg-accent disabled:opacity-40"
              >
                {checking ? <Loader2 size={15} className="animate-spin" /> : <Tag size={15} />}
                Appliquer
              </button>
            </div>

            <div className="mt-5 space-y-1.5 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span>{formatPrice(target.amount, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Remise</span>
                  <span>-{formatPrice(discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(total, currency)}</span>
              </div>
            </div>

            <button
              onClick={pay}
              disabled={paying || !activeProvider || !selectedMethod}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {paying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Payer {formatPrice(total, currency)}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Paiement sécurisé. Vous serez redirigé vers la page du fournisseur.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
