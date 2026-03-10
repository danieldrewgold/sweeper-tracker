import { useState, useRef, useEffect } from 'react';
import { Box, Flex, VStack, Text, Alert, AlertIcon, IconButton, useBreakpointValue } from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
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

function DesktopSidebar() {
  const { selectFromGeocode } = useUserBlock();
  const error = useSweepStore((s) => s.error);
  const isLoading = useSweepStore((s) => s.isLoading);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);

  return (
    <Box
      w="380px"
      flexShrink={0}
      bg="gray.50"
      overflowY="auto"
      borderRight="1px"
      borderColor="gray.200"
      display="flex"
      flexDirection="column"
    >
      <VStack align="stretch" spacing={3} p={4} flex={1}>
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

        <PredictionCard />
        <AspScheduleCard />

        {!userPhysicalId && !isLoading && (
          <Box textAlign="center" py={8}>
            <Text fontSize="lg" mb={2}>
              Welcome to SweepTracker
            </Text>
            <Text fontSize="sm" color="gray.500">
              Enter your NYC address to see when the street sweeper
              typically reaches your block and track it live.
            </Text>
            <Text fontSize="xs" color="gray.400" mt={4}>
              Zoom into the map to see color-coded sweep progress.
            </Text>
          </Box>
        )}
      </VStack>

      <Box px={4} pb={2} borderTop="1px" borderColor="gray.200">
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

  // Auto-expand when a block is selected
  const prevBlockRef = useRef<string | null>(null);
  useEffect(() => {
    if (userPhysicalId && userPhysicalId !== prevBlockRef.current) {
      setExpanded(true);
    }
    prevBlockRef.current = userPhysicalId;
  }, [userPhysicalId]);

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="gray.50"
      borderTopRadius="xl"
      boxShadow="0 -2px 10px rgba(0,0,0,0.15)"
      zIndex={1000}
      maxH={expanded ? '70vh' : 'auto'}
      overflowY={expanded ? 'auto' : 'hidden'}
      transition="max-height 0.3s ease"
    >
      {/* Drag handle + toggle */}
      <Flex justify="center" pt={1} pb={0}>
        <IconButton
          aria-label={expanded ? 'Collapse' : 'Expand'}
          icon={expanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
          size="xs"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
        />
      </Flex>

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
          <Text fontSize="xs" color="green.600" textAlign="center" pb={1} cursor="pointer" onClick={() => setExpanded(true)}>
            Tap to see block details
          </Text>
        )}

        {!userPhysicalId && !isLoading && (
          <Text fontSize="xs" color="gray.400" textAlign="center" pb={1}>
            Enter an address to get started
          </Text>
        )}
      </VStack>
    </Box>
  );
}

function AppContent() {
  useSweepData();
  useEta();
  useRestoreBlock();

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
  return <AppContent />;
}
