import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
import { useSweepStore } from '../store';

function sideLabel(side: string): string {
  const map: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' };
  return map[side] ?? side;
}

export default function AspScheduleCard() {
  const aspSchedules = useSweepStore((s) => s.aspSchedules);

  if (aspSchedules.length === 0) return null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" overflow="hidden">
      <Box bg="gray.50" px={4} py={2} borderBottom="1px" borderColor="gray.100">
        <Text fontSize="sm" fontWeight="bold" color="gray.700">
          ASP SCHEDULE
        </Text>
      </Box>

      <VStack align="stretch" spacing={2} p={3}>
        {aspSchedules.map((s, i) => {
          const isToday = s.day === today;
          return (
            <HStack
              key={i}
              justify="space-between"
              bg={isToday ? 'green.50' : 'transparent'}
              px={2}
              py={1}
              borderRadius="md"
            >
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight={isToday ? 'bold' : 'normal'} minW="90px">
                  {s.day.charAt(0) + s.day.slice(1).toLowerCase()}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {s.startTime}–{s.endTime}
                </Text>
              </HStack>
              <HStack spacing={1}>
                {s.side && (
                  <Badge size="sm" colorScheme="gray" fontSize="xs">
                    {sideLabel(s.side)}
                  </Badge>
                )}
                {isToday && (
                  <Badge colorScheme="green" fontSize="xs">
                    Today
                  </Badge>
                )}
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
}
