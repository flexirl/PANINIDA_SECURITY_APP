# Design Document: Detail Screens UI Modernization

## Overview

This design document specifies the technical approach for modernizing four primary detail screens in the Pan India Security mobile application: Guard Detail, Workforce Personnel Detail, Site Detail, and Candidate Detail. The modernization transforms these screens from their current implementation to a contemporary card-based UI with enhanced visual hierarchy, consistent typography, color-coded status indicators, and professional styling.

The modernization is a visual and structural refactor that preserves all existing functionality while applying modern React Native UI patterns. The design emphasizes:

- **Card-based architecture**: Logical information grouping with visual containers
- **Design system consistency**: Leveraging existing theme constants (Colors, Spacing, BorderRadius, Typography)
- **Enhanced accessibility**: Proper touch targets, contrast ratios, and semantic structure
- **Responsive layouts**: Adaptation to various screen sizes with SafeAreaInsets
- **Smooth animations**: Professional transitions using React Native Animated API
- **Maintainability**: Reusable component patterns and consistent styling approach

### Scope

**In Scope:**
- Visual redesign of 4 detail screens (GuardDetailScreen, WorkforcePersonnelDetailScreen, SiteDetailScreen, CandidateDetailScreen)
- Creation of reusable modern UI components (ModernCard, StatusBadge, IconContainer, FloatingActionBar, etc.)
- Tab navigation modernization with surface containers
- Status indicator color-coding and styling
- Emergency contact section distinctive styling
- Document verification section with status indicators
- Bottom floating action bar implementation

**Out of Scope:**
- Changes to data fetching logic or API services
- Modifications to business logic or state management
- Addition of new features or functionality
- Changes to navigation structure between screens
- Backend or database schema modifications


## Architecture

### Component Hierarchy

The modernized detail screens follow a layered component architecture:

```
DetailScreen (Container)
├── SafeAreaView (System-aware container)
├── StatusBar (Platform-specific status bar)
├── ScrollView (Scrollable content container)
│   ├── Header Section
│   │   ├── ProfileCard (Avatar, name, status badge)
│   │   └── QuickStats (Key metrics)
│   ├── TabNavigation (Surface-based tab switcher)
│   └── TabContent (Animated tab panels)
│       ├── ModernCard (Sectioned information container)
│       │   ├── CardHeader (Icon + Title)
│       │   └── CardContent
│       │       ├── InfoRow (Label-value pairs)
│       │       └── IconField (Icon + Label + Value)
│       ├── EmergencyContactCard (Distinctive styling)
│       └── DocumentSection (Document list with status)
└── FloatingActionBar (Fixed bottom actions)
```

### Design Patterns


**1. Composition over Inheritance**
- Small, focused components composed together
- Each component has a single responsibility
- Components are reusable across all detail screens

**2. Container/Presentational Pattern**
- Container components (screens) handle data fetching and state
- Presentational components handle rendering and styling
- Clear separation of concerns

**3. Theme-Driven Styling**
- All colors reference `Colors` constants
- All spacing uses `Spacing` constants
- All border radii use `BorderRadius` constants
- All typography uses `Typography` definitions

**4. Animated Transitions**
- Fade-in animations on mount using `Animated.timing`
- Slide-up animations for content reveal
- Tab transitions with smooth crossfades
- All animations use `useNativeDriver: true` for performance

**5. Responsive Design**
- Use `Dimensions.get('window')` for dynamic sizing
- `useSafeAreaInsets` for notch/navigation bar handling
- Flexible layouts with `flexWrap` and percentage widths
- Touch targets minimum 44x44px


### Technology Stack

- **React Native** 0.81.5: Core framework
- **TypeScript**: Type safety and developer experience
- **Expo** ~54.0.33: Development tooling and native modules
- **React Navigation** 7.x: Navigation management (existing)
- **Expo Vector Icons** (MaterialIcons): Icon library
- **React Native Animated API**: Animation system
- **SafeAreaContext**: Safe area handling for notches

### File Structure

```
mobile/src/
├── screens/
│   ├── GuardDetailScreen.tsx (modernized)
│   ├── WorkforcePersonnelDetailScreen.tsx (modernized)
│   ├── SiteDetailScreen.tsx (modernized)
│   └── CandidateDetailScreen.tsx (modernized)
├── components/
│   ├── ModernCard.tsx (new)
│   ├── StatusBadge.tsx (enhanced)
│   ├── IconContainer.tsx (new)
│   ├── IconField.tsx (new)
│   ├── InfoRow.tsx (new)
│   ├── ModernTabNavigation.tsx (new)
│   ├── EmergencyContactCard.tsx (new)
│   ├── DocumentRow.tsx (enhanced)
│   └── FloatingActionBar.tsx (new)
└── constants/
    └── theme.ts (existing, no changes)
```


## Components and Interfaces

### Core Components

#### 1. ModernCard

**Purpose**: Reusable card container with consistent styling across all detail screens.

**Interface**:
```typescript
interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: number; // Default: 2
  padding?: number; // Default: 20
}
```

