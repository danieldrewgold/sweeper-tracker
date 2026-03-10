import { Box, Text, HStack } from '@chakra-ui/react';
import { useSweepStore } from '../store';
import { timeAgo } from '../utils/time';

export default function BlockStatus() {
  const lastPollTime = useSweepStore((s) => s.lastPollTime);
  const sweepRecords = useSweepStore((s) => s.sweepRecords);
  const segments = useSweepStore((s) => s.segments);

  const realtimeSweepStatus = useSweepStore((s) => s.realtimeSweepStatus);

  const totalSegments = segments.size;
  // Count swept blocks from both SODA data and real-time sweepinfo scan
  const sodaSwept = sweepRecords.size;
  const realtimeSwept = [...realtimeSweepStatus.values()].filter((v) => v !== null).length;
  const sweptSegments = Math.max(sodaSwept, realtimeSwept);

  return (
    <Box px={1} py={1}>
      <HStack justify="space-between" fontSize="xs" color="gray.400">
        <HStack spacing={2}>
          <Box w="6px" h="6px" borderRadius="full" bg={sweptSegments > 0 ? 'green.400' : 'gray.500'} />
          <Text>
            {sweptSegments > 0
              ? `${sweptSegments.toLocaleString()} blocks swept today`
              : 'Waiting for sweep activity...'}
          </Text>
        </HStack>
        <Text>
          {lastPollTime ? `Updated ${timeAgo(lastPollTime)}` : 'Loading...'}
        </Text>
      </HStack>
      {totalSegments > 0 && (
        <Text fontSize="xs" color="gray.500" pl={4}>
          {totalSegments.toLocaleString()} blocks loaded in view
        </Text>
      )}
    </Box>
  );
}
