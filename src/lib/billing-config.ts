/** Configuration devises, pays et moyens de paiement (partagée client/serveur). */

export type Region = "international" | "africa";

export type CurrencyCode = "EUR" | "USD" | "CAD" | "GBP" | "XOF" | "XAF";

export type CurrencyInfo = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  region: Region;
  /** Devises sans décimales (francs CFA). */
  zeroDecimal: boolean;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  EUR: { code: "EUR", label: "Euro", symbol: "€", region: "international", zeroDecimal: false },
  USD: { code: "USD", label: "Dollar US", symbol: "$", region: "international", zeroDecimal: false },
  CAD: {
    code: "CAD",
    label: "Dollar canadien",
    symbol: "CA$",
    region: "international",
    zeroDecimal: false,
  },
  GBP: {
    code: "GBP",
    label: "Livre sterling",
    symbol: "£",
    region: "international",
    zeroDecimal: false,
  },
  XOF: { code: "XOF", label: "Franc CFA (UEMOA)", symbol: "FCFA", region: "africa", zeroDecimal: true },
  XAF: { code: "XAF", label: "Franc CFA (CEMAC)", symbol: "FCFA", region: "africa", zeroDecimal: true },
};

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

/** Pays → devise locale. Tout pays absent bascule sur l'euro (ou le dollar hors Europe). */
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  // Europe
  FR: "EUR", BE: "EUR", LU: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR",
  IE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", CH: "EUR", GB: "GBP",
  // Amérique du Nord
  US: "USD", CA: "CAD",
  // UEMOA — XOF
  BJ: "XOF", TG: "XOF", CI: "XOF", BF: "XOF", SN: "XOF", ML: "XOF", NE: "XOF", GW: "XOF",
  // CEMAC — XAF
  CM: "XAF", GA: "XAF", CG: "XAF", TD: "XAF", CF: "XAF", GQ: "XAF",
};

export function currencyForCountry(country?: string | null): CurrencyCode {
  if (!country) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function regionForCurrency(currency: CurrencyCode): Region {
  return CURRENCIES[currency]?.region ?? "international";
}

export function formatPrice(amount: number, currency: CurrencyCode): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.EUR;
  const value = info.zeroDecimal
    ? Math.round(amount).toLocaleString("fr-FR")
    : amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return info.zeroDecimal ? `${value} ${info.symbol}` : `${value} ${info.symbol}`;
}

/** Moyens de paiement affichés dans le checkout. */
export const PAYMENT_METHODS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  paypal: "PayPal",
  mtn_momo: "MTN Mobile Money",
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  wave: "Wave",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement bancaire",
};

export const REGION_LABELS: Record<Region, string> = {
  international: "International",
  africa: "Afrique",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  succeeded: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
  canceled: "Annulé",
};