**Styling**:
- `backgroundColor`: Colors.surface (#FFFFFF)
- `borderRadius`: BorderRadius.xl (12px)
- `padding`: 20px
- `shadowColor`: #000
- `shadowOffset`: { width: 0, height: 2 }
- `shadowOpacity`: 0.05
- `shadowRadius`: 8
- `elevation`: 2 (Android)

#### 2. CardHeader

**Purpose**: Section header with icon and title.

**Interface**:
```typescript
interface CardHeaderProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  iconColor?: string; // Default: Colors.primaryContainer
  iconSize?: number; // Default: 22
}
```

**Styling**:
- `flexDirection`: 'row'
- `alignItems`: 'center'
- `gap`: 10px
- `marginBottom`: 16px
- Title: fontSize 18, fontWeight '700', color Colors.onSurface


#### 3. StatusBadge

**Purpose**: Color-coded status indicator with pill shape.

**Interface**:
```typescript
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'present' | 'absent' | 'late' | 'pending' | 'approved' | 'verified';
  label?: string; // Optional override
  size?: 'small' | 'medium'; // Default: 'medium'
}
```

**Color Mapping**:
- `active`, `present`, `verified`: Colors.successGreen with 12% opacity background
- `inactive`, `absent`: Colors.secondary with 12% opacity background
- `late`, `pending`: Colors.warningAmber with 12% opacity background
- `approved`: Colors.infoBlue with 12% opacity background

**Styling**:
- `borderRadius`: BorderRadius.full (9999)
- `paddingHorizontal`: size === 'small' ? 8 : 10
- `paddingVertical`: size === 'small' ? 3 : 4
- Text: uppercase, fontSize 10-11, fontWeight '700', letterSpacing 0.5

#### 4. IconContainer

**Purpose**: Rounded container for icons in info fields.

**Interface**:
```typescript
interface IconContainerProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconSize?: number; // Default: 20
  containerSize?: number; // Default: 36
  iconColor?: string; // Default: Colors.primary
  backgroundColor?: string; // Default: Colors.surfaceContainer
}
```

**Styling**:
- `width`, `height`: containerSize (36px)
- `borderRadius`: 8px
- `backgroundColor`: Colors.surfaceContainer
- `justifyContent`, `alignItems`: 'center'


#### 5. InfoRow

**Purpose**: Label-value pair display with consistent formatting.

**Interface**:
```typescript
interface InfoRowProps {
  label: string;
  value: string | number;
  full?: boolean; // Full width (default: false, uses 50%)
  icon?: keyof typeof MaterialIcons.glyphMap; // Optional leading icon
}
```

**Styling**:
- `flexDirection`: icon ? 'row' : 'column'
- `width`: full ? '100%' : '48%'
- `gap`: icon ? 12 : 6
- Label: uppercase, fontSize 11, fontWeight '500', color Colors.onSurfaceVariant, letterSpacing 0.8
- Value: fontSize 15, fontWeight '600', color Colors.onSurface

#### 6. IconField

**Purpose**: Field with icon container, label, and value in a row.

**Interface**:
```typescript
interface IconFieldProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string | number;
  onPress?: () => void; // Optional tap handler
}
```

**Styling**:
- `flexDirection`: 'row'
- `alignItems`: 'center'
- `gap`: 12px
- `paddingVertical`: 10px
- Uses IconContainer component
- Label/value in column: label uppercase (fontSize 10), value normal (fontSize 15)


#### 7. ModernTabNavigation

**Purpose**: Modern tab switcher with surface-based styling.

**Interface**:
```typescript
interface Tab {
  key: string;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface ModernTabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}
```

**Styling**:
- Container: `backgroundColor` Colors.surfaceContainerLow, `borderRadius` 12px, `padding` 4px
- `flexDirection`: 'row', `gap`: 4px
- Each tab: `flex` 1, `paddingVertical` 10px, `paddingHorizontal` 12px
- Active tab: `backgroundColor` Colors.surfaceContainerLowest, `borderRadius` 10px, shadow elevation 1
- Active text: fontSize 13, fontWeight '700', color Colors.primary
- Inactive text: fontSize 13, fontWeight '500', color Colors.onSurfaceVariant
- Smooth transition animation (200ms) on tab change

#### 8. EmergencyContactCard

**Purpose**: Distinctive emergency contact display with gradient/colored background.

**Interface**:
```typescript
interface EmergencyContactCardProps {
  name: string;
  phone: string;
  relationship?: string;
  onCallPress?: () => void;
}
```

**Styling**:
- `backgroundColor`: Colors.secondary (#b02d21) or gradient
- `borderRadius`: BorderRadius.xl (16px)
- `padding`: 20px
- Decorative overlay: semi-transparent circle (opacity 0.1)
- All text: color #FFFFFF
- Label: uppercase, fontSize 11, fontWeight '600', letterSpacing 0.8
- Value: fontSize 16, fontWeight '700'
- Call button: white border, white text, pressable with icon


#### 9. DocumentRow

**Purpose**: Document list item with verification status.

**Interface**:
```typescript
interface DocumentRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string; // e.g., "Uploaded on May 15, 2024"
  verified?: boolean;
  uploaded?: boolean;
  onPress?: () => void; // View document
  onUpload?: () => void; // Upload document
}
```

**Styling**:
- `flexDirection`: 'row', `alignItems`: 'center', `gap`: 12px
- `paddingVertical`: 14px
- `borderBottomWidth`: 1, `borderBottomColor`: Colors.surfaceContainerHigh
- Icon container: 40px circular or rounded square
- Title: fontSize 15, fontWeight '600', color Colors.onSurface
- Subtitle: fontSize 12, color Colors.onSurfaceVariant
- Verified badge: StatusBadge with "VERIFIED" label
- Upload button: If not uploaded, show "cloud-upload" icon; if uploaded, show "visibility" icon
- Missing state: opacity 0.6, "cloud-off" icon

#### 10. FloatingActionBar

**Purpose**: Fixed bottom action bar with elevation.

**Interface**:
```typescript
interface FloatingActionBarProps {
  actions: ActionButton[];
  safeAreaBottom: number; // From useSafeAreaInsets
}

interface ActionButton {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof MaterialIcons.glyphMap;
}
```

**Styling**:
- `position`: 'absolute', `bottom`: 0, `left`: 0, `right`: 0
- `backgroundColor`: Colors.surface
- `paddingHorizontal`: 16px
- `paddingTop`: 12px
- `paddingBottom`: Math.max(12, safeAreaBottom)
- `shadowColor`: #000, `shadowOpacity`: 0.18, `shadowRadius`: 10, `elevation`: 8
- Buttons: `flex` 1, `height` 48px, `borderRadius` 8px
- Primary: `backgroundColor` Colors.primary, text Colors.onPrimary
- Secondary: `borderWidth` 1, `borderColor` Colors.outline, text Colors.primary
- Danger: `backgroundColor` Colors.secondary, text Colors.onSecondary


## Data Models

### Screen Data Interfaces

The modernization does not modify data models but relies on existing interfaces from service layers:

#### GuardDetailScreen
- **Data Source**: `guardService.GuardProfile`
- **Key Fields**: id, full_name, phone, employee_id, status, assigned_site, shift_type, joining_date, emergency_contact_name, emergency_contact_phone, base_salary, address, education, height, weight, aadhaar_number, pan_number, documents
- **Related Data**: Site info, attendance records, salary slips, uniform records

#### WorkforcePersonnelDetailScreen
- **Data Source**: `workforcePersonnelService.WorkforcePersonnel`
- **Key Fields**: Similar to GuardProfile with category_id, category_name, facility_id
- **Related Data**: Category info, attendance records, documents

#### SiteDetailScreen
- **Data Source**: `siteService.Site`
- **Key Fields**: id, site_name, client_name, address, latitude, longitude, geofence_radius, contact_person, contact_phone, shift_timings
- **Related Data**: Assigned guards, recent attendance, inspections

#### CandidateDetailScreen
- **Data Source**: `candidateService.Candidate`
- **Key Fields**: id, full_name, phone, height, weight, education, experience_years, preferred_location, salary_expectation, pipeline_status, notes
- **Related Data**: Status history, recruiter notes


### Style Specifications

#### Typography System

All text follows the existing Typography constants with specific overrides:

| Element | Font Size | Weight | Letter Spacing | Color | Transform |
|---------|-----------|--------|----------------|-------|-----------|
| Screen Title | 24px | 700 | 0 | Colors.onSurface | none |
| Section Title | 18px | 700 | 0 | Colors.onSurface | none |
| Card Title | 16px | 600 | 0 | Colors.onSurface | none |
| Field Label | 11px | 500 | 0.8px | Colors.onSurfaceVariant | uppercase |
| Field Value | 15px | 600 | 0 | Colors.onSurface | none |
| Status Badge | 10px | 700 | 0.5px | (varies) | uppercase |
| Tab Label Active | 13px | 700 | 0 | Colors.primary | none |
| Tab Label Inactive | 13px | 500 | 0 | Colors.onSurfaceVariant | none |
| Button Text | 15px | 700 | 0.3px | Colors.onPrimary | none |

#### Spacing System

| Element | Value | Source |
|---------|-------|--------|
| Screen Horizontal Padding | 16px | Spacing.screenPadding |
| Card Gap | 14px | Spacing.gutter + 2 |
| Card Internal Padding | 20px | Custom |
| Field Group Gap | 12px | Spacing.gutter |
| Info Row Gap | 10px | Custom |
| Icon-to-Text Gap | 10px | Custom |
| Section Margin | 24px | Spacing.stackLg |
| Bottom Safe Padding | Math.max(16, safeAreaInsets.bottom) + 16 | Dynamic |


#### Color System

**Primary Colors** (from theme.ts):
- Primary: #002752 (Dark blue for headers, primary actions)
- Secondary: #b02d21 (Deep red for warnings, danger actions)
- Success: #27AE60 (Green for active, present, verified states)
- Warning: #F39C12 (Amber for late, pending states)
- Info: #2980B9 (Blue for informational badges)

**Surface Colors**:
- surface: #faf9fd (Card backgrounds)
- surfaceContainer: #eeedf2 (Icon containers, secondary backgrounds)
- surfaceContainerLow: #f4f3f8 (Tab navigation background)
- surfaceContainerLowest: #ffffff (Active tab background)
- surfaceContainerHigh: #e8e7ec (Borders, dividers)

**Text Colors**:
- onSurface: #1a1c1f (Primary text)
- onSurfaceVariant: #43474f (Secondary text, labels)
- outline: #747780 (Tertiary text, placeholders)

#### Shadow Specifications

**Card Elevation**:
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.05,
shadowRadius: 8,
elevation: 2 // Android
```

**Floating Action Bar Elevation**:
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: -2 },
shadowOpacity: 0.18,
shadowRadius: 10,
elevation: 8 // Android
```

**Active Tab Elevation**:
```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.08,
shadowRadius: 3,
elevation: 1 // Android
```


## Error Handling

### Component Error Boundaries

**Strategy**: Graceful degradation with fallback UI

**Implementation**:
1. Wrap each tab content in an error boundary
2. If a tab fails to render, show error state without crashing entire screen
3. Provide "Retry" action to re-mount failed component

**Error States**:

#### Data Loading Errors
- **Trigger**: API call fails, network timeout, invalid response
- **UI**: Show error card with message, icon, and "Retry" button
- **Style**: Card with Colors.errorContainer background, Colors.error icon

#### Missing Data
- **Trigger**: Required fields are null/undefined
- **UI**: Show "N/A" or placeholder text
- **Style**: Reduced opacity (0.5) with Colors.onSurfaceVariant

#### Image Loading Errors
- **Trigger**: Profile photo or document fails to load
- **UI**: Show fallback avatar with initials or default icon
- **Style**: Colors.surfaceContainer background, Colors.onSurfaceVariant icon

#### Permission Errors
- **Trigger**: User denies camera/location permission
- **UI**: Show permission request card with explanation
- **Style**: Info banner with "settings" icon and "Grant Permission" button

### Validation

**Input Validation**: N/A (detail screens are read-only with action buttons)

**Action Validation**:
- Disable action buttons when operation is in progress (loading state)
- Show confirmation dialogs for destructive actions (terminate, unassign)
- Display toast messages for success/error feedback

### Network Resilience

**Offline Handling**:
- Show cached data with "Offline" badge in header
- Disable actions that require network (e.g., status updates)
- Queue actions when connectivity is restored (handled by service layer)

**Timeout Handling**:
- Set timeout for all API calls (30 seconds)
- Show timeout error with "Retry" option
- Log timeout events for monitoring


## Testing Strategy

### PBT Applicability Assessment

**Conclusion: Property-Based Testing is NOT applicable for this feature.**

**Rationale**:
This is a UI modernization project focused on:
- Visual styling and layout changes
- Component rendering with specific designs
- CSS-in-JS styling modifications
- Animation implementations
- Responsive layout adaptations

According to PBT guidelines, property-based testing is inappropriate for:
1. **UI rendering and layout** — This project exclusively modifies visual presentation
2. **Simple visual changes** — No algorithmic logic or data transformations involved
3. **Configuration validation** — Styling configurations don't benefit from property testing

**More appropriate testing strategies**:
- **Snapshot testing** — Capture component rendering output
- **Visual regression testing** — Detect unintended visual changes
- **Example-based unit tests** — Test specific component behaviors
- **Integration tests** — Verify data flow and user interactions
- **Manual testing** — Validate visual polish and animations

### Testing Approach

#### 1. Component Unit Tests (Jest + React Native Testing Library)

**Purpose**: Verify component rendering, props handling, and basic interactions

**Test Coverage**:

**ModernCard Component**:
- Renders children correctly
- Applies custom styles when provided
- Uses correct default elevation and padding
- Renders with proper shadow on both platforms

**StatusBadge Component**:
- Renders correct color for each status type
- Displays uppercase text
- Applies correct background opacity
- Handles custom label overrides
- Renders small and medium sizes correctly


**IconContainer Component**:
- Renders MaterialIcons with correct name
- Applies correct container size
- Uses theme colors by default
- Accepts custom colors and sizes
- Centers icon within container

**InfoRow Component**:
- Renders label in uppercase
- Displays value correctly
- Handles full-width vs half-width layout
- Renders optional icon when provided
- Shows "N/A" for null/undefined values

**ModernTabNavigation Component**:
- Renders all tabs
- Highlights active tab correctly
- Calls onTabChange with correct key on tap
- Applies active tab styling (backgroundColor, shadow)
- Applies inactive tab styling
- Handles tabs with and without icons

**EmergencyContactCard Component**:
- Renders name and phone
- Displays optional relationship
- Calls onCallPress when call button tapped
- Uses correct background color (Colors.secondary)
- Renders white text for all fields
- Includes decorative overlay element

**DocumentRow Component**:
- Renders icon, title, and subtitle
- Shows "visibility" icon when document is uploaded
- Shows "cloud-upload" icon when document is missing
- Displays "VERIFIED" badge when verified
- Reduces opacity to 0.6 for missing documents
- Calls onPress for view action
- Calls onUpload for upload action

**FloatingActionBar Component**:
- Renders all action buttons
- Applies correct button variants (primary, secondary, danger)
- Uses SafeAreaInsets for bottom padding
- Positions absolutely at bottom
- Calls onPress handlers correctly
- Renders optional icons in buttons


#### 2. Snapshot Tests

**Purpose**: Detect unintended visual regressions

**Test Coverage**:
- Snapshot each reusable component with default props
- Snapshot each component with edge case props (empty values, long text, etc.)
- Snapshot each detail screen tab content
- Snapshot different status badge variants
- Snapshot document row in uploaded/missing/verified states

**Example**:
```typescript
describe('ModernCard', () => {
  it('matches snapshot with default props', () => {
    const tree = render(<ModernCard><Text>Content</Text></ModernCard>).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('matches snapshot with custom elevation', () => {
    const tree = render(<ModernCard elevation={4}><Text>Content</Text></ModernCard>).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

#### 3. Integration Tests

**Purpose**: Verify data flow and screen interactions

**Test Coverage**:

**GuardDetailScreen**:
- Fetches guard data on mount
- Displays loading state while fetching
- Renders profile tab with correct guard information
- Switches between tabs correctly
- Shows error state when API fails
- Calls navigation.navigate with correct params on action button press
- Handles refresh control correctly

**Tab Navigation**:
- Renders tab content based on active tab
- Animates tab content when switching
- Persists tab selection across re-renders
- Handles tab with loading content

**Action Buttons**:
- Calls correct service method on button press
- Shows loading indicator during async operation
- Displays success/error toast on completion
- Disables buttons during loading


#### 4. Accessibility Tests

**Purpose**: Ensure components meet accessibility standards

**Test Coverage**:
- Minimum touch target size (44x44px) for all interactive elements
- Text contrast ratios (4.5:1 for normal text, 3:1 for large text)
- activeOpacity values (0.7-0.8) for all TouchableOpacity components
- Proper use of numberOfLines with ellipsis for text truncation
- Screen reader compatibility (testID attributes where needed)

**Example**:
```typescript
it('has minimum touch target size', () => {
  const { getByTestId } = render(<StatusBadge status="active" testID="badge" />);
  const badge = getByTestId('badge');
  expect(badge.props.style).toHaveProperty('minHeight', 44);
  expect(badge.props.style).toHaveProperty('minWidth', 44);
});
```

#### 5. Animation Tests

**Purpose**: Verify animation behavior without visual validation

**Test Coverage**:
- Fade-in animation triggers on mount
- Slide-up animation uses correct translateY values
- Animations use useNativeDriver: true
- Tab transition animations execute
- Geofence pulse animation loops correctly (if present)

**Example**:
```typescript
it('animates fade-in on mount', () => {
  const fadeAnim = new Animated.Value(0);
  render(<AnimatedComponent fadeAnim={fadeAnim} />);
  
  // Verify animation was called
  expect(Animated.timing).toHaveBeenCalledWith(
    fadeAnim,
    expect.objectContaining({
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    })
  );
});
```


#### 6. Visual Regression Tests (Optional/Manual)

**Purpose**: Catch visual bugs through screenshot comparison

**Approach**:
- Use Percy, Chromatic, or similar tool
- Capture screenshots of each screen in different states
- Compare against baseline images
- Flag visual differences for review

**Test States**:
- Default state with sample data
- Loading state
- Error state
- Empty state
- Long text/overflow scenarios
- Different screen sizes (phone, tablet)

#### 7. Manual Testing Checklist

**Purpose**: Validate aspects that are difficult to automate

**Visual Polish**:
- [ ] All cards have consistent shadows
- [ ] Status badges use correct colors
- [ ] Typography follows design system
- [ ] Spacing is consistent across screens
- [ ] Icons are properly aligned
- [ ] Colors match theme specification

**Animations**:
- [ ] Fade-in animations are smooth (400ms)
- [ ] Slide-up animations don't jank
- [ ] Tab transitions are fluid
- [ ] No animation stuttering on Android
- [ ] useNativeDriver optimizations work correctly

**Responsive Layout**:
- [ ] Content adapts to small screens (320px width)
- [ ] Content adapts to large screens (tablet)
- [ ] SafeAreaInsets work on notched devices
- [ ] Landscape orientation displays correctly
- [ ] No content cutoff or overlapping

**Cross-Platform**:
- [ ] Shadows render correctly on iOS and Android
- [ ] Text rendering is consistent
- [ ] Touch targets work on both platforms
- [ ] Status bar styling is correct
- [ ] Navigation gestures work


### Test Organization

```
mobile/src/
├── components/
│   ├── __tests__/
│   │   ├── ModernCard.test.tsx
│   │   ├── StatusBadge.test.tsx
│   │   ├── IconContainer.test.tsx
│   │   ├── InfoRow.test.tsx
│   │   ├── IconField.test.tsx
│   │   ├── ModernTabNavigation.test.tsx
│   │   ├── EmergencyContactCard.test.tsx
│   │   ├── DocumentRow.test.tsx
│   │   └── FloatingActionBar.test.tsx
│   └── __snapshots__/
│       └── *.snap
└── screens/
    └── __tests__/
        ├── GuardDetailScreen.test.tsx
        ├── WorkforcePersonnelDetailScreen.test.tsx
        ├── SiteDetailScreen.test.tsx
        └── CandidateDetailScreen.test.tsx
```

### Test Execution

**Run all tests**:
```bash
npm test
```

**Run with coverage**:
```bash
npm run test:coverage
```

**Watch mode for development**:
```bash
npm run test:watch
```

**Coverage Targets**:
- Component tests: 90%+ coverage
- Screen tests: 80%+ coverage
- Snapshots: 100% of components


## Implementation Details

### Animation Implementation

**Fade-In Animation**:
```typescript
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
  }).start();
}, []);

