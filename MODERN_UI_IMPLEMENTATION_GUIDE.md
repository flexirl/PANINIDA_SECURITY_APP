# Modern UI Implementation Guide
## Detail Screens Modernization (Based on Rakesh Kumar HTML Reference)

### Overview
This guide provides the modernized UI patterns from the HTML reference to be implemented across all detail screens in the mobile app.

## Key Design Changes

### 1. **Modernized AppBar**
```tsx
// From HTML Reference: Sticky white header with subtle branding
<View style={styles.modernAppBar}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.modernBackBtn}>
    <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
  </TouchableOpacity>
  <View style={styles.modernAppBarTitle}>
    <Text style={styles.modernAppBarName} numberOfLines={1}>{name}</Text>
    <Text style={styles.modernAppBarLabel}>PROFILE LABEL</Text>
  </View>
  <TouchableOpacity style={styles.modernMoreBtn}>
    <MaterialIcons name="more-vert" size={24} color={Colors.onSurfaceVariant} />
  </TouchableOpacity>
</View>

// Styles
modernAppBar: {
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0,0,0,0.05)',
  paddingHorizontal: 16,
  height: 64,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 3,
  elevation: 2,
}

modernBackBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.04)',
}

modernAppBarTitle: {
  flex: 1,
  marginHorizontal: 12,
}

modernAppBarName: {
  fontSize: 18,
  fontWeight: '700',
  color: Colors.onSurface,
  letterSpacing: -0.3,
}

modernAppBarLabel: {
  fontSize: 10,
  fontWeight: '600',
  color: Colors.onSurfaceVariant,
  letterSpacing: 1.2,
  marginTop: 2,
}

modernMoreBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.04)',
}
```

### 2. **Profile Header Card**
```tsx
// From HTML: Clean, centered profile section with status indicator
<View style={styles.modernProfileCard}>
  <View style={styles.modernPhotoWrap}>
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} style={styles.modernProfileImage} />
    ) : (
      <View style={styles.modernProfileImageFallback}>
        <Text style={styles.modernProfileImageFallbackText}>
          {initials}
        </Text>
      </View>
    )}
    <View style={[styles.modernStatusDot, { backgroundColor: isActive ? '#10B981' : '#9CA3AF' }]} />
  </View>

  <View style={styles.modernProfileInfo}>
    <Text style={styles.modernProfileName}>{name}</Text>
    <Text style={styles.modernProfileEmpId}>{empId}</Text>
    <View style={styles.modernStatusBadge}>
      <Text style={styles.modernStatusBadgeText}>ACTIVE DUTY</Text>
    </View>
  </View>

  <View style={styles.modernProfileActions}>
    <TouchableOpacity style={styles.modernCallBtn} onPress={handleCall}>
      <MaterialIcons name="call" size={18} color={Colors.secondary} />
      <Text style={styles.modernCallBtnText}>Call</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.modernEditBtn}>
      <MaterialIcons name="edit" size={18} color={Colors.onSurfaceVariant} />
    </TouchableOpacity>
  </View>
</View>

// Styles
modernProfileCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  marginHorizontal: 16,
  marginTop: 32,
  marginBottom: 24,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 3,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.03)',
}

modernPhotoWrap: {
  alignItems: 'center',
  marginBottom: 20,
  position: 'relative',
}

modernProfileImage: {
  width: 80,
  height: 80,
  borderRadius: 40,
  borderWidth: 4,
  borderColor: 'rgba(0,0,0,0.03)',
}

modernProfileImageFallback: {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: Colors.primaryContainer,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 4,
  borderColor: 'rgba(0,0,0,0.03)',
}

modernProfileImageFallbackText: {
  fontSize: 28,
  fontWeight: '800',
  color: '#FFFFFF',
  letterSpacing: 1,
}

modernStatusDot: {
  position: 'absolute',
  bottom: 4,
  right: '45%',
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 3,
  borderColor: '#FFFFFF',
}

modernProfileInfo: {
  alignItems: 'center',
  marginBottom: 20,
}

modernProfileName: {
  fontSize: 24,
  fontWeight: '700',
  color: Colors.onSurface,
  letterSpacing: -0.5,
  marginBottom: 4,
}

modernProfileEmpId: {
  fontSize: 12,
  fontWeight: '600',
  color: Colors.onSurfaceVariant,
  letterSpacing: 1.5,
  marginBottom: 8,
}

modernStatusBadge: {
  backgroundColor: 'rgba(39,174,96,0.08)',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: 'rgba(39,174,96,0.15)',
}

modernStatusBadgeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#15803D',
  letterSpacing: 1.2,
}

modernProfileActions: {
  flexDirection: 'row',
  gap: 12,
  justifyContent: 'center',
}

modernCallBtn: {
  flex: 1,
  height: 44,
  backgroundColor: 'rgba(176,45,33,0.08)',
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderWidth: 1,
  borderColor: 'rgba(176,45,33,0.15)',
}

modernCallBtnText: {
  fontSize: 14,
  fontWeight: '600',
  color: Colors.secondary,
}

modernEditBtn: {
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: 'rgba(0,0,0,0.04)',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.06)',
}
```

