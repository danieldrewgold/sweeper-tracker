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
        const res = await geocodeSearch(q);
        setResults(res);
        setShowResults(true);
      } catch (err) {
        console.error('Geocode failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 600);
  };

  const handleSelect = (result: NominatimResult) => {
    const houseNum = result.address?.house_number ?? '';
    const road = result.address?.road ?? result.display_name.split(',')[0];
    const area = result.address?.suburb || result.address?.neighbourhood || '';
    const prefix = houseNum ? `${houseNum} ` : '';
    setQuery(area ? `${prefix}${road}, ${area}` : `${prefix}${road}`);
    setShowResults(false);
    setResults([]);
    setHighlightedIndex(-1);
    onSelect(result, query);
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
            maxH="200px"
            overflowY="auto"
            role="listbox"
          >
            {results.map((r, index) => (
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
              >
                <Text fontSize="sm" noOfLines={1}>
                  {r.display_name}
                </Text>
              </ListItem>
            ))}
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
