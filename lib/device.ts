"use client";

export type DeviceDescriptor = {
  deviceName: string;
  browser: string;
  os: string;
  fingerprint: string;
};

export async function describeDevice(): Promise<DeviceDescriptor> {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  const deviceName = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android device" : os === "macOS" ? "Mac" : os === "Windows" ? "Windows PC" : "Computer";
  const storageKey = "devopscrack.device.id";
  let installationId = localStorage.getItem(storageKey);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(storageKey, installationId);
  }
  const bytes = new TextEncoder().encode(`${installationId}|${browser}|${os}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  return { deviceName, browser, os, fingerprint };
}
