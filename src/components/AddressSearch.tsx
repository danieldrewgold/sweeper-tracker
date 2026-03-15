import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  List,
  ListItem,
  Text,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { geocodeSearch, reverseGeocode, type NominatimResult } from '../services/geocoder';
import { useSweepStore } from '../store';

/** Simple crosshair/GPS icon */
function LocationIcon() {
  return (
    <Icon viewBox="0 0 24 24" boxSize="18px">
      <path
        fill="currentColor"
        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
      />
    </Icon>
  );
}

interface Props {
  onSelect: (result: NominatimResult, originalQuery?: string) => void;
}

const HAS_GEOLOCATION = typeof navigator !== 'undefined' && 'geolocation' in navigator;

/** Get the best neighborhood name from a Nominatim result.
 *  Prefer neighbourhood/quarter (specific) over suburb (often just "Queens"/"Brooklyn"). */
function getNeighborhood(r: NominatimResult): string {
  const addr = r.address;
  if (!addr) return '';
  // Nominatim uses "neighbourhood" for small areas, "quarter" for mid-size (Elmhurst, etc.)
  // "suburb" is often the borough name in NYC (Queens, Brooklyn) — not useful
  return (addr as Record<string, string | undefined>).quarter
    || addr.neighbourhood
    || addr.suburb
    || '';
}

/** Check if a search query contains a leading house number */
function queryHasHouseNumber(q: string): boolean {
  return /^\d+[-\d]*\s+\S/.test(q.trim());
}

/** De-duplicate Nominatim results — when multiple results share the same road name,
 *  keep only unique neighbourhoods so the user can distinguish them. */
function deduplicateResults(results: NominatimResult[]): NominatimResult[] {
  const seen = new Map<string, Set<string>>();
  const deduped: NominatimResult[] = [];

  for (const r of results) {
    const road = (r.address?.road ?? r.display_name.split(',')[0]).toUpperCase().trim();
    const hood = getNeighborhood(r).toUpperCase().trim();
    const key = road;

    if (!seen.has(key)) {
      seen.set(key, new Set());
    }
    const hoods = seen.get(key)!;
    if (!hoods.has(hood)) {
      hoods.add(hood);
      deduped.push(r);
    }
  }
  return deduped;
}

export default function AddressSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const userAddress = useSweepStore((s) => s.userAddress);

  // Sync input with store (set on map click, clear on logo reset)
  useEffect(() => {
    setQuery(userAddress ?? '');
  }, [userAddress]);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLocating, setIsLocating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const raw = await geocodeSearch(q);
        const deduped = deduplicateResults(raw);

        // If user typed a specific address (with house number) and all results
        // are for the same street, auto-select the first one — the address resolver
        // will find the correct CSCL segment using the house number.
        if (queryHasHouseNumber(q) && deduped.length >= 1) {
          const roads = new Set(deduped.map(r =>
            (r.address?.road ?? '').toUpperCase().replace(/\s+/g, ' ').trim()
          ));
          if (roads.size === 1) {
            // All results are the same street — auto-resolve
            setResults([]);
            setShowResults(false);
            handleSelect(deduped[0], q);
            return;
          }
        }

        setResults(deduped);
        setShowResults(true);
      } catch (err) {
        console.error('Geocode failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 600);
  };

  const handleSelect = (result: NominatimResult, currentQuery?: string) => {
    const houseNum = result.address?.house_number ?? '';
    const road = result.address?.road ?? result.display_name.split(',')[0];
    const area = getNeighborhood(result);
    const prefix = houseNum ? `${houseNum} ` : '';
    setQuery(area ? `${prefix}${road}, ${area}` : `${prefix}${road}`);
    setShowResults(false);
    setResults([]);
    setHighlightedIndex(-1);
    onSelect(result, currentQuery ?? query);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setShowResults(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleLocate = async () => {
    if (!HAS_GEOLOCATION) return;
    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = position.coords;
      const result = await reverseGeocode(latitude, longitude);
      if (result) {
        handleSelect(result);
      }
    } catch {
      // Permission denied or timeout — silently fail
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <HStack spacing={2}>
      <Box position="relative" flex={1}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            {isSearching ? <Spinner size="sm" color="orange.500" /> : <SearchIcon color="gray.400" />}
          </InputLeftElement>
          <Input
            placeholder="Enter an NYC address..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            bg="white"
            borderColor="gray.300"
            _focus={{ borderColor: 'orange.400', boxShadow: '0 0 0 1px var(--chakra-colors-orange-400)' }}
          />
          {query && (
            <InputRightElement>
              <IconButton
                aria-label="Clear"
                icon={<CloseIcon />}
                size="xs"
                variant="ghost"
                onClick={handleClear}
              />
            </InputRightElement>
          )}
        </InputGroup>

        {showResults && results.length > 0 && (
          <List
            ref={listRef}
            position="absolute"
            top="100%"
            left={0}
            right={0}
            bg="white"
            boxShadow="lg"
            borderRadius="md"
            mt={1}
            zIndex={2000}
            maxH="260px"
            overflowY="auto"
            role="listbox"
          >
            {results.map((r, index) => {
              // Build a cleaner display: street, neighbourhood
              const road = r.address?.road ?? r.display_name.split(',')[0];
              const houseNum = r.address?.house_number;
              const hood = getNeighborhood(r);
              const prefix = houseNum ? `${houseNum} ` : '';
              const mainText = `${prefix}${road}`;
              // Show neighbourhood + zip for context
              const subParts = [hood, r.address?.postcode].filter(Boolean);
              const subText = subParts.join(' \u00B7 '); // middle dot separator

              return (
                <ListItem
                  key={r.place_id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  bg={index === highlightedIndex ? 'orange.50' : undefined}
                  _hover={{ bg: 'orange.50' }}
                  onClick={() => handleSelect(r)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  borderBottom="1px"
                  borderColor="gray.100"
                >
                  <Text fontSize="sm" fontWeight="500" lineHeight="1.4" noOfLines={2}>
                    {mainText}
                  </Text>
                  {subText && (
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                      {subText}
                    </Text>
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {HAS_GEOLOCATION && (
        <IconButton
          aria-label="Use my location"
          icon={isLocating ? <Spinner size="sm" /> : <LocationIcon />}
          size="md"
          variant="outline"
          borderColor="gray.300"
          color="gray.500"
          _hover={{ color: 'orange.500', borderColor: 'orange.400' }}
          onClick={handleLocate}
          isDisabled={isLocating}
          title="Use my location"
          flexShrink={0}
        />
      )}
    </HStack>
  );
}