return (
  <Animated.View style={{ opacity: fadeAnim }}>
    {/* Content */}
  </Animated.View>
);
```

**Slide-Up Animation**:
```typescript
const slideAnim = useRef(new Animated.Value(30)).current;

useEffect(() => {
  Animated.timing(slideAnim, {
    toValue: 0,
    duration: 400,
    useNativeDriver: true,
  }).start();
}, []);

return (
  <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
    {/* Content */}
  </Animated.View>
);
```

**Combined Animation**:
```typescript
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(30)).current;

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }),
  ]).start();
}, []);

return (
  <Animated.View style={{ 
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }]
  }}>
    {/* Content */}
  </Animated.View>
);
```


**Tab Transition Animation**:
```typescript
const [activeTab, setActiveTab] = useState('profile');
const fadeAnim = useRef(new Animated.Value(1)).current;

const handleTabChange = (newTab: string) => {
  // Fade out current content
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 150,
    useNativeDriver: true,
  }).start(() => {
    // Change tab
    setActiveTab(newTab);
    // Fade in new content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  });
};

return (
  <Animated.View style={{ opacity: fadeAnim }}>
    {renderTabContent(activeTab)}
  </Animated.View>
);
```

### Responsive Layout Patterns

**Two-Column Info Grid**:
```typescript
<View style={{ 
  flexDirection: 'row', 
  flexWrap: 'wrap', 
  gap: 12,
  justifyContent: 'space-between' 
}}>
  <InfoRow label="Name" value={guard.full_name} />
  <InfoRow label="Phone" value={guard.phone} />
  <InfoRow label="Employee ID" value={guard.employee_id} />
  <InfoRow label="Joining Date" value={formattedDate} />
</View>
```

**Full-Width Fields**:
```typescript
<InfoRow label="Address" value={guard.address} full />
<InfoRow label="Emergency Contact" value={guard.emergency_contact_name} full />
```

**Dynamic Container Width**:
```typescript
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const cardWidth = SCREEN_WIDTH - (Spacing.screenPadding * 2);
```


### SafeArea Handling

**Screen Container**:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function DetailScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(16, insets.bottom) + 16,
        }}
      >
        {/* Content */}
      </ScrollView>
      <FloatingActionBar safeAreaBottom={insets.bottom} />
    </View>
  );
}
```

### Performance Optimizations

**Memoization**:
```typescript
// Memoize formatted values
const formattedDate = useMemo(() => {
  if (!guard.joining_date) return 'N/A';
  return new Date(guard.joining_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}, [guard.joining_date]);

// Memoize tab content to prevent unnecessary re-renders
const tabContent = useMemo(() => {
  switch (activeTab) {
    case 'profile': return <ProfileTab guard={guard} />;
    case 'assignment': return <AssignmentTab guard={guard} />;
    // ...
  }
}, [activeTab, guard]);
```

**useCallback for Event Handlers**:
```typescript
const handleTabChange = useCallback((tab: string) => {
  setActiveTab(tab);
}, []);

const handleActionPress = useCallback(async () => {
  setLoading(true);
  try {
    await guardService.updateStatus(guardId, newStatus);
    showSuccessToast('Status updated');
  } catch (error) {
    showErrorToast('Failed to update status');
  } finally {
    setLoading(false);
  }
}, [guardId, newStatus]);
```


**FlatList for Document Lists**:
```typescript
// Use FlatList instead of map for large lists
<FlatList
  data={documents}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <DocumentRow
      icon={getDocumentIcon(item.type)}
      title={item.name}
      subtitle={`Uploaded on ${formatDate(item.uploaded_at)}`}
      verified={item.verified}
      uploaded={!!item.url}
      onPress={() => handleViewDocument(item)}
    />
  )}
  ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
  ListEmptyComponent={<EmptyState message="No documents uploaded" />}
/>
```

### Accessibility Implementation

**Touch Target Enforcement**:
```typescript
<TouchableOpacity
  style={[
    styles.button,
    { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }
  ]}
  activeOpacity={0.7}
>
  <Text>{label}</Text>
</TouchableOpacity>
```

**Text Truncation**:
```typescript
<Text
  numberOfLines={2}
  ellipsizeMode="tail"
  style={styles.description}
>
  {longDescription}
</Text>
```

**Semantic Icons**:
```typescript
// Use descriptive icon names
<MaterialIcons name="person" /> // ✅ Good
<MaterialIcons name="account-circle" /> // ✅ Good
<MaterialIcons name="icon-123" /> // ❌ Avoid generic names
```


## Migration Strategy

### Phase 1: Component Creation (Week 1)

**Goal**: Build all reusable components with comprehensive tests

1. Create `components/ModernCard.tsx` with tests
2. Create `components/StatusBadge.tsx` with tests (enhance existing)
3. Create `components/IconContainer.tsx` with tests
4. Create `components/InfoRow.tsx` with tests
5. Create `components/IconField.tsx` with tests
6. Create `components/ModernTabNavigation.tsx` with tests
7. Create `components/EmergencyContactCard.tsx` with tests
8. Enhance `components/DocumentRow.tsx` with tests
9. Create `components/FloatingActionBar.tsx` with tests
10. Run component tests and fix issues
11. Create snapshot tests for all components

**Deliverables**:
- 9 tested components
- 90%+ code coverage
- Snapshot baselines
- Component documentation (JSDoc comments)

### Phase 2: Screen Modernization (Week 2)

**Goal**: Refactor one screen at a time, maintaining functionality

**Day 1-2: GuardDetailScreen**
1. Create backup branch
2. Refactor header section to use ModernCard
3. Refactor ProfileTab to use new components
4. Refactor other tabs (Assignment, Attendance, Salary, Uniform)
5. Add ModernTabNavigation
6. Add FloatingActionBar for actions
7. Add animations (fade-in, slide-up)
8. Test functionality manually
9. Run integration tests
10. Fix bugs

**Day 3-4: WorkforcePersonnelDetailScreen**
1. Apply same pattern as GuardDetailScreen
2. Adapt components to workforce-specific data
3. Test and fix

**Day 5: SiteDetailScreen**
1. Refactor site detail view
2. Modernize assigned guards section
3. Update map visualization styling
4. Test and fix


**Day 6-7: CandidateDetailScreen**
1. Refactor candidate detail view
2. Add pipeline status visualization
3. Modernize action buttons
4. Test and fix

### Phase 3: Testing & Polish (Week 3)

**Goal**: Comprehensive testing and refinement

**Day 1-2: Integration Testing**
1. Test all screens on Android device
2. Test all screens on iOS device (simulator or device)
3. Test on different screen sizes (phone, tablet)
4. Test landscape orientation
5. Test on notched devices (SafeArea handling)
6. Document bugs in tracker

**Day 3-4: Bug Fixes & Polish**
1. Fix all critical bugs
2. Fix medium-priority bugs
3. Refine animations (timing, smoothness)
4. Adjust spacing inconsistencies
5. Fix any visual misalignments

**Day 5: Cross-Platform Validation**
1. Test shadows on iOS and Android
2. Test status bar on both platforms
3. Verify text rendering consistency
4. Test touch targets and gestures
5. Final manual QA checklist

**Day 6-7: Documentation & Handoff**
1. Update README with new component usage
2. Document any breaking changes
3. Create migration guide for future screens
4. Record demo video showing before/after
5. Prepare handoff documentation

### Phase 4: Deployment

**Pre-Deployment Checklist**:
- [ ] All tests passing (unit, integration, snapshot)
- [ ] Code review completed and approved
- [ ] QA testing completed on Android and iOS
- [ ] Performance testing (no frame drops, smooth animations)
- [ ] Accessibility validation completed
- [ ] Documentation updated
- [ ] Release notes prepared

**Deployment Strategy**:
1. Deploy to internal testing track (TestFlight/Internal Testing)
2. Test with 5-10 internal users for 2-3 days
3. Collect feedback and fix critical issues
4. Deploy to beta track with 20-30 external testers
5. Monitor crash reports and user feedback
6. Fix any reported issues
7. Deploy to production (staged rollout: 10% → 50% → 100%)


### Rollback Plan

**If Critical Issues Occur**:
1. Identify the scope (single screen vs all screens)
2. If single screen: Revert that screen to previous version
3. If multiple screens: Evaluate rollback vs hotfix
4. Rollback steps:
   - Create hotfix branch from last stable release
   - Revert modernization commits
   - Test reverted version
   - Deploy hotfix release
   - Investigate root cause
   - Plan fix for next release

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation on Android | High | Medium | Profile animations, use useNativeDriver, test on low-end devices |
| Shadow rendering inconsistencies | Medium | High | Test on both platforms early, use elevation for Android, shadowProps for iOS |
| SafeArea issues on new devices | Medium | Low | Use useSafeAreaInsets consistently, test on notched devices |
| Animation jank/stuttering | High | Medium | Optimize with useNativeDriver, minimize JS bridge operations, use shouldComponentUpdate |
| Memory leaks from animations | Medium | Low | Properly cleanup animations in useEffect return, use Animated.stop() |
| Breaking existing functionality | High | Low | Comprehensive integration tests, manual QA, staged rollout |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component creation takes longer | Medium | Start with high-priority components, parallelize work |
| Screen refactoring more complex than expected | High | Allocate buffer time, tackle complex screens first |
| Testing reveals major issues | High | Early testing after each screen, quick iteration cycles |
| Cross-platform issues | Medium | Test on both platforms throughout development |


## Dependencies and Constraints

### Dependencies

**Existing Libraries** (No new dependencies required):
- React Native 0.81.5
- Expo ~54.0.33
- @expo/vector-icons ^15.0.3
- react-native-safe-area-context ~5.6.0
- react-navigation/native ^7.2.4

**Internal Dependencies**:
- `constants/theme.ts` — Design tokens (Colors, Spacing, BorderRadius, Typography)
- `api/*Service.ts` — Data fetching services (guardService, siteService, etc.)
- `context/FontSizeContext.tsx` — Accessibility font scaling

### Constraints

**Technical Constraints**:
- Must support React Native 0.81.5 (cannot upgrade to newer version)
- Must work on Android API 21+ and iOS 13+
- Must maintain performance on low-end Android devices (2GB RAM)
- Must support existing navigation structure (no breaking changes)
- Cannot modify service layer APIs or data structures

**Design Constraints**:
- Must use existing design tokens from `theme.ts`
- Must follow Material Design 3 principles (surface, container, elevation)
- Must support both English and Hindi text (font rendering)
- Must maintain 44x44px minimum touch targets (accessibility)
- Must support dynamic font scaling (useScaledStyles)

**Business Constraints**:
- Cannot break existing functionality (all features must work)
- Must preserve all user workflows (no UX changes beyond visual)
- Must complete in 3 weeks (fixed timeline)
- Must support offline mode (cached data display)

**Platform Constraints**:
- iOS: Must handle notch/Dynamic Island with SafeAreaInsets
- Android: Must handle various screen sizes and aspect ratios
- Both: Must handle orientation changes gracefully
- Both: Must render shadows correctly (different APIs)


## Success Metrics

### Quantitative Metrics

**Performance**:
- Maintain 60fps during animations (measured with React DevTools Profiler)
- Screen render time < 500ms (Time to Interactive)
- Memory usage increase < 10% compared to current implementation
- Bundle size increase < 50KB

**Code Quality**:
- Test coverage: Component tests ≥ 90%, Screen tests ≥ 80%
- Zero ESLint errors or warnings
- TypeScript strict mode with zero type errors
- All snapshot tests passing

**Stability**:
- Zero crash rate increase after deployment
- Zero critical bugs in first week
- < 3 medium-priority bugs in first week
- User-reported issues < 5 in first month

### Qualitative Metrics

**Visual Consistency**:
- All cards use consistent shadows and border radius
- All status badges use correct color coding
- Typography follows design system throughout
- Spacing is consistent across all screens

**User Experience**:
- Animations are smooth and professional
- Information hierarchy is clear and scannable
- Actions are easily discoverable
- Visual feedback is immediate on interactions

**Code Maintainability**:
- Component reuse across all 4 screens
- Clear separation of concerns (container/presentational)
- Consistent naming conventions
- Comprehensive JSDoc comments

### Acceptance Criteria

**Must Have (P0)**:
- ✅ All 4 detail screens modernized with new UI
- ✅ All existing functionality preserved
- ✅ All reusable components created and tested
- ✅ Animations implemented (fade-in, slide-up, tab transitions)
- ✅ SafeArea handling on all screens
- ✅ Status badges color-coded correctly
- ✅ Emergency contact card has distinctive styling
- ✅ Document rows show verification status
- ✅ Floating action bar on screens with actions
- ✅ Passes all unit and integration tests
- ✅ Works on Android and iOS
- ✅ No performance regressions

**Should Have (P1)**:
- ✅ Visual regression tests (snapshots)
- ✅ Accessibility compliance (touch targets, contrast)
- ✅ Responsive layouts tested on tablet
- ✅ Smooth animations on low-end Android devices
- ✅ Landscape orientation support
- ✅ Documentation for new components

**Nice to Have (P2)**:
- Dark mode support (future enhancement)
- Advanced animations (spring, gesture-based)
- Visual regression tool integration (Percy/Chromatic)
- Storybook for component showcase


## Appendix

### Component Usage Examples

#### ModernCard Example
```typescript
<ModernCard elevation={3} padding={24}>
  <CardHeader icon="person" title="Personal Information" />
  <View style={{ gap: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
    <InfoRow label="Name" value={guard.full_name} />
    <InfoRow label="Phone" value={guard.phone} />
    <InfoRow label="Employee ID" value={guard.employee_id} />
    <InfoRow label="Joining Date" value={formattedDate} />
  </View>
</ModernCard>
```

#### StatusBadge Example
```typescript
<StatusBadge status="active" />
<StatusBadge status="present" />
<StatusBadge status="late" label="DELAYED" />
<StatusBadge status="verified" size="small" />
```

#### ModernTabNavigation Example
```typescript
<ModernTabNavigation
  tabs={[
    { key: 'profile', label: 'Profile', icon: 'person' },
    { key: 'assignment', label: 'Assignment', icon: 'location-on' },
    { key: 'attendance', label: 'Attendance', icon: 'calendar-today' },
    { key: 'salary', label: 'Salary', icon: 'account-balance-wallet' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

#### EmergencyContactCard Example
```typescript
<EmergencyContactCard
  name="Rajesh Kumar"
  phone="+91 98765 43210"
  relationship="Father"
  onCallPress={() => Linking.openURL(`tel:+919876543210`)}
/>
```

#### FloatingActionBar Example
```typescript
<FloatingActionBar
  safeAreaBottom={insets.bottom}
  actions={[
    {
      label: 'Edit Profile',
      onPress: handleEditProfile,
      variant: 'secondary',
      icon: 'edit',
    },
    {
      label: 'Terminate',
      onPress: handleTerminate,
      variant: 'danger',
      icon: 'delete',
    },
  ]}
/>
```


### Style Reference Sheet

#### Common Styles
```typescript
const commonStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
```


### Color Usage Guide

| Element | Color Token | Hex Value | Usage |
|---------|-------------|-----------|-------|
| Primary button background | Colors.primary | #002752 | Main action buttons |
| Primary button text | Colors.onPrimary | #ffffff | Text on primary buttons |
| Secondary button border | Colors.outline | #747780 | Outlined buttons |
| Danger button background | Colors.secondary | #b02d21 | Destructive actions |
| Card background | Colors.surface | #faf9fd | All cards |
| Screen background | Colors.background | #faf9fd | Screen container |
| Icon container background | Colors.surfaceContainer | #eeedf2 | Icon wrappers |
| Tab navigation background | Colors.surfaceContainerLow | #f4f3f8 | Inactive tabs container |
| Active tab background | Colors.surfaceContainerLowest | #ffffff | Selected tab |
| Divider | Colors.surfaceContainerHigh | #e8e7ec | Borders, separators |
| Primary text | Colors.onSurface | #1a1c1f | Headers, values |
| Secondary text | Colors.onSurfaceVariant | #43474f | Labels, subtitles |
| Tertiary text | Colors.outline | #747780 | Placeholders |
| Active badge background | Colors.successGreen (12% opacity) | #27AE60 | Active, present, verified |
| Active badge text | Colors.successGreen | #27AE60 | Badge text |
| Inactive badge background | Colors.secondary (12% opacity) | #b02d21 | Inactive, absent |
| Inactive badge text | Colors.secondary | #b02d21 | Badge text |
| Warning badge background | Colors.warningAmber (12% opacity) | #F39C12 | Late, pending |
| Warning badge text | Colors.warningAmber | #F39C12 | Badge text |
| Emergency card background | Colors.secondary | #b02d21 | Emergency contact |
| Emergency card text | #ffffff | #ffffff | White text on red |

### Typography Usage Guide

| Element | Font Size | Weight | Line Height | Letter Spacing |
|---------|-----------|--------|-------------|----------------|
| Screen header | 24px | 700 | 32px | 0 |
| Section title | 18px | 700 | 24px | 0 |
| Card title | 16px | 600 | 22px | 0 |
| Field label | 11px | 500 | 14px | 0.8px |
| Field value | 15px | 600 | 20px | 0 |
| Body text | 14px | 400 | 20px | 0 |
| Button text | 15px | 700 | 20px | 0.3px |
| Status badge | 10px | 700 | 12px | 0.5px |
| Tab label | 13px | 500/700 | 18px | 0 |
| Emergency contact label | 11px | 600 | 14px | 0.8px |
| Emergency contact value | 16px | 700 | 22px | 0 |


### Icon Mapping Reference

| Section | Icon Name | MaterialIcons | Usage |
|---------|-----------|---------------|-------|
| Personal Info | person | ✅ | Profile section header |
| Contact Info | phone | ✅ | Phone field |
| Location | location-on | ✅ | Address field |
| ID | badge | ✅ | Employee ID field |
| Date | calendar-today | ✅ | Joining date, DOB |
| Email | email | ✅ | Email field |
| Emergency | local-hospital | ✅ | Emergency contact |
| Document | description | ✅ | Document list |
| Verified | verified | ✅ | Verified status |
| Upload | cloud-upload | ✅ | Upload action |
| View | visibility | ✅ | View document |
| Missing | cloud-off | ✅ | Missing document |
| Edit | edit | ✅ | Edit action |
| Delete | delete | ✅ | Delete action |
| Assignment | work | ✅ | Assignment section |
| Site | business | ✅ | Site info |
| Attendance | schedule | ✅ | Attendance section |
| Salary | account-balance-wallet | ✅ | Salary section |
| Call | phone | ✅ | Call button |
| Settings | settings | ✅ | Settings action |

### Spacing Reference

```typescript
// Gap values
const gaps = {
  xs: 6,    // Between label and value in InfoRow
  sm: 10,   // Between icon and text
  md: 12,   // Between fields in a group
  lg: 14,   // Between cards
  xl: 16,   // Screen padding
  xxl: 24,  // Section margins
};

// Padding values
const padding = {
  card: 20,
  container: 16,
  button: { horizontal: 16, vertical: 12 },
  badge: { horizontal: 10, vertical: 4 },
  iconContainer: 8,
};

// Border radius values
const borderRadius = {
  sm: 6,    // Small elements
  md: 8,    // Icon containers, buttons
  lg: 10,   // Active tabs
  xl: 12,   // Cards
  xxl: 16,  // Emergency card
  full: 9999, // Badges, circular elements
};
```


### Animation Timing Reference

```typescript
const animationTimings = {
  fadeIn: {
    duration: 400,
    easing: 'ease-out',
  },
  slideUp: {
    duration: 400,
    easing: 'ease-out',
  },
  tabTransition: {
    fadeOut: 150,
    fadeIn: 200,
  },
  buttonPress: {
    duration: 100,
    scale: 0.98,
  },
  statusChange: {
    duration: 300,
    easing: 'ease-in-out',
  },
};
```

### Screen-Specific Layouts

#### GuardDetailScreen Layout
```
┌─────────────────────────────────────┐
│ StatusBar (Colors.primary)          │
├─────────────────────────────────────┤
│ ScrollView                          │
│ ┌─────────────────────────────────┐ │
│ │ Profile Card                    │ │
│ │ - Avatar + Name + Status        │ │
│ │ - Quick Stats                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Tab Navigation                  │ │
│ │ [Profile][Assignment][...]      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Tab Content (Animated)          │ │
│ │ ModernCard: Personal Info       │ │
│ │ ModernCard: Contact Info        │ │
│ │ EmergencyContactCard            │ │
│ │ ModernCard: Documents           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ FloatingActionBar                   │
│ [Edit Profile] [Terminate]          │
└─────────────────────────────────────┘
```

#### Document Section Layout
```
┌─────────────────────────────────────┐
│ Documents (3/5 Verified)            │
├─────────────────────────────────────┤
│ [icon] Aadhaar Card        [✓] VERIFIED │
│        Uploaded May 15, 2024        │
├─────────────────────────────────────┤
│ [icon] PAN Card            [view]   │
│        Uploaded May 10, 2024        │
├─────────────────────────────────────┤
│ [icon] Police Verification [upload] │
│        Not uploaded (opacity 0.6)   │
└─────────────────────────────────────┘
```


### Cross-Platform Differences

#### Shadow Implementation
```typescript
// iOS
const iosShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
};

