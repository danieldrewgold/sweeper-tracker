import { useEffect, useState, useMemo } from 'react';
import { Box, Text, VStack, Badge, Divider, HStack, Icon, Collapse, IconButton, Button, Link } from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, WarningIcon, InfoOutlineIcon, BellIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useSweepStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { formatTime, formatMinutes, dateToMinutes } from '../utils/time';
import { getSegmentCenter, haversine } from '../utils/geo';
import { getInspectorQ75Sync, getPostSweepReturnSync, getDowTotalsSync } from '../services/sweepData';

/** Tappable info icon that toggles an explanation underneath */
function InfoTip({ detail }: { detail: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Icon
        as={InfoOutlineIcon}
        boxSize="12px"
        color={show ? 'blue.400' : 'gray.300'}
        cursor="pointer"
        ml={1}
        onClick={() => setShow(!show)}
        _hover={{ color: 'blue.400' }}
        verticalAlign="text-top"
      />
      <Collapse in={show} animateOpacity>
        <Text fontSize="2xs" color="gray.400" mt={1} lineHeight="short">
          {detail}
        </Text>
      </Collapse>
    </>
  );
}

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
  // Single shallow selector prevents multiple re-renders when several store properties change at once
  const {
    userPhysicalId, userAddress, sweepVisitTime, historicalPattern,
    eta, aspSchedules, isLoading, sweepReliability, inspectorTiming,
    postSweepReturn, doubleSweepInfo, alertsEnabled, setAlertsEnabled,
    realtimeSweepStatus, segments, userLatLng,
  } = useSweepStore(useShallow((s) => ({
    userPhysicalId: s.userPhysicalId,
    userAddress: s.userAddress,
    sweepVisitTime: s.sweepVisitTime,
    historicalPattern: s.historicalPattern,
    eta: s.eta,
    aspSchedules: s.aspSchedules,
    isLoading: s.isLoading,
    sweepReliability: s.sweepReliability,
    inspectorTiming: s.inspectorTiming,
    postSweepReturn: s.postSweepReturn,
    doubleSweepInfo: s.doubleSweepInfo,
    alertsEnabled: s.alertsEnabled,
    setAlertsEnabled: s.setAlertsEnabled,
    realtimeSweepStatus: s.realtimeSweepStatus,
    segments: s.segments,
    userLatLng: s.userLatLng,
  })));

  // Tick every minute to keep countdown fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Find nearest swept street where inspector is likely done, preferring most recently swept
  // Must be above the early return to satisfy Rules of Hooks
  const BORO_NAMES: Record<string, string> = { '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island' };
  const nearestSwept = useMemo(() => {
    if (!userPhysicalId || !userLatLng || realtimeSweepStatus.size === 0) return null;
    const now = Date.now();
    const nowMins = dateToMinutes(new Date());
    const FALLBACK_BUFFER_MS = 30 * 60 * 1000; // 30 min fallback if no inspector data

    // Collect all candidates that are swept AND inspector-cleared
    type Candidate = { center: [number, number]; name: string; dist: number; sweptAt: number; returnsAfter: boolean };
    const candidates: Candidate[] = [];

    for (const [pid, visitTime] of realtimeSweepStatus.entries()) {
      if (!visitTime || pid === userPhysicalId) continue;
      const seg = segments.get(pid);
      if (!seg) continue;

      // Check if inspector is likely done on this street
      const streetName = seg.full_street_name || seg.stname_label || '';
      const boro = BORO_NAMES[seg.boroughcode] ?? '';
      const inspQ75 = streetName && boro ? getInspectorQ75Sync(streetName, boro) : null;

      if (inspQ75 !== null) {
        // Use per-street inspector data: current time must be past the q75 window
        if (nowMins <= inspQ75) continue;
      } else {
        // No inspector data for this street — fall back to 30 min after sweep
        if (now - visitTime.getTime() < FALLBACK_BUFFER_MS) continue;
      }

      // Check if inspector tends to return after sweep on this street
      const afterRate = streetName && boro ? getPostSweepReturnSync(streetName, boro) : null;
      const returnsAfter = afterRate !== null && afterRate >= 20;

      const center = getSegmentCenter(seg);
      if (center[0] === 0 && center[1] === 0) continue;
      const dist = haversine(userLatLng, center);
      if (dist > 2000) continue; // skip if >2km away
      candidates.push({ center, name: streetName, dist, sweptAt: visitTime.getTime(), returnsAfter });
    }

    if (candidates.length === 0) return null;

    // Sort: safe streets first (no inspector return), then most recently swept, then nearest
    candidates.sort((a, b) =>
      (a.returnsAfter === b.returnsAfter ? 0 : a.returnsAfter ? 1 : -1)
      || (b.sweptAt - a.sweptAt)
      || (a.dist - b.dist)
    );
    const best = candidates[0];
    return { center: best.center, name: best.name, distMeters: Math.round(best.dist), returnsAfter: best.returnsAfter };
  }, [userLatLng, userPhysicalId, realtimeSweepStatus, segments]);

  if (!userPhysicalId) return null;

  // Use real-time visit time — check both single-block and batch scan for consistency
  const todayStr = new Date().toDateString();
  const singleBlockSwept = sweepVisitTime && sweepVisitTime.toDateString() === todayStr;
  const batchSweptTime = userPhysicalId ? realtimeSweepStatus.get(userPhysicalId) : undefined;
  const wasSwept = !!(singleBlockSwept || batchSweptTime);
  const lastSweepTime = sweepVisitTime ?? batchSweptTime ?? null;

  // Find today's ASP schedule — but only trust it if GPS confirms this day is active
  // (ASP API returns signs from both sides of the street)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const todayDowForGps = new Date().getDay() >= 1 ? new Date().getDay() - 1 : -1;
  const gpsConfirmsToday = !sweepReliability?.dowSkipRates || todayDowForGps < 0
    || (sweepReliability.dowSkipRates[todayDowForGps] >= 0);
  const todaySchedule = gpsConfirmsToday ? aspSchedules.find((s) => s.day === today) : undefined;

  // Real-time ETA from nearby frontier
  const isSweeperNearby = !wasSwept && eta && eta.estimatedMinutes !== null;

  // Historical countdown: time until expected sweep
  const todayDow = new Date().getDay();
  const isHistoricalToday = historicalPattern && historicalPattern.dayOfWeek === todayDow;
  const nowMinutes = dateToMinutes(new Date());
  const minutesUntilExpected =
    isHistoricalToday ? Math.round(historicalPattern.medianTimeMinutes - nowMinutes) : null;
  const showCountdown = !wasSwept && !isSweeperNearby && isHistoricalToday && minutesUntilExpected !== null;

  // "Safe to park" — swept today AND past ASP enforcement AND past inspector window
  const aspEndMinutes = todaySchedule?.endMinutes ?? null;
  const inspectorEndMinutes = inspectorTiming?.q75Minutes ?? null;
  const latestRisk = aspEndMinutes !== null && inspectorEndMinutes !== null
    ? Math.max(aspEndMinutes, inspectorEndMinutes)
    : aspEndMinutes ?? inspectorEndMinutes;
  const isSafeToPark = wasSwept && latestRisk !== null && nowMinutes > latestRisk;

  // Cross-reference ASP schedule days with GPS reliability data.
  // IMPORTANT: ASP API returns signs from BOTH sides of the street, but each
  // physical_id is one side. GPS data tells us which days the sweeper actually
  // visits THIS side. When GPS contradicts ASP, trust GPS.
  const DOW_MAP: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5 };
  const aspDays = new Set(aspSchedules.map((s) => DOW_MAP[s.day]).filter((d) => d !== undefined));

  // GPS-active days = days the sweeper has actually been detected on this segment
  const gpsActiveDays = sweepReliability?.dowSkipRates
    ? new Set(sweepReliability.dowSkipRates.reduce<number[]>((acc, rate, i) => {
        if (rate >= 0) acc.push(i); // sweeper has visited at least once
        return acc;
      }, []))
    : null;

  // Effective schedule: use GPS-active days when available (more accurate per-side),
  // fall back to ASP signs when no GPS data exists
  const effectiveDays = gpsActiveDays && gpsActiveDays.size > 0 ? gpsActiveDays : aspDays;

  // Skip rate: average DOW rates for GPS-active days only (accurate per-side).
  // Falls back to step1 rate when no DOW data.
  const displaySkipRate = (() => {
    if (!sweepReliability) return 0;
    if (!sweepReliability.dowSkipRates || !gpsActiveDays || gpsActiveDays.size === 0) {
      return Math.round(sweepReliability.skipRate);
    }
    const activeRates = [...gpsActiveDays]
      .map((d) => sweepReliability.dowSkipRates![d])
      .filter((r) => r >= 0);
    if (activeRates.length === 0) return Math.round(sweepReliability.skipRate);
    return Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length);
  })();

  // Today's DOW index (Mon=0 .. Sat=5, Sunday=-1)
  const todayDowIdx = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;

  // Classify today's sweep status for the "waiting" state
  const DAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isSunday = todayDow === 0;
  const todaySkipRate = todayDowIdx >= 0 && sweepReliability?.dowSkipRates
    ? sweepReliability.dowSkipRates[todayDowIdx] : -1;
  // Use GPS to determine if today is a real sweep day for this side
  const todayIsGpsActive = todayDowIdx >= 0 && effectiveDays.has(todayDowIdx);
  const sweepDayStatus: 'weekend' | 'no_asp' | 'asp_but_rare' | 'normal' =
    isSunday ? 'weekend'
    : !todayIsGpsActive && !todaySchedule ? 'no_asp'
    : !todayIsGpsActive && todaySchedule ? 'no_asp' // ASP says yes but GPS says no — not this side
    : todaySkipRate >= 95 ? 'asp_but_rare'
    : 'normal';

  // Find next scheduled sweep day — use effective (GPS-corrected) days
  const nextSweepDay = (() => {
    if (effectiveDays.size === 0) return null;
    for (let offset = 1; offset <= 7; offset++) {
      const d = (todayDow + offset) % 7;
      if (d === 0) continue; // skip Sunday
      const dowIdx = d - 1; // convert JS day (1=Mon) to DOW index (0=Mon)
      if (effectiveDays.has(dowIdx)) return DAY_FULL_NAMES[d];
    }
    return null;
  })();

  return (
    <Box bg="white" borderRadius="lg" boxShadow="md" overflow="hidden">
      {/* Header */}
      <HStack bg="green.50" px={4} py={3} borderBottom="1px" borderColor="green.100" justify="space-between" align="start">
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="green.800">
            YOUR BLOCK
          </Text>
          <Text fontSize="xs" color="gray.600" noOfLines={1}>
            {userAddress ?? 'Selected block'}
          </Text>
        </Box>
        <IconButton
          aria-label={alertsEnabled ? 'Disable sweep alerts' : 'Enable sweep alerts'}
          icon={<BellIcon />}
          size="sm"
          variant="ghost"
          color={alertsEnabled ? 'green.600' : 'gray.400'}
          onClick={async () => {
            if (!alertsEnabled) {
              if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
              }
              setAlertsEnabled(true);
            } else {
              setAlertsEnabled(false);
            }
          }}
          title={alertsEnabled ? 'Alerts on — tap to disable' : 'Get notified when your block is swept'}
        />
      </HStack>

      <VStack align="stretch" spacing={3} p={4}>
        {/* State 3: Done — swept */}
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

            {/* Safe to park */}
            {isSafeToPark && (
              <Box bg="green.50" px={3} py={2} borderRadius="md" borderLeft="3px solid" borderColor="green.400">
                <Text fontSize="sm" fontWeight="bold" color="green.700">
                  Safe to park — sweep and enforcement are done
                  <InfoTip detail="The sweeper has passed and the typical inspector enforcement window is over for today. Green streets on the map were also already swept — safe to park there too." />
                </Text>
              </Box>
            )}

            {/* ASP still active */}
            {!isSafeToPark && todaySchedule && (
              <HStack spacing={2} bg="orange.50" px={3} py={2} borderRadius="md">
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

        {/* State 1: Waiting */}
        {!wasSwept && !isSweeperNearby && (
          <>
            {sweepDayStatus === 'weekend' && (
              <HStack spacing={2}>
                <Icon as={InfoOutlineIcon} color="gray.400" boxSize={4} />
                <Text fontSize="sm" color="gray.600">No sweeping on Sundays</Text>
              </HStack>
            )}
            {sweepDayStatus === 'no_asp' && (
              <HStack spacing={2}>
                <Icon as={InfoOutlineIcon} color="gray.400" boxSize={4} />
                <Text fontSize="sm" color="gray.600">No ASP scheduled today</Text>
              </HStack>
            )}
            {sweepDayStatus === 'asp_but_rare' && (
              <HStack spacing={2}>
                <Icon as={WarningIcon} color="orange.400" boxSize={4} />
                <Text fontSize="sm" color="orange.700">
                  ASP is posted but sweeper rarely comes on {DAY_FULL_NAMES[todayDow]}s
                </Text>
              </HStack>
            )}
            {sweepDayStatus === 'normal' && (
              <HStack spacing={2}>
                <Icon as={TimeIcon} color="gray.400" boxSize={4} />
                <Text fontSize="sm" color="gray.600">Not yet swept today</Text>
              </HStack>
            )}

            {nextSweepDay && sweepDayStatus !== 'normal' && (
              <Text fontSize="xs" color="gray.500" ml={6}>
                Next scheduled: {nextSweepDay}
              </Text>
            )}

            {lastSweepTime && (
              <Text fontSize="xs" color="gray.500" ml={6}>
                Last swept {lastSweepTime.toLocaleDateString('en-US', { weekday: 'long' })}{' '}
                at {formatTime(lastSweepTime)}
              </Text>
            )}

            {/* Historical countdown — only on normal sweep days */}
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
              aspEndMinutes !== null && nowMinutes > aspEndMinutes + 30 ? (
                <Box bg="red.50" px={3} py={2} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" color="red.700">
                    Sweeper didn't come today
                  </Text>
                  <Text fontSize="xs" color="red.500">
                    ASP window ended at {formatMinutes(aspEndMinutes)} — no sweep detected
                  </Text>
                </Box>
              ) : (
                <Box bg="yellow.50" px={3} py={2} borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" color="yellow.700">
                    Sweeper expected any moment
                  </Text>
                  <Text fontSize="xs" color="yellow.600">
                    Usually arrives around {formatMinutes(historicalPattern.medianTimeMinutes)}
                  </Text>
                </Box>
              )
            )}
          </>
        )}

        {/* Find parking — nearest swept street (only during weekday sweep hours) */}
        {nearestSwept && !wasSwept && !isSunday && nowMinutes < 17 * 60 && (
          <Box bg="blue.50" px={3} py={2} borderRadius="md">
            <Text fontSize="xs" color="blue.700" mb={1}>
              <Text as="span" fontWeight="medium">{nearestSwept.name || 'Nearby street'}</Text>
              {' '}is swept & clear ({nearestSwept.distMeters < 1000 ? `${nearestSwept.distMeters}m away` : `${(nearestSwept.distMeters / 1000).toFixed(1)}km away`}) — safe to park
            </Text>
            {nearestSwept.returnsAfter && (
              <Text fontSize="2xs" color="orange.600" mb={1}>
                ⚠ Inspector sometimes returns after sweep on this street
              </Text>
            )}
            <HStack spacing={2}>
              <Button
                as={Link}
                href={`https://www.google.com/maps/dir/?api=1&destination=${nearestSwept.center[0]},${nearestSwept.center[1]}&travelmode=driving`}
                isExternal
                size="xs"
                colorScheme="blue"
                variant="outline"
                rightIcon={<ExternalLinkIcon />}
                _hover={{ textDecoration: 'none', bg: 'blue.100' }}
              >
                Google Maps
              </Button>
              <Button
                as={Link}
                href={`https://waze.com/ul?ll=${nearestSwept.center[0]},${nearestSwept.center[1]}&navigate=yes`}
                isExternal
                size="xs"
                colorScheme="blue"
                variant="outline"
                rightIcon={<ExternalLinkIcon />}
                _hover={{ textDecoration: 'none', bg: 'blue.100' }}
              >
                Waze
              </Button>
            </HStack>
          </Box>
        )}

        {/* Historical pattern */}
        {historicalPattern && (
          <>
            <Divider />
            <Box px={1}>
              <Text fontSize="xs" color="blue.700" fontWeight="medium">
                Usually swept around {historicalPattern.medianTimeFormatted} on{' '}
                {historicalPattern.dayName}s
                <InfoTip detail={`Based on ${historicalPattern.sampleCount} GPS-tracked sweeper passes on this block. The time shown is the median arrival, ±${historicalPattern.rangeMinutes} min covers the typical range.`} />
              </Text>
              <Text fontSize="xs" color="gray.500">
                Based on {historicalPattern.sampleCount} observation{historicalPattern.sampleCount !== 1 ? 's' : ''} (
                ±{historicalPattern.rangeMinutes} min)
              </Text>
            </Box>
          </>
        )}

        {/* Sweep reliability */}
        {sweepReliability && (
          <>
            <Divider />
            <Box px={1}>
              <HStack spacing={2} mb={1} flexWrap="wrap">
                <Badge
                  colorScheme={displaySkipRate <= 10 ? 'green' : displaySkipRate <= 50 ? 'yellow' : 'red'}
                  fontSize="xs"
                >
                  {displaySkipRate <= 10 ? 'Reliable route' : displaySkipRate <= 50 ? 'Sometimes skipped' : 'Often skipped'}
                </Badge>
                <Text fontSize="xs" color="gray.500">
                  ~{Math.round(100 - displaySkipRate)}% of scheduled days
                  <InfoTip detail={`Based on NYC sweeper GPS data (Jun 2025–Jan 2026). Shows what % of scheduled sweep days the sweeper actually showed up on this block.`} />
                </Text>
              </HStack>
              {sweepReliability.totalTickets > 0 && displaySkipRate > 30 && (
                <Text fontSize="xs" color="red.600" mb={1}>
                  {sweepReliability.totalTickets.toLocaleString()} tickets issued on this block last year
                </Text>
              )}
              {sweepReliability.dowSkipRates && (() => {
                const dowTotals = getDowTotalsSync();
                return (
                  <HStack spacing={1} mt={1}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                      const rate = sweepReliability.dowSkipRates![i];
                      const hasGpsData = rate >= 0;
                      // Only show days the sweeper has actually visited (GPS-confirmed)
                      if (!hasGpsData) return null;
                      const sweepPct = 100 - rate;
                      const isCurrentDay = i === todayDowIdx;
                      const color = sweepPct >= 80 ? 'green' : sweepPct >= 40 ? 'yellow' : 'red';
                      // Compute visit counts: "came X of Y days"
                      const totalForDay = dowTotals ? dowTotals[i] : null;
                      const sweptCount = totalForDay ? Math.round(totalForDay * sweepPct / 100) : 0;
                      return (
                        <Box
                          key={day}
                          textAlign="center"
                          flex={1}
                          borderRadius="md"
                          border={isCurrentDay ? '2px solid' : 'none'}
                          borderColor={isCurrentDay ? 'blue.300' : 'transparent'}
                          py={isCurrentDay ? '1px' : '3px'}
                        >
                          <Text fontSize="2xs" color={isCurrentDay ? 'blue.600' : 'gray.500'} fontWeight={isCurrentDay ? 'bold' : 'normal'}>
                            {day}
                          </Text>
                          <Badge colorScheme={color} fontSize="2xs" w="full" textAlign="center">
                            {`${sweepPct}%`}
                          </Badge>
                          {totalForDay && (
                            <Text fontSize="2xs" color="gray.400" lineHeight="1.2" mt="1px">
                              {sweptCount}/{totalForDay}
                            </Text>
                          )}
                        </Box>
                      );
                    })}
                  </HStack>
                );
              })()}
            </Box>
          </>
        )}

        {/* Ticketing — inspector timing + post-sweep return combined */}
        {(inspectorTiming || postSweepReturn) && (
          <>
            <Divider />
            <Box px={1}>
              <Text fontSize="2xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
                Ticketing
              </Text>
              {inspectorTiming && (
                <Text fontSize="xs" color="gray.700">
                  Inspector typically arrives{' '}
                  <Text as="span" fontWeight="medium">
                    {formatMinutes(inspectorTiming.q25Minutes)} – {formatMinutes(inspectorTiming.q75Minutes)}
                  </Text>
                  <Text as="span" color="gray.400"> ({inspectorTiming.sampleCount} obs)</Text>
                  <InfoTip detail={`Based on ${inspectorTiming.sampleCount.toLocaleString()} parking ticket timestamps on this street. The range shown covers when 50% of tickets are written (25th–75th percentile).`} />
                </Text>
              )}
              {postSweepReturn && (
                <Text
                  fontSize="xs"
                  color={postSweepReturn.afterRate < 20 ? 'green.600' : 'orange.600'}
                  mt={inspectorTiming ? 1 : 0}
                >
                  {postSweepReturn.afterRate < 20
                    ? 'Inspector typically does not return after sweep'
                    : 'Inspector may return after the sweeper passes'}
                  <InfoTip detail={`On ${Math.round(postSweepReturn.afterRate)}% of ${postSweepReturn.ticketDays.toLocaleString()} ticketing days on this street, tickets were issued after the sweeper had already passed.`} />
                </Text>
              )}
            </Box>
          </>
        )}

        {/* Double-sweep flag */}
        {doubleSweepInfo && (
          <Box px={1}>
            <Text fontSize="xs" color="blue.600">
              This block is sometimes swept twice ({doubleSweepInfo.doubleDays} time{doubleSweepInfo.doubleDays !== 1 ? 's' : ''} last year)
              <InfoTip detail={`GPS data shows the sweeper passed this block twice on ${doubleSweepInfo.doubleDays} separate days in the past year. This can happen when routes overlap or the sweeper doubles back.`} />
            </Text>
          </Box>
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

        {/* Disclaimer */}
        <Divider />
        <Text fontSize="2xs" color="gray.400" fontStyle="italic">
          Data is based on historical GPS tracking and may not reflect real-time conditions. Not affiliated with NYC or DSNY.
        </Text>
      </VStack>
    </Box>
  );
}
