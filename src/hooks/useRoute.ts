import { useSyncExternalStore } from 'react';

export type Route = 'map' | 'data';

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === '/data' || path === '/data/') return 'data';
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
  const path = r === 'data' ? '/data' : '/';
  window.history.pushState({}, '', path);
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
