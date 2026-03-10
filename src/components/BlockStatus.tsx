import { Box, Text, HStack } from '@chakra-ui/react';
import { useSweepStore } from '../store';
import { timeAgo } from '../utils/time';

export default function BlockStatus() {
  const lastPollTime = useSweepStore((s) => s.lastPollTime);
  const sweepRecords = useSweepStore((s) => s.sweepRecords);
  const segments = useSweepStore((s) => s.segments);

  const totalSegments = segments.size;
  const sweptSegments = sweepRecords.size;

  return (
    <Box px={1} py={2}>
      <HStack justify="space-between" fontSize="xs" color="gray.500">
        <Text>
          {sweptSegments > 0
            ? `${sweptSegments.toLocaleString()} blocks swept today`
            : 'No sweep data yet'}
        </Text>
        <Text>
          {lastPollTime ? `Updated ${timeAgo(lastPollTime)}` : 'Loading...'}
        </Text>
      </HStack>
      {totalSegments > 0 && (
        <Text fontSize="xs" color="gray.400">
          {totalSegments.toLocaleString()} blocks loaded in view
        </Text>
      )}
    </Box>
  );
}
