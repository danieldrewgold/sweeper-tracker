import { useEffect } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import './App.css';
import Header from './components/Header';
import MapView from './components/MapView';
import DataFactsPage from './components/DataFactsPage';
import PrivacyPage from './components/PrivacyPage';
import { useRoute } from './hooks/useRoute';
import { trackVisit } from './services/analytics';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function AppContent() {
  const [route] = useRoute();

  useEffect(() => {
    void trackVisit();
  }, []);

  if (route === 'map') {
    return (
      <Flex h="100%" direction="column">
        <Header />
        <MapView />
      </Flex>
    );
  }

  return (
    <Flex h="100%" direction="column">
      <Header />
      <Box flex={1} overflowY="auto">
        {route === 'data' ? <DataFactsPage /> : <PrivacyPage />}
      </Box>
    </Flex>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
