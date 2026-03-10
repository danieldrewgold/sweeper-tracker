import { Box, HStack, Text } from '@chakra-ui/react';
import { COLORS } from '../utils/constants';
import { useSweepStore } from '../store';

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <HStack spacing={1}>
      <Box w="14px" h="4px" bg={color} borderRadius="2px" />
      <Text fontSize="xs" color="gray.700">
        {label}
      </Text>
    </HStack>
  );
}

export default function MapLegend() {
  const sweepActive = useSweepStore((s) => s.sweepActive);

  return (
    <Box
      position="absolute"
      bottom="20px"
      right="10px"
      zIndex={1000}
      bg="whiteAlpha.900"
      backdropFilter="blur(4px)"
      borderRadius="md"
      px={3}
      py={2}
      boxShadow="md"
    >
      {sweepActive && (
        <>
          <LegendItem color={COLORS.swept} label="Swept today" />
          <LegendItem color={COLORS.frontier} label="Just swept" />
          <LegendItem color={COLORS.notYet} label="Not yet swept" />
        </>
      )}
      <LegendItem color={COLORS.userBlock} label="Your block" />
      {!sweepActive && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Live tracking resumes during sweep hours
        </Text>
      )}
    </Box>
  );
}
