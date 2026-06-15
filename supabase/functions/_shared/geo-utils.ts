// Geo Utilities for Edge Functions
// Haversine distance calculation and geo-fence validation

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a GPS coordinate is within a geo-fence radius of a site.
 */
export function isWithinGeofence(
  guardLat: number,
  guardLon: number,
  siteLat: number,
  siteLon: number,
  radiusMeters: number
): { withinFence: boolean; distanceMeters: number } {
  const distance = calculateDistance(guardLat, guardLon, siteLat, siteLon);
  return {
    withinFence: distance <= radiusMeters,
    distanceMeters: Math.round(distance),
  };
}

/**
 * Validate GPS coordinates are reasonable values.
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
}

/**
 * Check if current time is within a shift window (with tolerance).
 * @param shiftStart - Shift start time as "HH:MM" string
 * @param shiftEnd - Shift end time as "HH:MM" string
 * @param toleranceMinutes - Allowed tolerance in minutes for early check-in (default 30)
 * @param lateThresholdMinutes - Minutes after shift start before marked "late" (default 120 = 2 hours)
 */
export function isWithinShiftTiming(
  shiftStart: string,
  shiftEnd: string,
  toleranceMinutes: number = 30,
  lateThresholdMinutes: number = 120
): { withinShift: boolean; isLate: boolean; minutesOff: number } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = shiftStart.split(":").map(Number);
  const [endH, endM] = shiftEnd.split(":").map(Number);

  const shiftStartMinutes = startH * 60 + startM;
  const shiftEndMinutes = endH * 60 + endM;

  const earlyWindow = shiftStartMinutes - toleranceMinutes;
  const lateWindow = shiftStartMinutes + lateThresholdMinutes;

  // Handle overnight shifts (e.g., 20:00 - 08:00)
  if (shiftEndMinutes < shiftStartMinutes) {
    // Night shift
    const withinShift =
      currentMinutes >= earlyWindow || currentMinutes <= shiftEndMinutes + toleranceMinutes;
    const isLate =
      currentMinutes > lateWindow && currentMinutes < shiftEndMinutes;
    const minutesOff = currentMinutes > shiftStartMinutes
      ? currentMinutes - shiftStartMinutes
      : 0;

    return { withinShift, isLate, minutesOff };
  }

  // Day shift
  const withinShift =
    currentMinutes >= earlyWindow && currentMinutes <= shiftEndMinutes + toleranceMinutes;
  const isLate = currentMinutes > lateWindow;
  const minutesOff = isLate ? currentMinutes - shiftStartMinutes : 0;

  return { withinShift, isLate, minutesOff };
}

/**
 * Calculate the final attendance status based on hours worked and whether check-in was late.
 * 
 * Status logic:
 *   - hours < minHoursHalfDay       → 'absent'
 *   - minHoursHalfDay ≤ hours < minHoursPresent → 'half_day'
 *   - hours ≥ minHoursPresent AND was late       → 'present_late'
 *   - hours ≥ minHoursPresent AND was on-time    → 'present'
 *
 * @param hoursWorked - Total hours worked (check_out - check_in)
 * @param wasLateCheckIn - Whether the check-in was marked as late
 * @param minHoursPresent - Minimum hours for 'present' status (default 7)
 * @param minHoursHalfDay - Minimum hours for 'half_day' status (default 4)
 */
export function calculateAttendanceStatus(
  hoursWorked: number,
  wasLateCheckIn: boolean,
  minHoursPresent: number = 7,
  minHoursHalfDay: number = 4
): 'present' | 'present_late' | 'half_day' | 'absent' {
  if (hoursWorked < minHoursHalfDay) {
    return 'absent';
  }
  if (hoursWorked < minHoursPresent) {
    return 'half_day';
  }
  // Worked enough hours
  return wasLateCheckIn ? 'present_late' : 'present';
}

