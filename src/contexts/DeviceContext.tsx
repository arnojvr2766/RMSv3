import React, { createContext, useContext, ReactNode } from 'react';
import { useDeviceDetection, type DeviceInfo } from '../hooks/useDeviceDetection';

interface DeviceContextType {
  deviceInfo: DeviceInfo;
  isMobile: boolean;
  width: number;
  height: number;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const deviceInfo = useDeviceDetection();

  const value: DeviceContextType = {
    deviceInfo,
    isMobile: deviceInfo.isMobile,
    width: deviceInfo.width,
    height: deviceInfo.height,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

