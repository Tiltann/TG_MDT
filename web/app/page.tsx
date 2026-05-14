"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./components/sidebar";
import { Topbar } from "./components/topbar";
import { DashboardView } from "./components/dashboard-view";

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

  // Fallback for browser dev mode to always show UI
  const is_browser = typeof window !== "undefined" && !("invokeNative" in window);
  const show_ui = is_browser || (isVisible && activeScreen !== null);

  // show absolutely nothing until NUI handshake is done.
  if (!isHandshakeDone && !is_browser) return null;

  const current_modules = (screenData?.meta as any)?.modules || {};
  const player_data = screenData?.player || { name: "Mock User", badge: "Badge #1234" };

  return (
    <main className="nui-root" data-visible={show_ui ? "true" : "false"}>
      <div className="nui-layer nui-layer-bg" />

      {show_ui && (
        <section className="nui-layer nui-layer-tablet" aria-label="tablet-ui">
          <div className="tablet-shell flex text-sm text-[var(--mdt-text-muted)]">
            
            {/* Modular Sidebar Component */}
            <Sidebar 
              currentView={activeScreen || "dashboard"} 
              modules={current_modules}
              playerData={player_data}
              onScreenChange={(screen) => setActiveScreen(screen)}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <Topbar onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))} />
              
              <div className="flex-1 overflow-auto p-6">
                {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && <DashboardView />}
                {activeScreen === "incidents" && <div>Incidents Component</div>}
                {activeScreen === "dispatch" && <div>Dispatch Component</div>}
              </div>
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
