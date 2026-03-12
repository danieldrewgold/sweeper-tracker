import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Divider,
  Icon,
  Collapse,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon } from '@chakra-ui/icons';
import { HEADLINE_STATS, CASE_STUDIES, PRECINCT_DATA, META, type PrecinctRow } from '../data/dataFacts';
import { useRoute } from '../hooks/useRoute';

type SortField = 'precinct' | 'total' | 'noSweep' | 'noSweepRate';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return null;
  return sortDir === 'asc' ? (
    <TriangleUpIcon ml={1} boxSize={3} />
  ) : (
    <TriangleDownIcon ml={1} boxSize={3} />
  );
}

function rateColor(rate: number): string {
  if (rate >= 25) return 'red.600';
  if (rate >= 18) return 'orange.500';
  return 'green.600';
}

function rateBg(rate: number): string {
  if (rate >= 25) return 'red.50';
  if (rate >= 18) return 'orange.50';
  return 'green.50';
}

// Top 10 worst precincts by no-sweep rate (precomputed, stable set)
const TOP_10_WORST = new Set(
  [...PRECINCT_DATA].sort((a, b) => b.noSweepRate - a.noSweepRate).slice(0, 10).map((r) => r.precinct)
);

export default function DataFactsPage() {
  const [, navigate] = useRoute();
  const [sortField, setSortField] = useState<SortField>('noSweepRate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [precinctFilter, setPrecinctFilter] = useState('');

  useEffect(() => {
    document.title = 'Data & Facts | SweepTracker NYC';
    return () => { document.title = 'SweepTracker NYC — Street Sweeper ETA'; };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedPrecincts = useMemo(() => {
    let data = [...PRECINCT_DATA];
    if (precinctFilter.trim()) {
      const q = precinctFilter.trim();
      data = data.filter((r) => String(r.precinct).includes(q));
    }
    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return data;
  }, [sortField, sortDir, precinctFilter]);

  return (
    <Container maxW="4xl" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={{ base: 8, md: 12 }}>

        {/* ── Hero Section ── */}
        <VStack align="start" spacing={3}>
          <Heading size={{ base: 'xl', md: '2xl' }} color="gray.800" lineHeight="shorter">
            NYC Tickets Blocks That Were Never Swept
          </Heading>
          <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600" maxW="2xl">
            We cross-referenced 1M+ parking tickets against DSNY's own GPS records.
            Here's what we found.
          </Text>
          <Badge colorScheme="gray" fontSize="xs" px={2} py={1} borderRadius="md">
            Data: {META.dataRange}
          </Badge>
        </VStack>

        {/* ── Headline Stats ── */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 5 }}>
          {HEADLINE_STATS.map((stat) => (
            <Box
              key={stat.label}
              bg="white"
              borderRadius="xl"
              boxShadow="md"
              p={{ base: 4, md: 5 }}
              border="1px"
              borderColor="gray.100"
            >
              <Text
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="800"
                color={stat.color}
                lineHeight="1"
              >
                {stat.value}
              </Text>
              <Text fontSize="sm" fontWeight="600" color="gray.700" mt={2}>
                {stat.label}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1} lineHeight="short">
                {stat.detail}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* ── Methodology (collapsible) ── */}
        <Box
          bg="blue.50"
          border="1px"
          borderColor="blue.200"
          borderRadius="lg"
          overflow="hidden"
        >
          <HStack
            as="button"
            w="100%"
            justify="space-between"
            align="center"
            px={{ base: 4, md: 6 }}
            py={3}
            cursor="pointer"
            onClick={() => setMethodologyOpen(!methodologyOpen)}
            _hover={{ bg: 'blue.100' }}
            transition="background 0.15s"
          >
            <Text fontSize="sm" fontWeight="600" color="blue.800">
              Methodology
            </Text>
            {methodologyOpen ? (
              <ChevronUpIcon color="blue.600" boxSize={5} />
            ) : (
              <ChevronDownIcon color="blue.600" boxSize={5} />
            )}
          </HStack>
          <Collapse in={methodologyOpen} animateOpacity>
            <Box px={{ base: 4, md: 6 }} pb={4}>
              <Text fontSize="sm" color="blue.700" lineHeight="tall">
                {META.methodology}
              </Text>
              <Text fontSize="xs" color="blue.600" mt={2}>
                Source: {META.source}
              </Text>
            </Box>
          </Collapse>
        </Box>

        <Divider />

        {/* ── Case Studies ── */}
        <VStack align="stretch" spacing={5}>
          <Heading size="lg" color="gray.800">
            Case Studies
          </Heading>

          {CASE_STUDIES.map((cs) => (
            <Box
              key={cs.title}
              bg="white"
              borderRadius="xl"
              boxShadow="md"
              overflow="hidden"
              border="1px"
              borderColor="gray.100"
            >
              <Box bg="gray.800" px={{ base: 4, md: 6 }} py={3}>
                <HStack justify="space-between" align="center">
                  <Text fontWeight="bold" color="white" fontSize={{ base: 'sm', md: 'md' }}>
                    {cs.title}
                  </Text>
                  <Badge colorScheme="orange" fontSize="xs">{cs.borough}</Badge>
                </HStack>
              </Box>
              <Box px={{ base: 4, md: 6 }} py={4}>
                <Text fontSize="sm" color="gray.700" mb={4} lineHeight="tall">
                  {cs.description}
                </Text>
                <SimpleGrid columns={{ base: 1, sm: cs.stats.length }} spacing={3}>
                  {cs.stats.map((s) => (
                    <Box
                      key={s.label}
                      bg="gray.50"
                      borderRadius="md"
                      p={3}
                      textAlign="center"
                    >
                      <Text
                        fontSize={{ base: 'lg', md: 'xl' }}
                        fontWeight="bold"
                        color={s.color || 'gray.800'}
                      >
                        {s.value}
                      </Text>
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        {s.label}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                {cs.highlight && (
                  <Box
                    bg="orange.50"
                    border="1px"
                    borderColor="orange.200"
                    borderRadius="md"
                    px={4}
                    py={3}
                    mt={4}
                  >
                    <Text fontSize="sm" color="orange.800" fontWeight="500">
                      {cs.highlight}
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </VStack>

        <Divider />

        {/* ── Precinct Table ── */}
        <VStack align="stretch" spacing={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="gray.800">
              By Precinct
            </Heading>
            <Text fontSize="sm" color="gray.600">
              No-sweep rates for all {PRECINCT_DATA.length} precincts. Click a column to sort.
              Top 10 worst precincts are highlighted.
            </Text>
          </VStack>

          <InputGroup size="sm" maxW="260px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by precinct number"
              value={precinctFilter}
              onChange={(e) => setPrecinctFilter(e.target.value)}
              borderRadius="lg"
              bg="white"
            />
          </InputGroup>

          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            border="1px"
            borderColor="gray.100"
            overflowX="auto"
          >
            <Table size="sm" variant="simple">
              <Thead>
                <Tr bg="gray.50">
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('precinct')}
                    _hover={{ color: 'orange.500' }}
                    whiteSpace="nowrap"
                  >
                    Precinct
                    <SortIcon field="precinct" sortField={sortField} sortDir={sortDir} />
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('total')}
                    _hover={{ color: 'orange.500' }}
                    isNumeric
                    whiteSpace="nowrap"
                  >
                    Total Tickets
                    <SortIcon field="total" sortField={sortField} sortDir={sortDir} />
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('noSweep')}
                    _hover={{ color: 'orange.500' }}
                    isNumeric
                    whiteSpace="nowrap"
                  >
                    No Sweep
                    <SortIcon field="noSweep" sortField={sortField} sortDir={sortDir} />
                  </Th>
                  <Th
                    cursor="pointer"
                    onClick={() => handleSort('noSweepRate')}
                    _hover={{ color: 'orange.500' }}
                    isNumeric
                    whiteSpace="nowrap"
                  >
                    No-Sweep Rate
                    <SortIcon field="noSweepRate" sortField={sortField} sortDir={sortDir} />
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedPrecincts.map((row) => {
                  const isTop10 = TOP_10_WORST.has(row.precinct);
                  return (
                    <Tr
                      key={row.precinct}
                      bg={isTop10 ? 'red.50' : undefined}
                      _hover={{ bg: isTop10 ? 'red.100' : 'gray.50' }}
                    >
                      <Td fontWeight={isTop10 ? '800' : '600'} color={isTop10 ? 'red.700' : undefined}>
                        {row.precinct}
                      </Td>
                      <Td isNumeric fontWeight={isTop10 ? '600' : undefined}>{row.total.toLocaleString()}</Td>
                      <Td isNumeric fontWeight={isTop10 ? '600' : undefined}>{row.noSweep.toLocaleString()}</Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={row.noSweepRate >= 25 ? 'red' : row.noSweepRate >= 18 ? 'orange' : 'green'}
                          fontSize="xs"
                          px={2}
                          borderRadius="md"
                        >
                          {row.noSweepRate.toFixed(1)}%
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
                {sortedPrecincts.length === 0 && (
                  <Tr>
                    <Td colSpan={4} textAlign="center" color="gray.500" py={6}>
                      No precincts matching "{precinctFilter}"
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </VStack>

        <Divider />

        {/* ── CTA ── */}
        <VStack spacing={4} py={4}>
          <Heading size="md" color="gray.700" textAlign="center">
            Check your block
          </Heading>
          <Text fontSize="sm" color="gray.500" textAlign="center" maxW="lg">
            SweepTracker shows real-time sweeper locations, historical patterns,
            and helps you find safe parking after the sweep passes.
          </Text>
          <Button
            colorScheme="orange"
            size="lg"
            borderRadius="full"
            px={8}
            onClick={() => navigate('map')}
          >
            Open the Map
          </Button>
        </VStack>

        {/* ── Footer ── */}
        <Box textAlign="center" py={4}>
          <Text fontSize="xs" color="gray.400">
            Built by Daniel Gold. Data from NYC Open Data.
            All analysis is reproducible from public datasets.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
