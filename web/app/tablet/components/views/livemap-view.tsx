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
    <div className="h-full flex flex-col gap-4">
      <div>
        <h3 className="text-2xl card-title">{t("tablet.sidebar.livemap")}</h3>
        <p className="card-sub mt-1">StyleAtlas Livemap (gta-v-map)</p>
      </div>
      <Card className="p-0 flex-1 overflow-hidden border-(--mdt-border) bg-black">
        {/* @ts-expect-error: Custom element not in JSX.IntrinsicElements */}
        <gta-v-map
          style={{ width: "100%", height: "60vh", minHeight: 400, borderRadius: "0.75rem", display: "block" }}
          tilebaseurl="/map/styleAtlas"
          defaultstyle="atlas"
          minzoom={0}
          maxzoom={5}
          zoom={1}
          maxbounds="[[0,0],[6144,6144]]"
          maxboundsviscosity={1}
        />
      </Card>
    </div>
  );
}
