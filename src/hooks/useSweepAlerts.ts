import { useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSweepStore } from '../store';
import { formatTime } from '../utils/time';

/**
 * Watches the user's block sweep status and fires notifications
 * when the block transitions from not-swept to swept.
 */
export function useSweepAlerts() {
  const toast = useToast();
  const alertsEnabled = useSweepStore((s) => s.alertsEnabled);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const userAddress = useSweepStore((s) => s.userAddress);
  const realtimeSweepStatus = useSweepStore((s) => s.realtimeSweepStatus);
  const sweepVisitTime = useSweepStore((s) => s.sweepVisitTime);

  // Track previous swept state to detect transitions
  const wasSweptRef = useRef(false);

  useEffect(() => {
    if (!alertsEnabled || !userPhysicalId) {
      wasSweptRef.current = false;
      return;
    }

    const todayStr = new Date().toDateString();
    const singleBlockSwept = sweepVisitTime && sweepVisitTime.toDateString() === todayStr;
    const batchSweptTime = realtimeSweepStatus.get(userPhysicalId);
    const isSweptNow = !!(singleBlockSwept || batchSweptTime);

    // Detect transition: was NOT swept → IS swept
    if (isSweptNow && !wasSweptRef.current) {
      const sweepTime = sweepVisitTime ?? batchSweptTime;
      const timeStr = sweepTime ? formatTime(sweepTime) : 'just now';
      const blockName = userAddress ?? 'Your block';

      // In-app toast
      toast({
        id: 'sweep-alert',
        title: 'Your block was swept!',
        description: `${blockName} was swept at ${timeStr}`,
        status: 'success',
        duration: 8000,
        isClosable: true,
        position: 'top',
      });

      // Browser notification (for background tabs)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('SweepTracker', {
            body: `${blockName} was swept at ${timeStr}`,
            icon: '/favicon.svg',
          });
        } catch {
          // Notification constructor can throw in some contexts
        }
      }
    }

    wasSweptRef.current = isSweptNow;
  }, [alertsEnabled, userPhysicalId, realtimeSweepStatus, sweepVisitTime, userAddress, toast]);
}
