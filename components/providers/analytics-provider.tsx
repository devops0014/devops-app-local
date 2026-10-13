"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function loadPixel(id: string) {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  window.fbq("init", id);
}

/** Fires a Meta Pixel event. `eventId` lets Meta de-duplicate it with the server event. */
export function trackMetaEvent(name: string, params: Record<string, unknown> = {}, eventId?: string) {
  if (!pixelId || typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", name, params, eventId ? { eventID: eventId } : undefined);
}

/** Captures ad attribution and sends Meta Pixel page views. Mounted once in the root layout. */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
    if (pixelId) loadPixel(pixelId);
  }, []);

  useEffect(() => {
    if (pixelId && window.fbq) window.fbq("track", "PageView");
  }, [pathname]);

  return null;
}
