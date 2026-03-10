import { useMapSegments } from '../hooks/useMapSegments';
import { useRealtimeSweep } from '../hooks/useRealtimeSweep';

/** Invisible component that hooks into map events to load CSCL segments and scan sweep status */
export default function MapEventHandler() {
  useMapSegments();
  useRealtimeSweep();
  return null;
}
