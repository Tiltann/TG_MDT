"use client";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

// TypeScript: allow <gta-v-map> as a JSX element
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "gta-v-map": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        tilebaseurl?: string;
        defaultstyle?: string;
        minzoom?: number;
        maxzoom?: number;
        zoom?: number;
        maxbounds?: string;
        maxboundsviscosity?: number;
        blipsurl?: string;
        showlayercontrol?: boolean;
        markers?: string;
      };
    }
  }
}

export {};

export default function LiveMapView({ t }: { t: TFunction }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(typeof window !== "undefined");
    if (typeof window !== "undefined" && !customElements.get("gta-v-map")) {
      import("gta-v-map").then(mod => {
        // Registers the custom element
        if (mod && mod.GtaVMap) {
          customElements.define("gta-v-map", mod.GtaVMap);
        }
      }).catch(() => {});
    }
  }, []);

  if (!isClient) {
    return null;
  }

  // The tileBaseUrl should point to your local styleAtlas folder (relative to public)
  // e.g. /map/styleAtlas

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.sidebar.livemap")}</h3>
        <p className="card-sub mt-1">{t("tablet.map.subtitle")}</p>
      </div>
      <Card className="flex min-h-0 flex-1 overflow-hidden border-(--mdt-border) bg-black p-0">
        {/* @ts-expect-error: Custom element not in JSX.IntrinsicElements */}
        <gta-v-map
          style={{ width: "100%", height: "100%", minHeight: 0, borderRadius: "0.75rem", display: "block" }}
          tile-base-url="map"
          atlas-url="map/styleAtlas/{z}/{x}/{y}.jpg"
          satellite-url="map/styleAtlas/{z}/{x}/{y}.jpg"
          grid-url="map/styleAtlas/{z}/{x}/{y}.jpg"
          default-style="atlas"
          min-zoom={0}
          max-zoom={5}
          zoom={1}
          max-bounds-viscosity={1}
        />
      </Card>
    </div>
  );
}
