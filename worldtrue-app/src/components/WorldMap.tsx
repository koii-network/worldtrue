"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HistoricalEvent, CATEGORY_COLORS, CATEGORY_LABELS } from "@/types";

interface WorldMapProps {
  events: HistoricalEvent[];
  filteredEvents: HistoricalEvent[];
}

export default function WorldMap({ events, filteredEvents }: WorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map
      const map = L.map("world-map", {
        center: [20, 0],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true,
        zoomControl: false,
      });

      // Add custom dark tile layer for beautiful aesthetics
      L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
          maxZoom: 20,
        }
      ).addTo(map);

      // Add zoom control in top left
      L.control.zoom({ position: "topleft" }).addTo(map);

      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markersRef.current && mapRef.current) {
      // Clear existing markers
      markersRef.current.clearLayers();

      // Add markers for filtered events
      filteredEvents.forEach((event) => {
        const color = CATEGORY_COLORS[event.primaryCategory];
        const size = 8 + event.importance * 2; // Scale size by importance

        const icon = L.divIcon({
          html: `
            <div class="event-marker" style="
              background: ${color};
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              border: 2px solid rgba(255, 255, 255, 0.8);
              box-shadow: 0 0 20px ${color};
              animation: pulse 2s infinite;
            "></div>
          `,
          className: "custom-marker",
          iconSize: [size + 4, size + 4],
          iconAnchor: [size / 2 + 2, size / 2 + 2],
        });

        const categoriesList = event.categories
          .map(
            (cat) =>
              `<span style="display: inline-block; background: ${CATEGORY_COLORS[cat]}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin: 2px;">${CATEGORY_LABELS[cat]}</span>`
          )
          .join("");

        const marker = L.marker([event.lat, event.lng], { icon }).bindPopup(
          `
            <div style="min-width: 250px; max-width: 350px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${event.title}</h3>
              <p style="margin: 0 0 8px 0; color: ${color}; font-size: 13px; font-weight: 600;">${event.year}</p>
              <div style="margin-bottom: 8px;">
                ${categoriesList}
              </div>
              <p style="margin: 0; font-size: 13px; line-height: 1.5;">${event.description}</p>
            </div>
          `,
          {
            className: "custom-popup",
            maxWidth: 350,
          }
        );

        markersRef.current?.addLayer(marker);
      });
    }
  }, [filteredEvents]);

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .custom-marker {
          background: transparent !important;
          border: none !important;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(0, 0, 0, 0.95);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 16px;
        }

        .custom-popup .leaflet-popup-tip {
          background: rgba(0, 0, 0, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
        }

        .custom-popup .leaflet-popup-close-button {
          color: white !important;
          font-size: 20px !important;
        }

        .custom-popup .leaflet-popup-close-button:hover {
          color: #ccc !important;
        }
      `}</style>
      <div id="world-map" className="w-full h-full" />
    </>
  );
}
