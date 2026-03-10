import { Box, Heading, Text, HStack, Link, Icon } from '@chakra-ui/react';

function BroomIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon viewBox="0 0 24 24" {...props}>
      {/* Handle */}
      <rect x="10.5" y="1" width="3" height="13" rx="1.5" fill="currentColor" opacity="0.9"/>
      {/* Bristle base */}
      <rect x="6" y="13" width="12" height="3" rx="1" fill="currentColor"/>
      {/* Bristles */}
      <rect x="7" y="16" width="2" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="11" y="16" width="2" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="15" y="16" width="2" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="9" y="16" width="2" height="6" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="13" y="16" width="2" height="6" rx="1" fill="currentColor" opacity="0.5"/>
    </Icon>
  );
}

export default function Header() {
  return (
    <Box bg="green.600" color="white" px={4} py={3}>
      <HStack justify="space-between" align="center">
        <HStack spacing={2}>
          <BroomIcon boxSize={6} color="yellow.300" />
          <Heading size="md" fontWeight="bold" letterSpacing="-0.5px">
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
            bg="yellow.400"
            color="gray.800"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            _hover={{ bg: 'yellow.300', textDecoration: 'none' }}
          >
            Buy me a coffee
          </Link>
          <Text fontSize="xs" opacity={0.8} display={{ base: 'none', md: 'block' }}>
            NYC Street Sweeper ETA
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}
