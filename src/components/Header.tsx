import { Box, Heading, Text, HStack, Link } from '@chakra-ui/react';

export default function Header() {
  return (
    <Box bg="green.600" color="white" px={4} py={3}>
      <HStack justify="space-between" align="center">
        <HStack spacing={2}>
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
