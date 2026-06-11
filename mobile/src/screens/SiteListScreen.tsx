import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as siteService from '../api/siteService';
import { useAuth } from '../hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────
type SiteStatus = 'active' | 'inactive';
type FilterChip = 'all' | SiteStatus;

interface Site {
  id: string;
  name: string;
  client: string;
  status: SiteStatus;
  icon: string; // MaterialIcons name
  address: string;
  dayGuards: number;
  nightGuards: number;
  contactName: string;
  contactPhone: string;
}

interface SiteListScreenProps {
  navigation: any;
}

// ─── Filter Chip Component ──────────────────────────
function FilterChipButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const s = useScaledStyles(styles);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          s.filterChip,
          isActive ? s.filterChipActive : s.filterChipInactive,
        ]}
      >
        <Text
          style={[
            s.filterChipText,
            isActive ? s.filterChipTextActive : s.filterChipTextInactive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Site Card Component ────────────────────────────
function SiteCard({
  site,
  index,
  onPress,
}: {
  site: Site;
  index: number;
  onPress: () => void;
}) {
  const s = useScaledStyles(styles);
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const isActive = site.status === 'active';
  const totalGuards = site.dayGuards + site.nightGuards;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 400,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeIn,
        transform: [{ translateY: slideIn }],
      }}
    >
      <View style={s.siteCard}>
        {/* Top Row: Status & Guard Count */}
        <View style={s.cardHeaderRow}>
          <View style={[s.statusBadge, isActive ? s.statusBadgeActive : s.statusBadgeInactive]}>
            <Text style={[s.statusText, isActive ? s.statusTextActive : s.statusTextInactive]}>
              {site.status.toUpperCase()}
            </Text>
          </View>
          <View style={s.guardCountRow}>
            <MaterialIcons name="group" size={18} color={Colors.onSurfaceVariant} />
            <Text style={s.guardCountText}>{totalGuards} Personnel</Text>
          </View>
        </View>

        {/* Content Row */}
        <Text style={s.siteName} numberOfLines={1}>{site.name}</Text>
        <Text style={s.clientName} numberOfLines={1}>{site.client.toUpperCase()}</Text>
        <Text style={s.addressText} numberOfLines={2}>{site.address}</Text>

        {/* Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={s.viewDetailsBtn}
          onPress={onPress}
        >
          <Text style={s.viewDetailsBtnText}>VIEW DASHBOARD</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen Component ──────────────────────────
export default function SiteListScreen({ navigation }: SiteListScreenProps) {
  const s = useScaledStyles(styles);
  const { user } = useAuth();
  const { getLabel } = usePersonnelCategory();
  const insets = useSafeAreaInsets();
  const [showFilters, setShowFilters] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchScale = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const loadSitesData = async () => {
    try {
      const [liveSites, assignments] = await Promise.all([
        siteService.getSites(),
        siteService.getAssignments(),
      ]);

      // Map assignments to active guard counts per site
      const guardCountsMap: { [siteId: string]: { day: number; night: number } } = {};
      assignments.forEach((assignment) => {
        if (assignment.is_active && assignment.site_id) {
          if (!guardCountsMap[assignment.site_id]) {
            guardCountsMap[assignment.site_id] = { day: 0, night: 0 };
          }
          if (assignment.shift_type === 'day') {
            guardCountsMap[assignment.site_id].day += 1;
          } else {
            guardCountsMap[assignment.site_id].night += 1;
          }
        }
      });

      // Map to Site local model
      const mappedSites: Site[] = liveSites.map((s) => {
        const counts = guardCountsMap[s.id] || { day: 0, night: 0 };
        return {
          id: s.id,
          name: s.site_name,
          client: s.client_name || 'Individual Client',
          status: s.is_active ? 'active' : 'inactive',
          icon: s.site_name.toLowerCase().includes('factory') || s.site_name.toLowerCase().includes('industrial')
            ? 'business'
            : s.site_name.toLowerCase().includes('mall') || s.site_name.toLowerCase().includes('store')
            ? 'store'
            : 'apartment',
          address: s.address,
          dayGuards: counts.day,
          nightGuards: counts.night,
          contactName: s.contact_person || 'N/A',
          contactPhone: s.contact_phone || 'N/A',
        };
      });

      setSites(mappedSites);
    } catch (err) {
      console.error('Error loading sites list:', err);
      Alert.alert('System Error', 'Failed to retrieve active secure sites. Swipe down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSitesData();
    }, [])
  );

  // Pop in FAB on mount
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.spring(searchScale, {
      toValue: 1.01,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.spring(searchScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSitesData();
  }, []);

  const handleSitePress = (site: Site) => {
    navigation.navigate('SiteDashboard', {
      siteId: site.id,
    });
  };

  const handleAddSite = () => {
    navigation.navigate('AddSite');
  };

  // Filter & Search Logic
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesFilter = activeFilter === 'all' || site.status === activeFilter;
      const matchesSearch =
        searchQuery === '' ||
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [sites, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: sites.length,
      active: sites.filter((s) => s.status === 'active').length,
      inactive: sites.filter((s) => s.status === 'inactive').length,
    };
  }, [sites]);

  const filters: { key: FilterChip; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'workforce', icon: 'people' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'workforce') {
      navigation.navigate('WorkforcePersonnelList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  const renderSiteCard = useCallback(
    ({ item, index }: { item: Site; index: number }) => (
      <SiteCard
        site={item}
        index={index}
        onPress={() => handleSitePress(item)}
      />
    ),
    [navigation, sites]
  );

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.outline, fontWeight: '600', fontSize: 14 }}>
          Scanning active perimeters...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ Search & Filters ═══ */}
      <View style={s.searchFilterContainer}>
        <View style={s.searchRow}>
          {/* Search Input */}
          <Animated.View
            style={[
              s.searchBarWrapper,
              { transform: [{ scale: searchScale }] },
              isSearchFocused && s.searchBarWrapperFocused,
            ]}
          >
            <MaterialIcons
              name="search"
              size={22}
              color={isSearchFocused ? Colors.primary : Colors.outline}
              style={s.searchIcon}
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search facilities, locations, or clients..."
              placeholderTextColor={Colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={s.clearBtn}
              >
                <MaterialIcons name="close" size={18} color={Colors.outline} />
              </TouchableOpacity>
            )}
          </Animated.View>
          {/* Filter Toggle Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[s.filterToggleBtn, showFilters && s.filterToggleBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialIcons
              name="tune"
              size={22}
              color={showFilters ? '#ffffff' : Colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Scroll chips */}
        {showFilters && (
          <View style={{ height: 60 }}>
            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filtersScroll}
              renderItem={({ item }) => (
                <FilterChipButton
                  label={`${item.label} (${counts[item.key]})`}
                  isActive={activeFilter === item.key}
                  onPress={() => setActiveFilter(item.key)}
                />
              )}
            />
          </View>
        )}
      </View>

      {/* ═══ List content ═══ */}
      <FlatList
        data={filteredSites}
        keyExtractor={(item) => item.id}
        renderItem={renderSiteCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View style={s.listHeader}>
            <Text style={s.resultCount}>
              {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={s.emptyState}>
            <MaterialIcons name="search-off" size={56} color={Colors.outlineVariant} />
            <Text style={s.emptyTitle}>No sites found</Text>
            <Text style={s.emptySubtitle}>
              Try adjusting your search query or filters
            </Text>
          </View>
        )}
      />

      {/* ═══ FAB ═══ */}
      <Animated.View style={[s.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.fabInner}
          onPress={handleAddSite}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ═══ Bottom Navigation ═══ */}
      <View style={s.bottomNav}>
        {navItems.map((item) => {
          const isActive = item.key === 'sites';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Header Bar
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
    paddingLeft: 2,
    paddingRight: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 175,
    height: 44,
    resizeMode: 'contain',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },

  // Search & Filters Section
  searchFilterContainer: {
    backgroundColor: Colors.surface,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: 'rgba(26, 61, 109, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBarWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(26, 61, 109, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  filterToggleBtnActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipInactive: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  filterChipTextInactive: {
    color: Colors.onSurfaceVariant,
  },

  // List Layout
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 140,
  },
  listHeader: {
    paddingVertical: 8,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.outline,
    letterSpacing: 0.3,
  },

  // Site Cards
  siteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: 'rgba(26, 61, 109, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#E6F4EA',
  },
  statusBadgeInactive: {
    backgroundColor: '#FCE8E6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#1E7E34',
  },
  statusTextInactive: {
    color: '#C5221F',
  },
  guardCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guardCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: Colors.outline,
    lineHeight: 18,
    marginBottom: 16,
  },
  viewDetailsBtn: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  viewDetailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // FAB button
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 24,
    zIndex: 50,
  },
  fabInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
  },
  navItemActive: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
});
