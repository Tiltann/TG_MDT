// TypeScript declaration for gta-v-map web component usage in React/Next.js
// Place this in your web/types or web/ directory

declare namespace JSX {
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
      // Add more attributes as needed
    };
  }
}
