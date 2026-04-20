import { useState, useEffect, useCallback } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  width: number;
  height: number;
}

const MOBILE_BREAKPOINT = 480;

/**
 * Hook to detect if device is mobile (<480px width)
 * Uses debounced resize listener for performance
 */
export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window !== 'undefined') {
      return {
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { isMobile: false, width: 1024, height: 768 };
  });

  const updateDeviceInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      setDeviceInfo({
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Debounce resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDeviceInfo, 150);
    };

    // Initial check
    updateDeviceInfo();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateDeviceInfo]);

  return deviceInfo;
};

