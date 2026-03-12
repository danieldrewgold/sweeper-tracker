import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Flex, VStack, Text, Alert, AlertIcon, useBreakpointValue } from '@chakra-ui/react';
import './App.css';
import Header from './components/Header';
import SweepMap from './components/SweepMap';
import AddressSearch from './components/AddressSearch';
import PredictionCard from './components/PredictionCard';
import AspScheduleCard from './components/AspScheduleCard';
import BlockStatus from './components/BlockStatus';
import { useSweepData } from './hooks/useSweepData';
import { useEta } from './hooks/useEta';
import { useUserBlock } from './hooks/useUserBlock';
import { useSweepStore } from './store';
import { useRestoreBlock } from './hooks/useRestoreBlock';
import { useSweepAlerts } from './hooks/useSweepAlerts';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function DesktopSidebar() {
  const { selectFromGeocode } = useUserBlock();
  const error = useSweepStore((s) => s.error);
  const isLoading = useSweepStore((s) => s.isLoading);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);

  return (
    <Box
      w="380px"
      flexShrink={0}
      bg="gray.100"
      overflowY="auto"
      borderRight="1px"
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
    >
      {/* Search container */}
      <Box bg="white" px={4} pt={4} pb={3} borderBottom="1px" borderColor="gray.200">
        <AddressSearch onSelect={selectFromGeocode} />
      </Box>

      <VStack align="stretch" spacing={3} p={4} flex={1}>
        {error && (
          <Alert status="error" borderRadius="md" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {isLoading && (
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Loading block data...
          </Text>
        )}

        <PredictionCard />
        <AspScheduleCard />

        {!userPhysicalId && !isLoading && (
          <Box
            textAlign="center"
            py={10}
            px={6}
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            border="1px dashed"
            borderColor="gray.200"
          >
            <Box fontSize="3xl" mb={3}>🧹</Box>
            <Text fontSize="lg" fontWeight="semibold" color="gray.700" mb={2}>
              Track your street sweeper
            </Text>
            <Text fontSize="sm" color="gray.500" lineHeight="tall">
              Enter your NYC address above to see when the sweeper
              typically reaches your block and track it live.
            </Text>
            <Text fontSize="xs" color="gray.400" mt={4}>
              Zoom into the map to see color-coded sweep progress.
            </Text>
          </Box>
        )}
      </VStack>

      <Box bg="gray.800" px={4} py={2}>
        <BlockStatus />
      </Box>
    </Box>
  );
}

/**
 * Mobile bottom sheet — GPU-composited drag via direct DOM manipulation.
 * During a drag gesture, ZERO React re-renders happen. All position updates
 * go straight to `element.style.transform` for 60fps+ smoothness.
 * The panel uses translateY to slide: 0 = fully open, collapsedOffset = peek.
 */
function MobilePanel() {
  const { selectFromGeocode } = useUserBlock();
  const error = useSweepStore((s) => s.error);
  const isLoading = useSweepStore((s) => s.isLoading);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const [expanded, setExpanded] = useState(false); // only for overflow toggle

  const PEEK_HEIGHT = 110; // px visible when collapsed (handle + search + hint)

  // All drag tracking lives in refs — no state = no re-renders during gesture
  const drag = useRef({
    active: false,
    startY: 0,
    startOffset: 0, // translateY at drag start
    lastY: 0,
    lastTime: 0,
    velocity: 0, // px/ms
  });

  /** How far down to push panel when collapsed */
  const getCollapsedOffset = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return 0;
    return Math.max(0, panel.offsetHeight - PEEK_HEIGHT);
  }, []);

  /** Animate to open or closed position */
  const snapTo = useCallback((open: boolean) => {
    expandedRef.current = open;
    setExpanded(open);
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    panel.style.transform = open
      ? 'translateY(0)'
      : `translateY(${getCollapsedOffset()}px)`;
    if (!open && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [getCollapsedOffset]);

  // Auto-expand when a block is selected
  const prevBlockRef = useRef<string | null>(null);
  useEffect(() => {
    if (userPhysicalId && userPhysicalId !== prevBlockRef.current) {
      snapTo(true);
    }
    prevBlockRef.current = userPhysicalId;
  }, [userPhysicalId, snapTo]);

  // Set initial collapsed position after first paint
  useEffect(() => {
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${getCollapsedOffset()}px)`;
    });
  }, [getCollapsedOffset]);

  // Keep collapsed offset in sync when panel content changes size
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => {
      if (!expandedRef.current && !drag.current.active) {
        panel.style.transition = 'none';
        panel.style.transform = `translateY(${getCollapsedOffset()}px)`;
      }
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [getCollapsedOffset]);

  // ── Touch handlers — direct DOM, no setState ──

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    // Read current translateY from the live computed style
    const matrix = new DOMMatrix(getComputedStyle(panel).transform);
    const now = e.touches[0].clientY;
    drag.current = {
      active: true,
      startY: now,
      startOffset: matrix.m42,
      lastY: now,
      lastTime: Date.now(),
      velocity: 0,
    };
    panel.style.transition = 'none'; // kill CSS transition during drag
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const panel = panelRef.current;
    if (!panel) return;

    // If expanded and user has scrolled down in the content, let scroll handle it
    if (expandedRef.current) {
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      if (scrollTop > 1) return;
    }

    const touchY = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) d.velocity = (touchY - d.lastY) / dt; // px/ms
    d.lastY = touchY;
    d.lastTime = now;

    const deltaY = touchY - d.startY;
    const maxOffset = getCollapsedOffset();
    let newOffset = d.startOffset + deltaY;

    // Rubber-band at edges
    if (newOffset < 0) newOffset *= 0.25;
    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.25;
    }

    panel.style.transform = `translateY(${newOffset}px)`;
    e.preventDefault(); // prevent map panning
  }, [getCollapsedOffset]);

  const onTouchEnd = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;

    const panel = panelRef.current;
    if (!panel) return;
    const matrix = new DOMMatrix(getComputedStyle(panel).transform);
    const finalY = matrix.m42;
    const maxOffset = getCollapsedOffset();
    const velocity = d.velocity; // px/ms; positive = moving down

    // Velocity-based snap: a quick flick overrides position
    const FLICK_THRESHOLD = 0.4; // px/ms
    if (velocity > FLICK_THRESHOLD) {
      snapTo(false); // flick down → collapse
    } else if (velocity < -FLICK_THRESHOLD) {
      snapTo(true); // flick up → expand
    } else {
      // Position-based: snap to nearest
      snapTo(finalY < maxOffset / 2);
    }
  }, [getCollapsedOffset, snapTo]);

  return (
    <Box
      ref={panelRef}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="gray.50"
      borderTopRadius="xl"
      boxShadow="0 -4px 16px rgba(0,0,0,0.18)"
      zIndex={1000}
      maxH="75vh"
      display="flex"
      flexDirection="column"
      willChange="transform"
    >
      {/* ── Drag handle ── */}
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => snapTo(!expandedRef.current)}
        cursor="pointer"
        py={3}
        flexShrink={0}
        sx={{ touchAction: 'none' }}
      >
        <Box w="36px" h="4px" bg="gray.300" borderRadius="full" mx="auto" />
      </Box>

      {/* ── Scrollable content ── */}
      <Box
        ref={scrollRef}
        overflowY={expanded ? 'auto' : 'hidden'}
        flex={1}
        minH={0}
        sx={{
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <VStack align="stretch" spacing={2} px={3} pb={3}>
          <AddressSearch onSelect={selectFromGeocode} />

          {error && (
            <Alert status="error" borderRadius="md" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {isLoading && (
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Loading block data...
            </Text>
          )}

          {/* Always rendered so panel height is stable for translateY math */}
          <PredictionCard />
          <AspScheduleCard />
          <BlockStatus />

          {!userPhysicalId && !isLoading && (
            <Text fontSize="xs" color="gray.500" textAlign="center" pb={1}>
              🧹 Enter an address to get started
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

function AppContent() {
  useSweepData();
  useEta();
  useRestoreBlock();
  useSweepAlerts();

  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Flex h="100%" direction="column">
      <Header />
      <Flex flex={1} overflow="hidden" position="relative">
        {!isMobile && <DesktopSidebar />}

        <Box flex={1} position="relative">
          <SweepMap />
          {isMobile && <MobilePanel />}
        </Box>
      </Flex>
    </Flex>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
