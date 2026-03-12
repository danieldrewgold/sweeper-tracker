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

function MobilePanel() {
  const { selectFromGeocode } = useUserBlock();
  const error = useSweepStore((s) => s.error);
  const isLoading = useSweepStore((s) => s.isLoading);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0); // positive = dragging down (closing)
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-expand when a block is selected
  const prevBlockRef = useRef<string | null>(null);
  useEffect(() => {
    if (userPhysicalId && userPhysicalId !== prevBlockRef.current) {
      setExpanded(true);
    }
    prevBlockRef.current = userPhysicalId;
  }, [userPhysicalId]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (expanded) {
      // When expanded: only allow dragging down (to collapse), and only if scrolled to top
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) return; // let normal scroll happen
      if (delta > 0) {
        e.preventDefault();
        setDragOffset(delta);
      }
    } else {
      // When collapsed: only allow dragging up (to expand)
      if (delta < 0) {
        e.preventDefault();
        setDragOffset(delta);
      }
    }
  }, [dragging, expanded]);

  const handleTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const threshold = 60; // px to trigger snap
    if (expanded && dragOffset > threshold) {
      setExpanded(false);
    } else if (!expanded && dragOffset < -threshold) {
      setExpanded(true);
    }
    setDragOffset(0);
  }, [dragging, expanded, dragOffset]);

  // Compute transform for drag feedback
  const dragTransform = dragging && dragOffset !== 0
    ? `translateY(${dragOffset}px)`
    : undefined;

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="gray.50"
      borderTopRadius="xl"
      boxShadow="0 -4px 16px rgba(0,0,0,0.18)"
      zIndex={1000}
      maxH={expanded ? '75vh' : 'auto'}
      transition={dragging ? 'none' : 'max-height 0.3s ease, transform 0.3s ease'}
      transform={dragTransform}
      display="flex"
      flexDirection="column"
    >
      {/* Drag handle — swipe target */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setExpanded(!expanded)}
        cursor="pointer"
        py={2}
        flexShrink={0}
      >
        <Box
          w="36px"
          h="4px"
          bg="gray.300"
          borderRadius="full"
          mx="auto"
        />
      </Box>

      {/* Scrollable content */}
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

          {expanded && (
            <>
              <PredictionCard />
              <AspScheduleCard />
              <BlockStatus />
            </>
          )}

          {!expanded && userPhysicalId && (
            <Text fontSize="xs" color="green.600" textAlign="center" pb={1}>
              Swipe up for block details
            </Text>
          )}

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
    <Flex h="100vh" direction="column">
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
