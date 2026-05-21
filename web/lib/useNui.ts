/**
 * FiveM NUI utilities
 *
 * fetchNui  — send a callback to the resource's server/client handler
 * useNuiEvent — listen for NUI messages sent via SendNUIMessage
 */

import { useEffect } from "react";

const IS_FIVEM =
  typeof window !== "undefined" &&
  typeof (window as Window & { invokeNative?: unknown }).invokeNative !== "undefined";
const RESOURCE_NAME =
  // @ts-ignore — injected by FiveM
  typeof GetParentResourceName !== "undefined"
    ? // @ts-ignore
      GetParentResourceName()
    : "TG_MDT";

function getDevMockResponse<T>(eventName: string, data?: unknown): T | null {
  if (eventName !== "openAktePhotoMode") {
    return null;
  }

  const seedSource =
    typeof data === "object" && data !== null && "seed" in data && typeof (data as { seed?: unknown }).seed === "string"
      ? (data as { seed: string }).seed
      : typeof data === "object" && data !== null && "context" in data && typeof (data as { context?: unknown }).context === "string"
        ? (data as { context: string }).context
        : "mdt-dev-camera";
  const seed = encodeURIComponent(seedSource.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"));

  return {
    ok: true,
    images: [`https://picsum.photos/seed/${seed}/1200/800`],
  } as T;
}

/**
 * Send a NUI callback to the resource.
 * Falls back to a local mock during browser dev.
 */
export async function fetchNui<T = unknown>(
  eventName: string,
  data?: unknown
): Promise<T> {
  if (typeof window === "undefined") {
    return {} as T;
  }

  if (!IS_FIVEM) {
    const mockResponse = getDevMockResponse<T>(eventName, data);
    if (mockResponse) {
      return mockResponse;
    }
  }

  const url = IS_FIVEM
    ? `https://${RESOURCE_NAME}/${eventName}`
    : `/nui/${eventName}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data ?? {}),
    });

    if (!res.ok) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  } catch {
    // Browser/dev mode without a mock endpoint should not crash the UI.
    return {} as T;
  }
}

/**
 * Subscribe to NUI messages sent via SendNUIMessage({ type, data }).
 */
export function useNuiEvent<T = unknown>(
  type: string,
  handler: (data: T) => void
): void {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const { type: evtType, data } = event.data ?? {};
      if (evtType === type) handler(data as T);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [type, handler]);
}
