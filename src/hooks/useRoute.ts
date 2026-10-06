import { useSyncExternalStore } from 'react';

export type Route = 'map' | 'data' | 'privacy';

const PATHS: Record<Route, string> = { map: '/', data: '/data', privacy: '/privacy' };

function getRoute(): Route {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/data') return 'data';
  if (path === '/privacy') return 'privacy';
  return 'map';
}

// Shared snapshot so all hook instances stay in sync
let currentRoute: Route = getRoute();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Route {
  return currentRoute;
}

function navigateTo(r: Route) {
  window.history.pushState({}, '', PATHS[r]);
  currentRoute = r;
  listeners.forEach((cb) => cb());
}

// Sync with browser back/forward
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    currentRoute = getRoute();
    listeners.forEach((cb) => cb());
  });
}

export function useRoute(): [Route, (r: Route) => void] {
  const route = useSyncExternalStore(subscribe, getSnapshot);
  return [route, navigateTo];
}