### 3. **Refined Tabs Navigation**
```tsx
// From HTML: Clean underlined tabs with active indicator
<View style={styles.modernTabsNav}>
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab.key}
      style={[styles.modernTabBtn, activeTab === tab.key && styles.modernTabBtnActive]}
      onPress={() => setActiveTab(tab.key)}
    >
      <Text style={[
        styles.modernTabBtnText,
        activeTab === tab.key && styles.modernTabBtnTextActive
      ]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

// Styles
modernTabsNav: {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0,0,0,0.08)',
  paddingHorizontal: 16,
  backgroundColor: '#FFFFFF',
}

modernTabBtn: {
  paddingVertical: 16,
  paddingHorizontal: 20,
  position: 'relative',
}

modernTabBtnActive: {
  // Active indicator via ::after in CSS, simulate with absolute positioned View
}

modernTabBtnText: {
  fontSize: 13,
  fontWeight: '500',
  color: Colors.onSurfaceVariant,
  letterSpacing: 1,
}

modernTabBtnTextActive: {
  fontWeight: '700',
  color: Colors.secondary,
}

// Add this child to active tab button:
<View style={styles.modernTabActiveIndicator} />

modernTabActiveIndicator: {
  position: 'absolute',
  bottom: -1,
  left: 0,
  right: 0,
  height: 2,
  backgroundColor: Colors.secondary,
}
```

### 4. **Information Cards (CRM Style)**
```tsx
// From HTML: Clean cards with icon headers and grid layout
<View style={styles.modernInfoCard}>
  <View style={styles.modernInfoCardHeader}>
    <MaterialIcons name="person" size={20} color={Colors.primaryContainer} />
    <Text style={styles.modernInfoCardTitle}>Personal Information</Text>
  </View>
  <View style={styles.modernInfoGrid}>
    {infoRows.map((row) => (
      <View key={row.label} style={styles.modernInfoRow}>
        <Text style={styles.modernInfoLabel}>{row.label.toUpperCase()}</Text>
        <Text style={styles.modernInfoValue}>{row.value}</Text>
      </View>
    ))}
  </View>
</View>

// Styles
modernInfoCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.03)',
}

modernInfoCardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 24,
}

modernInfoCardTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: Colors.onSurface,
  letterSpacing: -0.3,
}

modernInfoGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 24,
}

modernInfoRow: {
  width: '45%',
  minWidth: 120,
}

modernInfoLabel: {
  fontSize: 10,
  fontWeight: '700',
  color: Colors.onSurfaceVariant,
  letterSpacing: 1.5,
  marginBottom: 4,
}

modernInfoValue: {
  fontSize: 16,
  fontWeight: '600',
  color: Colors.onSurface,
  letterSpacing: -0.2,
}
```

### 5. **Emergency Contact Card (Colored)**
```tsx
// From HTML: Attractive colored card with decorative element
<View style={styles.modernEmergencyCard}>
  {/* Decorative circle */}
  <View style={styles.modernEmergencyBgCircle} />
  
  <View style={styles.modernInfoCardHeader}>
    <MaterialIcons name="contact-emergency" size={20} color="#FFFFFF" />
    <Text style={[styles.modernInfoCardTitle, { color: '#FFFFFF' }]}>
      Emergency Contact
    </Text>
  </View>
  
  <Text style={styles.modernEmergencyName}>{emergencyName}</Text>
  <Text style={styles.modernEmergencyRelation}>RELATIONSHIP: {relation}</Text>
  
  <View style={{ alignItems: 'flex-start', marginTop: 16 }}>
    <TouchableOpacity
      style={styles.modernEmergencyCallBtn}
      onPress={() => Linking.openURL(`tel:${phone}`)}
    >
      <MaterialIcons name="call" size={16} color="#FFFFFF" />
      <Text style={styles.modernEmergencyPhone}>{phone}</Text>
    </TouchableOpacity>
  </View>
</View>

// Styles
modernEmergencyCard: {
  backgroundColor: Colors.primaryContainer,
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
  position: 'relative',
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 4,
}

modernEmergencyBgCircle: {
  position: 'absolute',
  top: -64,
  right: -64,
  width: 128,
  height: 128,
  borderRadius: 64,
  backgroundColor: 'rgba(255,255,255,0.05)',
}

modernEmergencyName: {
  fontSize: 20,
  fontWeight: '700',
  color: '#FFFFFF',
  marginTop: 12,
  letterSpacing: -0.3,
}

modernEmergencyRelation: {
  fontSize: 11,
  fontWeight: '600',
  color: 'rgba(255,255,255,0.7)',
  letterSpacing: 1.5,
  marginTop: 4,
}

modernEmergencyCallBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: 'rgba(255,255,255,0.15)',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
}

modernEmergencyPhone: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
  letterSpacing: 0.3,
}
```

