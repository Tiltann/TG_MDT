"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchNui, useNuiEvent } from "@/lib/useNui";
import { Sidebar } from "./components/sidebar";
import { Topbar } from "./components/topbar";
import DashboardView from "./components/dashboard-view";
import IncidentsView from "./components/views/incidents-view";
import DispatchView from "./components/views/dispatch-view";
import PersonsView from "./components/views/persons-view";
import VehiclesView from "./components/views/vehicles-view";
import ReportsView from "./components/views/reports-view";
import WarrantsView from "./components/views/warrants-view";
import EvidenceView from "./components/views/evidence-view";
import BoloView from "./components/views/bolo-view";
import { defaultMockupBranding, defaultMockupModules } from "./lib/mockup-config";

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

type NuiBrandingPayload = {
  name?: string;
  subtitle?: string;
  accent?: string;
  badge?: string;
  greeting?: string;
  dateLabel?: string;
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

  const meta = (screenData?.meta as any) || {};
  const current_modules = meta.modules || defaultMockupModules;
  const branding = {
    ...defaultMockupBranding,
    ...(meta.branding as NuiBrandingPayload | undefined),
  };
  const player_data = screenData?.player || { name: "Mock User", badge: branding.badge };

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
              branding={branding}
              onScreenChange={(screen) => setActiveScreen(screen)}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <Topbar branding={branding} onClose={() => fetchNui("hideUI", {}).catch(() => setVisible(false))} />
              
              <div className="flex-1 overflow-hidden p-6">
                {(!activeScreen || activeScreen === "dashboard" || activeScreen === "tablet") && <DashboardView branding={branding} modules={current_modules} />}
                {activeScreen === "incidents" && <IncidentsView />}
                {activeScreen === "dispatch" && <DispatchView />}
                {activeScreen === "persons" && <PersonsView />}
                {activeScreen === "vehicles" && <VehiclesView />}
                {activeScreen === "reports" && <ReportsView />}
                {activeScreen === "warrants" && <WarrantsView />}
                {activeScreen === "evidence" && <EvidenceView />}
                {activeScreen === "bolo" && <BoloView />}
              </div>
            </div>

          </div>
        </section>
      )}
    </main>
  );
}
