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
