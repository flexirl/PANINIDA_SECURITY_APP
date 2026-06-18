// Import polyfills FIRST before anything else
import './src/polyfills';

import { registerRootComponent } from 'expo';
import App from './App';

// NOTE: Background location task registration has been moved OUT of here.
// It is now registered only for guard/workforce_personnel users inside
// the auth flow (see GuardAttendanceScreen or PersonnelDashboardScreen).
// This prevents unnecessary battery drain for admin/client/supervisor users.

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
