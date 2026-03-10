import { useEffect, useState } from 'react';
import { Box, Text, VStack, Badge, Divider, HStack, Icon } from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, WarningIcon } from '@chakra-ui/icons';
import { useSweepStore } from '../store';
import { formatTime, formatMinutes, dateToMinutes } from '../utils/time';

/** Format a countdown in minutes to a readable string */
function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'any moment now';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `~${m} min`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

export default function PredictionCard() {
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const userAddress = useSweepStore((s) => s.userAddress);
  const sweepVisitTime = useSweepStore((s) => s.sweepVisitTime);
  const historicalPattern = useSweepStore((s) => s.historicalPattern);
  const eta = useSweepStore((s) => s.eta);
  const aspSchedules = useSweepStore((s) => s.aspSchedules);
  const isLoading = useSweepStore((s) => s.isLoading);
  // Must call ALL hooks before any conditional returns (Rules of Hooks)
  const realtimeSweepStatus = useSweepStore((s) => s.realtimeSweepStatus);

  // Tick every minute to keep countdown fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!userPhysicalId) return null;

  // Use real-time visit time — check both single-block and batch scan for consistency
  const todayStr = new Date().toDateString();
  const singleBlockSwept = sweepVisitTime && sweepVisitTime.toDateString() === todayStr;
  const batchSweptTime = userPhysicalId ? realtimeSweepStatus.get(userPhysicalId) : undefined;
  const wasSwept = !!(singleBlockSwept || batchSweptTime);
  const lastSweepTime = sweepVisitTime ?? batchSweptTime ?? null;

  // Find today's ASP schedule
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const todaySchedule = aspSchedules.find((s) => s.day === today);

  // Real-time ETA from nearby frontier
  const isSweeperNearby = !wasSwept && eta && eta.estimatedMinutes !== null;

  // Historical countdown: time until expected sweep
  const todayDow = new Date().getDay();
  const isHistoricalToday = historicalPattern && historicalPattern.dayOfWeek === todayDow;
  const nowMinutes = dateToMinutes(new Date());
  const minutesUntilExpected =
    isHistoricalToday ? Math.round(historicalPattern.medianTimeMinutes - nowMinutes) : null;
  const showCountdown = !wasSwept && !isSweeperNearby && isHistoricalToday && minutesUntilExpected !== null;

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" overflow="hidden">
      {/* Header */}
      <Box bg="green.50" px={4} py={3} borderBottom="1px" borderColor="green.100">
        <Text fontSize="sm" fontWeight="bold" color="green.800">
          YOUR BLOCK
        </Text>
        <Text fontSize="xs" color="gray.600" noOfLines={1}>
          {userAddress ?? 'Selected block'}
        </Text>
      </Box>

      <VStack align="stretch" spacing={3} p={4}>
        {/* State 3: Done */}
        {wasSwept && lastSweepTime && (
          <>
            <HStack spacing={2}>
              <Icon as={CheckCircleIcon} color="green.500" boxSize={5} />
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="bold" color="green.700">
                  Swept at {formatTime(lastSweepTime)} today
                </Text>
              </VStack>
            </HStack>

            {todaySchedule && (
              <HStack
                spacing={2}
                bg="orange.50"
                px={3}
                py={2}
                borderRadius="md"
              >
                <Icon as={WarningIcon} color="orange.500" boxSize={4} />
                <Text fontSize="xs" color="orange.800">
                  ASP enforcement continues until {todaySchedule.endTime}
                </Text>
              </HStack>
            )}
          </>
        )}

        {/* State 2: Sweeper Nearby (real-time ETA) */}
        {isSweeperNearby && (
          <>
            <HStack spacing={2}>
              <Badge colorScheme="yellow" fontSize="sm" px={2} py={1} borderRadius="md">
                Sweeper nearby!
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.700">
              ~{eta.blocksAway} block{eta.blocksAway !== 1 ? 's' : ''} away
              {' '}({formatTime(eta.lastSeenTime)})
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              ETA: ~{eta.estimatedMinutes} min
            </Text>
            {eta.confidence !== 'high' && (
              <Text fontSize="xs" color="gray.500">
                Estimate confidence: {eta.confidence}
              </Text>
            )}
          </>
        )}

        {/* State 1: Waiting — with historical countdown */}
        {!wasSwept && !isSweeperNearby && (
          <>
            <HStack spacing={2}>
              <Icon as={TimeIcon} color="gray.400" boxSize={4} />
              <Text fontSize="sm" color="gray.600">
                Not yet swept today
              </Text>
            </HStack>
            {lastSweepTime && !wasSwept && (
              <Text fontSize="xs" color="gray.500">
                Last swept {lastSweepTime.toLocaleDateString('en-US', { weekday: 'long' })}{' '}
                at {formatTime(lastSweepTime)}
              </Text>
            )}

            {/* Historical countdown */}
            {showCountdown && minutesUntilExpected > 0 && (
              <Box bg="purple.50" px={3} py={2} borderRadius="md">
                <Text fontSize="sm" fontWeight="bold" color="purple.700">
                  Expected in {formatCountdown(minutesUntilExpected)}
                </Text>
                <Text fontSize="xs" color="purple.500">
                  Usually arrives around {formatMinutes(historicalPattern.medianTimeMinutes)}
                </Text>
              </Box>
            )}
            {showCountdown && minutesUntilExpected !== null && minutesUntilExpected <= 0 && (
              <Box bg="yellow.50" px={3} py={2} borderRadius="md">
                <Text fontSize="sm" fontWeight="bold" color="yellow.700">
                  Sweeper expected any moment
                </Text>
                <Text fontSize="xs" color="yellow.600">
                  Usually arrives around {formatMinutes(historicalPattern.medianTimeMinutes)}
                </Text>
              </Box>
            )}
          </>
        )}

        {/* Historical pattern (shown in all states when available) */}
        {historicalPattern && (
          <>
            <Divider />
            <Box bg="blue.50" px={3} py={2} borderRadius="md">
              <Text fontSize="xs" color="blue.700" fontWeight="medium">
                Usually swept around {historicalPattern.medianTimeFormatted} on{' '}
                {historicalPattern.dayName}s
              </Text>
              <Text fontSize="xs" color="blue.500">
                Based on {historicalPattern.sampleCount} observation{historicalPattern.sampleCount !== 1 ? 's' : ''} (
                ±{historicalPattern.rangeMinutes} min)
              </Text>
            </Box>
          </>
        )}

        {/* No historical data available */}
        {!historicalPattern && !isLoading && !wasSwept && (
          <>
            <Divider />
            <Text fontSize="xs" color="gray.400">
              No historical sweep data for this block. ETA estimates aren't available for all streets.
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
}
