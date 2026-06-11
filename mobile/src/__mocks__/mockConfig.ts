/**
 * Mock Configuration
 * 
 * Enable/disable mock data for testing
 * Set USE_MOCK_DATA = true to use mock data instead of real API calls
 */

export const USE_MOCK_DATA = false; // Set to true to use mock data, false to use real Supabase data

export const MOCK_DELAY_MS = 300; // Simulate network delay

/**
 * Simulate async delay for mock API calls
 */
export const mockDelay = () => new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
