import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { MockMechanic } from "@/lib/mockData";

// Fix default marker icon paths for bundlers.
const DefaultIcon = L.icon({
  iconUrl: markerIcon as unknown as string,
  iconRetinaUrl: markerIcon2x as unknown as string,
  shadowUrl: markerShadow as unknown as string,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  mechanics: MockMechanic[];
  activeId: string | null;
}

function FlyTo({ mechanics, activeId }: Props) {
  const map = useMap();
  useEffect(() => {
    if (!activeId) return;
    const m = mechanics.find((x) => x.id === activeId);
    if (m) map.flyTo([m.lat, m.lng], 15, { duration: 0.8 });
  }, [activeId, mechanics, map]);
  return null;
}

export const MechanicsMap = ({ mechanics, activeId }: Props) => {
  const center = useMemo<[number, number]>(() => {
    const lat = mechanics.reduce((s, m) => s + m.lat, 0) / mechanics.length;
    const lng = mechanics.reduce((s, m) => s + m.lng, 0) / mechanics.length;
    return [lat, lng];
  }, [mechanics]);

  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    if (activeId && markerRefs.current[activeId]) {
      markerRefs.current[activeId]?.openPopup();
    }
  }, [activeId]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo mechanics={mechanics} activeId={activeId} />
      {mechanics.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          ref={(ref) => {
            markerRefs.current[m.id] = ref;
          }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong>{m.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                ★ {m.rating} ({m.reviews}) · {m.distance_km} km
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{m.phone}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
