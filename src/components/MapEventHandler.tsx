import { useMapSegments } from '../hooks/useMapSegments';

/** Invisible component that hooks into map events to load CSCL segments */
export default function MapEventHandler() {
  useMapSegments();
  return null;
}
