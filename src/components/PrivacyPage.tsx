import { Container, Heading, Text, VStack, UnorderedList, ListItem, Link } from '@chakra-ui/react';

export default function PrivacyPage() {
  return (
    <Container maxW="2xl" py={8}>
      <VStack align="stretch" spacing={4} color="gray.700" fontSize="sm">
        <Heading size="lg" color="gray.800">
          Privacy
        </Heading>
        <Text>
          SweepTracker keeps a small amount of anonymous usage data so we can see what's working and
          which neighborhoods people use it in.
        </Text>

        <Heading size="sm" color="gray.800" pt={2}>
          What we log
        </Heading>
        <UnorderedList spacing={1} pl={2}>
          <ListItem>
            A cookie with a random ID, so we can tell new visitors from returning ones. It isn't tied to
            your name or any account.
          </ListItem>
          <ListItem>
            Which blocks get looked up, and how far that is from the block's next street cleaning. We
            log the block, never your exact location.
          </ListItem>
          <ListItem>
            Which features you use, like turning on alerts or opening directions, and searches that
            come up empty (not what you typed).
          </ListItem>
          <ListItem>
            The website or tagged link that sent you here, if any (just the site name or tag, not the
            page).
          </ListItem>
          <ListItem>
            Whether you're on a phone, tablet, or computer, whether it's an iPhone or Android, and
            whether you opened SweepTracker from your home screen.
          </ListItem>
        </UnorderedList>

        <Heading size="sm" color="gray.800" pt={2}>
          What we don't log
        </Heading>
        <Text>
          Your name, your IP address, the address you type in, or your precise location.
        </Text>

        <Heading size="sm" color="gray.800" pt={2}>
          What happens to it
        </Heading>
        <Text>
          We use it to improve SweepTracker. We never sell your individual data. We may share or publish
          aggregate statistics, like which neighborhoods check the map most, that can't be traced back
          to anyone. Raw logs are deleted after 12 months.
        </Text>
        <Text>
          We also use{' '}
          <Link href="https://vercel.com/docs/analytics/privacy-policy" isExternal color="orange.500">
            Vercel Web Analytics
          </Link>
          , which counts page views without cookies.
        </Text>

        <Heading size="sm" color="gray.800" pt={2}>
          Opting out
        </Heading>
        <Text>
          If your browser sends a Global Privacy Control signal, we don't log anything.
        </Text>
      </VStack>
    </Container>
  );
}
