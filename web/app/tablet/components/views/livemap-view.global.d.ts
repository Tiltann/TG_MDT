import type * as React from "react";

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
