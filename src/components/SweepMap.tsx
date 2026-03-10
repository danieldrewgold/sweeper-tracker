import { MapContainer, TileLayer } from 'react-leaflet';
import { NYC_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import SegmentLayer from './SegmentLayer';
import SweepTileOverlay from './SweepTileOverlay';
import MapEventHandler from './MapEventHandler';
import FlyToBlock from './FlyToBlock';
import MapLegend from './MapLegend';
import 'leaflet/dist/leaflet.css';

export default function SweepMap() {
  return (
    <MapContainer
      center={NYC_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      minZoom={10}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <SweepTileOverlay />
      <MapEventHandler />
      <SegmentLayer />
      <FlyToBlock />
      <MapLegend />
    </MapContainer>
  );
}