### 6. **Document Cards**
```tsx
// From HTML: Clean document rows with icons and status
<View style={styles.modernDocCard}>
  <View style={styles.modernInfoCardHeader}>
    <MaterialIcons name="description" size={20} color={Colors.primaryContainer} />
    <Text style={styles.modernInfoCardTitle}>Documents</Text>
    <View style={styles.modernVerifiedBadge}>
      <MaterialIcons name="verified" size={14} color="#15803D" />
      <Text style={styles.modernVerifiedText}>VERIFIED</Text>
    </View>
  </View>
  
  {documents.map((doc) => (
    <View key={doc.id} style={styles.modernDocRow}>
      <View style={styles.modernDocIconWrap}>
        <MaterialIcons name={doc.icon} size={20} color={Colors.primaryContainer} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.modernDocTitle}>{doc.title}</Text>
        <Text style={styles.modernDocSubtitle}>{doc.subtitle}</Text>
      </View>
      <TouchableOpacity style={styles.modernDocViewBtn} onPress={doc.onView}>
        <MaterialIcons name="visibility" size={20} color={Colors.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  ))}
</View>

// Styles
modernDocCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.03)',
}

modernVerifiedBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: 'rgba(39,174,96,0.08)',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: 'rgba(39,174,96,0.15)',
  marginLeft: 'auto',
}

modernVerifiedText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#15803D',
  letterSpacing: 1.2,
}

modernDocRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  backgroundColor: 'rgba(0,0,0,0.02)',
  borderRadius: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.04)',
}

modernDocIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
}

modernDocTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.onSurface,
  marginBottom: 2,
}

modernDocSubtitle: {
  fontSize: 12,
  fontWeight: '500',
  color: Colors.onSurfaceVariant,
}

modernDocViewBtn: {
  width: 36,
  height: 36,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.04)',
}
```

## Implementation Checklist

### GuardDetailScreen.tsx
- [ ] Replace appBar with modernAppBar design
- [ ] Update profileCard to modernProfileCard layout
- [ ] Replace tabs with modernTabsNav
- [ ] Convert info sections to modernInfoCard
- [ ] Style emergency contact as modernEmergencyCard
- [ ] Update document list to modernDocRow format
- [ ] Add soft-shadow utility styles
- [ ] Update color scheme to match reference (subtle grays, clean whites)

### WorkforcePersonnelDetailScreen.tsx
- [ ] Apply same modernAppBar
- [ ] Update profile summary to match modernProfileCard
- [ ] Convert tabs to modernTabsNav pattern
- [ ] Refactor info sections to modernInfoCard
- [ ] Style document checklist with modernDocRow
- [ ] Update assignment card styling
- [ ] Add attendance styling with modern badges

## Color Palette (From HTML Reference)
```typescript
// Add these to your Colors constant
const ModernColors = {
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceHover: 'rgba(0,0,0,0.04)',
  border: 'rgba(0,0,0,0.08)',
  borderLight: 'rgba(0,0,0,0.03)',
  
  // Text
  textPrimary: '#1A1C1F',
  textSecondary: '#43474F',
  textTertiary: '#747780',
  
  // Status Colors
  activeGreen: '#10B981',
  activeGreenBg: 'rgba(39,174,96,0.08)',
  activeGreenBorder: 'rgba(39,174,96,0.15)',
  
  warningAmber: '#F59E0B',
  warningAmberBg: 'rgba(245,158,11,0.08)',
  
  errorRed: '#EF4444',
  errorRedBg: 'rgba(239,68,68,0.08)',
  
  // Shadows
  shadow1: 'rgba(0,0,0,0.05)',
  shadow2: 'rgba(0,0,0,0.08)',
  shadow3: 'rgba(0,0,0,0.12)',
};
```

## Typography Scale
```typescript
const ModernTypography = {
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelTiny: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
};
```

## Spacing System
```typescript
const ModernSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  gutter: 16,
  cardPadding: 24,
  sectionGap: 16,
};
```

## Border Radius
```typescript
const ModernBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
```

---

This guide provides all the UI patterns, component structures, and styling needed to modernize the detail screens to match the Rakesh Kumar HTML reference. Apply these patterns consistently across all detail screens for a cohesive, professional look.
