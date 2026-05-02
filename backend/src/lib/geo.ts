/**
 * Geolocation validation using the Haversine formula.
 * Restaurant coordinates are loaded from environment variables for easy editing.
 */

const RESTAURANT_LAT = parseFloat(process.env.RESTAURANT_LAT || "26.834906");
const RESTAURANT_LNG = parseFloat(process.env.RESTAURANT_LNG || "80.884822");
const MAX_DISTANCE_METERS = parseInt(process.env.MAX_GEO_DISTANCE || "100", 10);

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if given coordinates are within the allowed radius of the restaurant.
 */
export function isWithinRestaurant(lat: number, lng: number): { verified: boolean; distance: number } {
  const distance = haversineDistance(lat, lng, RESTAURANT_LAT, RESTAURANT_LNG);
  return {
    verified: distance <= MAX_DISTANCE_METERS,
    distance: Math.round(distance)
  };
}
