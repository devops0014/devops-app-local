"use client";

/**
 * First-touch attribution: remembers which ad / link first brought a visitor,
 * so the leads dashboard can show "meta · diwali-campaign" next to each student.
 * Kept for 30 days in the visitor's browser.
 */
const KEY = "dc-first-touch";
const MAX_AGE_MS = 30 * 24 * 60 * 60_000;

export type Attribution = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string;
  referrer?: string; landing_path?: string; captured_at: number;
};

function read(): Attribution | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Attribution | null;
    return value && Date.now() - value.captured_at < MAX_AGE_MS ? value : null;
  } catch {
    return null;
  }
}

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string) => params.get(key)?.trim().slice(0, 150) || undefined;
  const fromAd = {
    utm_source: pick("utm_source") ?? (params.has("fbclid") ? "meta" : params.has("li_fat_id") ? "linkedin" : params.has("gclid") ? "google" : undefined),
    utm_medium: pick("utm_medium") ?? (params.has("fbclid") || params.has("li_fat_id") || params.has("gclid") ? "paid" : undefined),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
  };
  const externalReferrer = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer.slice(0, 300) : undefined;
  const existing = read();
  // Keep the first touch; only a new ad click replaces an organic/direct one.
  if (existing && (existing.utm_source || !fromAd.utm_source)) return;
  const value: Attribution = {
    ...fromAd,
    referrer: externalReferrer,
    landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    captured_at: Date.now(),
  };
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage may be blocked */ }
}

/** Fields to attach to a new account. */
export function attributionForSignup(): Record<string, string> {
  const value = read();
  if (!value) return {};
  const { captured_at: _ignored, ...fields } = value;
  void _ignored;
  return Object.fromEntries(Object.entries(fields).filter(([, item]) => typeof item === "string" && item)) as Record<string, string>;
}
