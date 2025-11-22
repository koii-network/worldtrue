"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface WorldMapProps {
  selectedYear: number;
  events: Array<{
    id: string;
    year: number;
    title: string;
    description: string;
    lat: number;
    lng: number;
    type: "conflict" | "discovery" | "cultural" | "political" | "technological";
  }>;
}

export default function WorldMap({ selectedYear, events }: WorldMapProps) {
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

      // Filter events by year
      const relevantEvents = events.filter(
        (event) => event.year <= selectedYear && event.year > selectedYear - 100
      );

      // Add markers for filtered events
      relevantEvents.forEach((event) => {
        const opacity = 1 - (selectedYear - event.year) / 100;

        const colorMap = {
          conflict: "#ef4444",
          discovery: "#3b82f6",
          cultural: "#a855f7",
          political: "#f59e0b",
          technological: "#10b981",
        };

        const icon = L.divIcon({
          html: `
            <div class="event-marker" style="
              background: ${colorMap[event.type]};
              opacity: ${opacity};
              width: ${12 + opacity * 8}px;
              height: ${12 + opacity * 8}px;
              border-radius: 50%;
              border: 2px solid rgba(255, 255, 255, ${opacity});
              box-shadow: 0 0 ${20 * opacity}px ${colorMap[event.type]};
              animation: pulse 2s infinite;
            "></div>
          `,
          className: "custom-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([event.lat, event.lng], { icon })
          .bindPopup(
            `
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${event.title}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${event.year}</p>
              <p style="margin: 0; font-size: 14px;">${event.description}</p>
            </div>
          `,
            {
              className: "custom-popup",
            }
          );

        markersRef.current?.addLayer(marker);
      });
    }
  }, [selectedYear, events]);

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
          background: rgba(0, 0, 0, 0.9);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }

        .custom-popup .leaflet-popup-tip {
          background: rgba(0, 0, 0, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div id="world-map" className="w-full h-full" />
    </>
  );
}