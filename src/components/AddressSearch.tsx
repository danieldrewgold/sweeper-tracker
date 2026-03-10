import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  List,
  ListItem,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { geocodeSearch, type NominatimResult } from '../services/geocoder';
import { useSweepStore } from '../store';

interface Props {
  onSelect: (result: NominatimResult) => void;
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Show street + neighborhood (e.g., "West 79th Street, Upper West Side")
    const road = result.address?.road ?? result.display_name.split(',')[0];
    const area = result.address?.suburb || result.address?.neighbourhood || '';
    setQuery(area ? `${road}, ${area}` : road);
    setShowResults(false);
    setResults([]);
    onSelect(result);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <Box position="relative">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          {isSearching ? <Spinner size="sm" color="orange.500" /> : <SearchIcon color="gray.400" />}
        </InputLeftElement>
        <Input
          placeholder="Enter an NYC address..."
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
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
        >
          {results.map((r) => (
            <ListItem
              key={r.place_id}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: 'orange.50' }}
              onClick={() => handleSelect(r)}
            >
              <Text fontSize="sm" noOfLines={1}>
                {r.display_name}
              </Text>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
