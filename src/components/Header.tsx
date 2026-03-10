import { Box, Heading, Text, HStack, Link, Icon } from '@chakra-ui/react';
import { useSweepStore } from '../store';

function BroomIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon viewBox="0 0 24 24" {...props}>
      {/* Angled broom - handle goes top-right to center, bristles sweep bottom-left */}
      {/* Handle */}
      <line x1="20" y1="2" x2="10" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Bristle collar */}
      <ellipse cx="9" cy="13" rx="4" ry="2" fill="currentColor" transform="rotate(-45 9 13)"/>
      {/* Bristles - fanning out */}
      <line x1="9" y1="13" x2="2" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      <line x1="9" y1="13" x2="4" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1="9" y1="13" x2="7" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <line x1="9" y1="13" x2="1" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="9" y1="13" x2="10" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </Icon>
  );
}

export default function Header() {
  const clearUserBlock = useSweepStore((s) => s.clearUserBlock);

  const handleLogoClick = () => {
    clearUserBlock();
    // Remove address param from URL
    const url = new URL(window.location.href);
    if (url.searchParams.has('address')) {
      url.searchParams.delete('address');
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <Box bg="gray.800" color="white" px={4} py={3}>
      <HStack justify="space-between" align="center">
        <HStack spacing={2} cursor="pointer" onClick={handleLogoClick} _hover={{ opacity: 0.8 }}>
          <BroomIcon boxSize={6} color="orange.300" />
          <Heading size="md" fontWeight="bold" letterSpacing="-0.5px" color="orange.300">
            sweep
          </Heading>
          <Heading size="md" fontWeight="900" letterSpacing="-0.5px">
            TRACKER
          </Heading>
        </HStack>
        <HStack spacing={3}>
          <Link
            href="https://buymeacoffee.com/danielgold"
            isExternal
            color="gray.400"
            border="1px"
            borderColor="gray.600"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="medium"
            _hover={{ color: 'orange.300', borderColor: 'orange.300', textDecoration: 'none' }}
          >
            Buy me a coffee
          </Link>
          <Text fontSize="xs" opacity={0.7} display={{ base: 'none', md: 'block' }}>
            NYC Street Sweeper ETA
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}