// Android
const androidShadow = {
  elevation: 2,
};

// Combined
const cardShadow = Platform.select({
  ios: iosShadow,
  android: androidShadow,
});
```

#### Status Bar
```typescript
// iOS: Uses barStyle
<StatusBar barStyle="light-content" />

// Android: Uses backgroundColor
<StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
```

#### Safe Area
```typescript
// iOS: Needs top/bottom insets for notch
paddingTop: insets.top,
paddingBottom: insets.bottom,

// Android: May need bottom navigation bar padding
paddingBottom: Math.max(16, insets.bottom),
```

### Troubleshooting Guide

**Issue**: Animations are janky on Android
- **Solution**: Ensure `useNativeDriver: true` is set for all Animated.timing calls
- **Check**: Verify no layout changes during animation (only opacity/transform)
- **Test**: Profile with React DevTools on low-end device

**Issue**: Shadows not visible on Android
- **Solution**: Use `elevation` property instead of shadowProps
- **Check**: Ensure parent view doesn't have `overflow: 'hidden'`
- **Workaround**: Increase elevation value (2 → 4)

**Issue**: Text truncation not working
- **Solution**: Add `numberOfLines` prop to Text component
- **Check**: Ensure parent has defined width (not `flex: 1` without constraint)
- **Add**: `ellipsizeMode="tail"` for trailing ellipsis

**Issue**: SafeArea padding incorrect
- **Solution**: Verify `SafeAreaProvider` wraps app root
- **Check**: Use `useSafeAreaInsets()` instead of `SafeAreaView`
- **Test**: On device with notch (simulator may not reflect correctly)

**Issue**: Status badges overlapping
- **Solution**: Wrap badge row in View with `flexWrap: 'wrap'` and `gap`
- **Check**: Ensure parent has constrained width
- **Add**: `maxWidth: '100%'` to badge container


## Glossary

- **Card-based layout**: UI pattern organizing related content in distinct containers (cards) with shadows and padding
- **Design tokens**: Reusable design values (colors, spacing, typography) stored as constants
- **Surface container**: Background color variant from Material Design 3 used for layered UI elements
- **SafeAreaInsets**: Padding values for device-specific UI elements (notch, home indicator, status bar)
- **useNativeDriver**: React Native optimization running animations on native thread instead of JS thread
- **Elevation**: Android shadow system using integer values (1-24) for depth
- **StatusBadge**: Pill-shaped component displaying status with color-coding
- **FloatingActionBar**: Fixed-position bottom bar containing primary action buttons
- **IconContainer**: Rounded background container wrapping icons for visual consistency
- **Tab content**: Switchable views within a screen, toggled by tab navigation
- **Fade-in animation**: Opacity transition from 0 to 1
- **Slide-up animation**: Vertical translation from positive Y to 0
- **Snapshot test**: Test capturing component output for regression detection
- **Visual regression**: Unintended changes to UI appearance
- **Touch target**: Interactive area of a UI element (minimum 44x44px for accessibility)

## References

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Material Design 3 Guidelines](https://m3.material.io/)
- [React Native Animated API](https://reactnative.dev/docs/animated)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://material.io/design)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [Testing Library React Native](https://callstack.github.io/react-native-testing-library/)
- Pan India Security UI/UX Design Brief (internal document)
- Existing codebase: `mobile/src/constants/theme.ts`

---

**Document Version**: 1.0  
**Last Updated**: {{DATE}}  
**Author**: AI Design Assistant  
**Status**: Ready for Review

