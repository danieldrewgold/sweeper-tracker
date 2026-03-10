import { Box, Heading, Text, HStack, Link, Icon } from '@chakra-ui/react';

function BroomIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon viewBox="0 0 24 24" {...props}>
      <path
        d="M6 2 L4 14 L2 20 C1.5 21.5 2 22.5 3 22.5 L5 22.5 C5.5 22.5 6 22 6.2 21.5 L7 18 L8 14 Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M4 14 L3 19 C2.8 19.8 3 20.5 3 21 L4.5 21 L5.5 18 L6.5 14 Z"
        fill="currentColor"
        opacity="0.5"
      />
      <line x1="7" y1="2" x2="5" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="14" x2="2.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="14" x2="4" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="14" x2="5.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="14" x2="6.5" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="5" y1="14" x2="1.5" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
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
