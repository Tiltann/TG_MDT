"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";

type NuiVisibilityPayload = {
  visible?: boolean;
  screen?: string | null;
};

type NuiScreenPayload = {
  screen?: string | null;
};

type NuiDataPayload = {
  key?: string;
  value?: unknown;
};

export default function Home() {
  const [isHandshakeDone, setHandshakeDone] = useState(false);
  const [isVisible, setVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [screenData, setScreenData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let isMounted = true;

    const handshake = async () => {
      try {
        await fetchNui("nuiReady", {});
      } catch {
        // Browser/dev mode can run without a game client callback.
      } finally {
        if (isMounted) setHandshakeDone(true);
      }
    };

    handshake();
    return () => {
      isMounted = false;
    };
  }, []);

  useNuiEvent<NuiVisibilityPayload>("setVisible", (data) => {
    setVisible(Boolean(data?.visible));
    setActiveScreen(data?.screen ?? null);
  });

  useNuiEvent<NuiScreenPayload>("setScreen", (data) => {
    setActiveScreen(data?.screen ?? null);
  });

  useNuiEvent<NuiDataPayload>("setData", (data) => {
    if (!data?.key) return;
    setScreenData((prev) => ({
      ...prev,
      [data.key as string]: data.value,
    }));
  });

  const isTablet = useMemo(() => activeScreen === "tablet", [activeScreen]);

  // Hard requirement: show absolutely nothing until NUI handshake is done.
  if (!isHandshakeDone) return null;

  return (
    <main className="nui-root" data-visible={isVisible ? "true" : "false"}>
      <div className="nui-layer nui-layer-bg" />

      {isVisible && isTablet && (
        <section className="nui-layer nui-layer-tablet" aria-label="tablet-ui">
          <div className="tablet-shell">
            <header className="tablet-topbar">
              <span className="tablet-title">TG MDT Tablet</span>
              <button
                className="tablet-close"
                onClick={() => {
                  fetchNui("hideUI", {}).catch(() => undefined);
                }}
                type="button"
              >
                Close
              </button>
            </header>

            <div className="tablet-screen">
              <h1>Tablet Ready</h1>
              <p>This layer renders only when Lua sets screen = "tablet".</p>
              <pre>{JSON.stringify(screenData, null, 2)}</pre>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
