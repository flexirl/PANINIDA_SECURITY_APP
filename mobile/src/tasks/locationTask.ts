import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import { supabase } from '../api/supabase';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

/**
 * Background task definition.
 * This runs approximately every 4 hours when the app is backgrounded.
 * It checks if the user has an active (unchecked-out) attendance session
 * and logs their GPS coordinates to attendance_location_pings.
 *
 * Fix #5: Queries by check_out_time IS NULL without filtering by attendance_date,
 * so night shifts that cross midnight are correctly found.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async () => {
  try {
    // 1. Get current authenticated user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. Find the personnel_id for this user
    const { data: personnelData } = await supabase
      .from('workforce_personnel')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    const personnelId = personnelData?.id;
    if (!personnelId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Find any active (un-checked-out) attendance session
    //    FIX #5: Do NOT filter by attendance_date — night shifts cross midnight
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('workforce_attendance')
      .select('id, site_id')
      .eq('personnel_id', personnelId)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (attendanceError || !attendanceData) {
      // No active session — nothing to do
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 4. Get current GPS location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // 5. Insert ping into attendance_location_pings (includes site_id)
    const { error: insertError } = await supabase
      .from('attendance_location_pings')
      .insert({
        attendance_id: attendanceData.id,
        personnel_id: personnelId,
        site_id: attendanceData.site_id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

    if (insertError) {
      console.error('Failed to insert background location ping:', insertError.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    console.log('Background location ping recorded successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background location task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task.
 * FIX #3: This should only be called for guard/workforce_personnel users.
 * Call this from the auth flow, not from index.ts globally.
 */
export async function registerBackgroundLocationTask() {
  try {
    // Check if background location permission is granted
    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status !== 'granted') {
      // Request background permission if not granted
      const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
      if (newStatus !== 'granted') {
        console.warn('Background location permission not granted — skipping task registration');
        return;
      }
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(LOCATION_TASK_NAME, {
        minimumInterval: 60 * 60 * 4, // 4 hours
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background location task registered successfully');
    }
  } catch (err) {
    console.error('Failed to register background location task:', err);
  }
}

/**
 * Unregister the background task (e.g., on logout).
 */
export async function unregisterBackgroundLocationTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await TaskManager.unregisterTaskAsync(LOCATION_TASK_NAME);
      console.log('Background location task unregistered');
    }
  } catch (err) {
    console.error('Failed to unregister background location task:', err);
  }
}
