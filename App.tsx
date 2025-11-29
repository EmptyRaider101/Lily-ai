/**
 * Lily AI - React Native App
 * @format
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CactusConfig } from 'cactus-react-native';
import { StatusBar, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

import { AlertProvider } from './src/context/AlertContext';

// Enable Telemetry
CactusConfig.telemetryToken = 'ff5d1354-20aa-4471-93df-05383100dcb0';
// CactusConfig.isTelemetryEnabled = false; // Uncomment to disable

function App() {
  useEffect(() => {
    // Enable edge-to-edge mode
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <AppNavigator />
      </AlertProvider>
    </SafeAreaProvider>
  );
}

export default App;
