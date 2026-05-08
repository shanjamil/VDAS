import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { MechanicData } from "@/lib/appData";

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
  mechanics: MechanicData[];
  activeId: string | null;
  userLocation?: { lat: number; lng: number } | null;
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

// Create a blue marker for the user
const UserIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const MechanicsMap = ({ mechanics, activeId, userLocation }: Props) => {
  const center = useMemo<[number, number]>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (mechanics.length === 0) return [0, 0];
    const lat = mechanics.reduce((s, m) => s + m.lat, 0) / mechanics.length;
    const lng = mechanics.reduce((s, m) => s + m.lng, 0) / mechanics.length;
    return [lat, lng];
  }, [mechanics, userLocation]);

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
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo mechanics={mechanics} activeId={activeId} />
      
      {/* User Location Marker */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}
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
                {m.distance_km} km away
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {m.phone !== "Not available" ? m.phone : "No phone listed"}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
