import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSweepStore } from '../store';

export default function FlyToBlock() {
  const map = useMap();
  const userLatLng = useSweepStore((s) => s.userLatLng);
  const prevLatLng = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!userLatLng) return;
    // Only fly if the location actually changed
    if (
      prevLatLng.current &&
      prevLatLng.current[0] === userLatLng[0] &&
      prevLatLng.current[1] === userLatLng[1]
    ) {
      return;
    }
    prevLatLng.current = userLatLng;
    map.flyTo(userLatLng, 16, { duration: 1.5 });
  }, [userLatLng, map]);

  return null;
}
