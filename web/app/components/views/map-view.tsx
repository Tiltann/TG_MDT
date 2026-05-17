"use client";

import { useEffect, useMemo, useRef } from "react";
import { Card } from "../ui/card";
import type { TFunction } from "../../lib/i18n";

type LeafletModule = typeof import("leaflet");

type MapMarker = {
  x: number;
  y: number;
  label?: string;
};

type PlayerPosition = {
  x: number;
  y: number;
};

type MapStyle = "styleAtlas" | "styleGrid" | "styleSatelite";

type MapViewProps = {
  t: TFunction;
  accent: string;
  mapStyle: MapStyle;
  markers?: MapMarker[];
  playerPosition?: PlayerPosition | null;
};

const WORLD_SIZE = 8192;
const MIN_ZOOM = 2;
const MAX_ZOOM = 5;

function gtaCoordsToLatLng(x: number, y: number): [number, number] {
  const center = WORLD_SIZE / 2;
  return [center - y, center + x];
}

export default function MapView({
  t,
  accent,
  mapStyle,
  markers = [],
  playerPosition,
}: MapViewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);

  const safeMarkers = useMemo(
    () => markers.filter((marker) => Number.isFinite(marker.x) && Number.isFinite(marker.y)),
    [markers]
  );

  useEffect(() => {
    let isCancelled = false;

    const initializeMap = async () => {
      if (!mapElementRef.current || mapInstanceRef.current) {
        return;
      }

      const leaflet = await import("leaflet");
      if (isCancelled || !mapElementRef.current) {
        return;
      }

      leafletRef.current = leaflet;

      const bounds = leaflet.latLngBounds([0, 0], [WORLD_SIZE, WORLD_SIZE]);
      const map = leaflet.map(mapElementRef.current, {
        crs: leaflet.CRS.Simple,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: true,
        attributionControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 1,
      });

      const activeLayer =
        mapStyle === "styleGrid"
          ? leaflet.tileLayer("./map/styleGrid/{z}/{x}/{y}.png", {
              tileSize: 256,
              minZoom: 0,
              maxZoom: MAX_ZOOM,
              noWrap: true,
              bounds,
              errorTileUrl: "./map/styleGrid/empty.png",
            })
          : mapStyle === "styleSatelite"
            ? leaflet.tileLayer("./map/styleSatelite/{z}/{x}/{y}.jpg", {
                tileSize: 256,
                minZoom: 0,
                maxZoom: MAX_ZOOM,
                noWrap: true,
                bounds,
                errorTileUrl: "./map/styleSatelite/empty.jpg",
              })
            : leaflet.tileLayer("./map/styleAtlas/{z}/{x}/{y}.jpg", {
                tileSize: 256,
                minZoom: 0,
                maxZoom: MAX_ZOOM,
                noWrap: true,
                bounds,
                errorTileUrl: "./map/styleAtlas/empty.jpg",
              });

      activeLayer.addTo(map);
      map.fitBounds(bounds);

      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 0);
    };

    initializeMap();

    return () => {
      isCancelled = true;
      markerLayerRef.current?.clearLayers();
      mapInstanceRef.current?.remove();
      markerLayerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [mapStyle]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!leaflet || !layer) {
      return;
    }

    layer.clearLayers();

    for (const marker of safeMarkers) {
      const [lat, lng] = gtaCoordsToLatLng(marker.x, marker.y);
      leaflet
        .circleMarker([lat, lng], {
          radius: 6,
          color: accent,
          fillColor: accent,
          fillOpacity: 0.85,
          weight: 2,
        })
        .bindPopup(marker.label || t("tablet.map.marker.default_label"))
        .addTo(layer);
    }

    if (playerPosition) {
      const [lat, lng] = gtaCoordsToLatLng(playerPosition.x, playerPosition.y);
      leaflet
        .circleMarker([lat, lng], {
          radius: 8,
          color: "#ffffff",
          fillColor: accent,
          fillOpacity: 1,
          weight: 2,
        })
        .bindPopup(t("tablet.map.marker.player"))
        .addTo(layer);
    }
  }, [accent, playerPosition, safeMarkers, t]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl card-title">{t("tablet.map.title")}</h3>
        <p className="text-xs text-[var(--mdt-text-muted)]">{t("tablet.map.subtitle")}</p>
      </div>

      <Card className="p-2 h-full min-h-[520px] overflow-hidden">
        <div ref={mapElementRef} className="h-full w-full rounded-lg" />
      </Card>
    </div>
  );
}
