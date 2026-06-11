import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
  error: string | null;
  loading: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true, // Start as true so consumers know location fetch is in progress
  });

  const requestPermissionAndFetch = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({
          coords: null,
          error: 'Permission to access location was denied',
          loading: false,
        });
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Use High accuracy for better geofence precision
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      setState({
        coords,
        error: null,
        loading: false,
      });

      return coords;
    } catch (err: any) {
      console.error('Error fetching location:', err);
      const errMsg = err?.message || 'Failed to acquire location coordinates';
      setState({
        coords: null,
        error: errMsg,
        loading: false,
      });
      return null;
    }
  };

  // Auto-fetch location on mount
  useEffect(() => {
    requestPermissionAndFetch();
  }, []);

  return {
    ...state,
    getCurrentLocation: requestPermissionAndFetch,
  };
}
