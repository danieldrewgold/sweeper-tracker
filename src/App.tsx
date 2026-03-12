import { Flex, Box } from '@chakra-ui/react';
import './App.css';
import Header from './components/Header';
import MapView from './components/MapView';
import DataFactsPage from './components/DataFactsPage';
import { useRoute } from './hooks/useRoute';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function AppContent() {
  const [route] = useRoute();

  return (
    <Flex h="100%" direction="column">
      <Header />
      {route === 'data' ? (
        <Box flex={1} overflowY="auto">
          <DataFactsPage />
        </Box>
      ) : (
        <MapView />
      )}
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
