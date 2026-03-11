import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
import { useSweepStore } from '../store';
import type { ParsedSchedule } from '../types/asp';

const SIDE_LABELS: Record<string, string> = { N: 'North Side', S: 'South Side', E: 'East Side', W: 'West Side' };

function SideGroup({ side, schedules, today }: { side: string; schedules: ParsedSchedule[]; today: string }) {
  return (
    <Box>
      <Text fontSize="2xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
        {SIDE_LABELS[side] ?? side}
      </Text>
      <VStack align="stretch" spacing={1}>
        {schedules.map((s, i) => {
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
              {isToday && (
                <Badge colorScheme="green" fontSize="xs">
                  Today
                </Badge>
              )}
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
}

export default function AspScheduleCard() {
  const aspSchedules = useSweepStore((s) => s.aspSchedules);

  if (aspSchedules.length === 0) return null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  // Group schedules by side
  const bySide = new Map<string, ParsedSchedule[]>();
  for (const s of aspSchedules) {
    const key = s.side || '?';
    const arr = bySide.get(key) ?? [];
    arr.push(s);
    bySide.set(key, arr);
  }
  const sides = [...bySide.entries()];

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" overflow="hidden">
      <Box bg="gray.50" px={4} py={2} borderBottom="1px" borderColor="gray.100">
        <Text fontSize="sm" fontWeight="bold" color="gray.700">
          ASP SCHEDULE
        </Text>
      </Box>

      <VStack align="stretch" spacing={3} p={3}>
        {sides.map(([side, schedules]) => (
          <SideGroup key={side} side={side} schedules={schedules} today={today} />
        ))}
      </VStack>
    </Box>
  );
}
