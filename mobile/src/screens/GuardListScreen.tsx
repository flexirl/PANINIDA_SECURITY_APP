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
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as guardService from '../api/guardService';
import * as siteService from '../api/siteService';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FILTER_CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - 32 - 8) / 2;
const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc';

// ─── Types ──────────────────────────────────────────
type GuardStatus = 'active' | 'inactive' | 'terminated';
type ShiftType = 'day' | 'night' | 'on-leave';
type FilterChip = 'all' | GuardStatus;

interface Guard {
  id: string;
  name: string;
  phone: string;
  status: GuardStatus;
  avatar?: string;
  initials?: string;
  site: string;
  shift: ShiftType;
  employee_id?: string;
}

interface GuardListScreenProps {
  navigation: any;
}

// ─── Helper functions ───────────────────────────────
const getStatusConfig = (status: GuardStatus) => {
  switch (status) {
    case 'active':
      return {
        label: 'ACTIVE',
        bg: 'rgba(39, 174, 96, 0.1)',
        text: '#27AE60',
        dotColor: '#27AE60',
      };
    case 'inactive':
      return {
        label: 'INACTIVE',
        bg: '#FFB4A8',
        text: '#8F0F07',
        dotColor: '#FB923C',
      };
    case 'terminated':
      return {
        label: 'TERMINATED',
        bg: Colors.errorContainer || '#FCDADA',
        text: Colors.onErrorContainer || '#8E130C',
        dotColor: Colors.error,
      };
  }
};

const getShiftConfig = (shift: ShiftType) => {
  switch (shift) {
    case 'day':
      return {
        label: 'Day Shift',
        icon: 'wb-sunny' as const,
        bg: Colors.primaryFixed,
        text: Colors.onPrimaryFixedVariant,
      };
    case 'night':
      return {
        label: 'Night Shift',
        icon: 'dark-mode' as const,
        bg: Colors.primaryContainer,
        text: Colors.onPrimaryContainer,
      };
    case 'on-leave':
      return {
        label: 'On Leave',
        icon: 'schedule' as const,
        bg: Colors.surfaceVariant,
        text: Colors.onSurfaceVariant,
      };
  }
};

// ─── Guard Card Component ───────────────────────────
function GuardCard({ guard, index, onPress }: { guard: Guard; index: number; onPress: () => void }) {
  const s = useScaledStyles(styles);
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const statusConfig = getStatusConfig(guard.status);
  const isDisabled = guard.status === 'terminated' || guard.status === 'inactive';

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

  const getShiftLabelText = (shift: ShiftType) => {
    switch (shift) {
      case 'day':
        return 'Day (08:00 - 20:00)';
      case 'night':
        return 'Night (20:00 - 08:00)';
      case 'on-leave':
        return 'On Leave';
      default:
        return 'Day (08:00 - 20:00)';
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeIn,
        transform: [{ translateY: slideIn }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[
          s.guardCard,
          isDisabled && s.guardCardDisabled,
        ]}
      >
        {/* Top Section: Avatar + Name + ID */}
        <View style={s.cardHeader}>
          <View style={[s.avatarWrapper, isDisabled && { opacity: 0.5 }]}>
            {guard.avatar ? (
              <Image
                source={{ uri: guard.avatar }}
                style={[
                  s.guardAvatar,
                  guard.status === 'terminated' && { opacity: 0.5 },
                ]}
              />
            ) : (
              <View style={s.guardInitials}>
                <Text style={s.guardInitialsText}>{guard.initials}</Text>
              </View>
            )}
            {/* Status dot */}
            <View
              style={[
                s.statusDot,
                { backgroundColor: statusConfig.dotColor },
              ]}
            />
          </View>
          <View style={s.headerInfo}>
            <Text style={s.guardNameText} numberOfLines={1}>
              {guard.name}
            </Text>
            <Text style={s.guardIdText}>
              ID: {guard.employee_id || guard.id}
            </Text>
          </View>
        </View>

        {/* Divider & Info Table */}
        <View style={s.cardInfoContainer}>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Phone Number</Text>
            <Text style={s.cardRowValue}>{guard.phone}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Primary Site</Text>
            <Text style={s.cardRowValue}>{guard.site}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Current Shift</Text>
            <Text style={s.cardRowValue}>{getShiftLabelText(guard.shift)}</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={s.detailsBtn}>
          <Text style={s.detailsBtnText}>VIEW DETAILS</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────
export default function GuardListScreen({ navigation }: GuardListScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel } = usePersonnelCategory();
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // FAB animation
  const fabScale = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

  const loadGuardsData = async () => {
    try {
      const [liveGuards, assignments, wpRecords] = await Promise.all([
        guardService.getGuards(),
        siteService.getAssignments().catch(err => {
          console.warn('getAssignments failed, guards will show as Unassigned:', err?.message || err);
          return [] as siteService.AssignmentRecord[];
        }),
        (async () => {
          try {
            const { data } = await supabase.from('workforce_personnel').select('id, employee_id');
            return data || [];
          } catch (err) {
            return [];
          }
        })(),
      ]);

      // Build employee_id lookup from workforce_personnel
      const employeeIdMap: { [id: string]: string } = {};
      (wpRecords as any[]).forEach((wp: any) => {
        if (wp.employee_id) employeeIdMap[wp.id] = wp.employee_id;
      });

      // Map assignments to dynamic active site strings
      const guardAssignmentMap: { [guardId: string]: { siteName: string; shiftType: ShiftType } } = {};
      assignments.forEach((assignment: any) => {
        if (assignment.is_active && assignment.guard_id) {
          guardAssignmentMap[assignment.guard_id] = {
            siteName: assignment.sites?.site_name || 'Assigned Site',
            shiftType: (assignment.shift_type || 'day') as ShiftType,
          };
        }
      });

      // Map dynamic models
      const mappedGuards: Guard[] = liveGuards.map((g: any) => {
        const assignment = guardAssignmentMap[g.id];
        const siteName = assignment ? assignment.siteName : 'Unassigned';
        const shift = assignment ? assignment.shiftType : (g.shift_type === 'rotational' ? 'day' : (g.shift_type || 'day')) as ShiftType;

        const nameParts = g.name.trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

        return {
          id: g.id,
          name: g.name,
          phone: g.phone.startsWith('+91') ? g.phone : `+91 ${g.phone}`,
          status: g.employment_status || 'active',
          avatar: g.photo_url || undefined,
          initials,
          site: siteName,
          shift: g.employment_status === 'inactive' || g.employment_status === 'terminated' ? 'on-leave' : shift,
          employee_id: employeeIdMap[g.id],
        };
      });

      setGuards(mappedGuards);

    } catch (err) {
      console.error('Error fetching guards:', err);
      Alert.alert('System Error', 'Failed to retrieve directory list. swipe down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGuardsData();
    }, [])
  );

  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      delay: 500,
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
    loadGuardsData();
  }, []);

  const filters: { key: FilterChip; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'terminated', label: 'Terminated' },
  ];

  // Filter + search logic
  const filteredGuards = useMemo(() => {
    return guards.filter((guard) => {
      const matchesFilter = activeFilter === 'all' || guard.status === activeFilter;
      const matchesSearch =
        searchQuery === '' ||
        guard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.phone.includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  }, [guards, activeFilter, searchQuery]);

  // Count per filter
  const counts = useMemo(() => {
    return {
      all: guards.length,
      active: guards.filter((g) => g.status === 'active').length,
      inactive: guards.filter((g) => g.status === 'inactive').length,
      terminated: guards.filter((g) => g.status === 'terminated').length,
    };
  }, [guards]);

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  const renderGuardCard = useCallback(
    ({ item, index }: { item: Guard; index: number }) => (
      <GuardCard
        guard={item}
        index={index}
        onPress={() => navigation.navigate('GuardDetail', { guardId: item.id })}
      />
    ),
    [navigation, guards]
  );

  const renderHeader = () => (
    <View style={s.listHeader}>
      <Text style={s.resultCount}>
        {filteredGuards.length} guard{filteredGuards.length !== 1 ? 's' : ''} found
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.emptyState}>
      <MaterialIcons name="search-off" size={56} color={Colors.outlineVariant} />
      <Text style={s.emptyTitle}>No guards found</Text>
      <Text style={s.emptySubtitle}>
        Try adjusting your search or filter criteria
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.outline, fontWeight: '600', fontSize: 14 }}>
          Retrieving personnel database...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={s.topBarRight}>
            {/* Notification bell */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
            {/* Settings button */}
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
          {/* Search Bar */}
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
              placeholder="Search guards by name or phone..."
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
            onPress={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            style={[
              s.filterToggleBtn,
              (activeFilter !== 'all' || isFilterDropdownOpen) && s.filterToggleBtnActive,
            ]}
          >
            <MaterialIcons
              name="filter-list"
              size={22}
              color={activeFilter !== 'all' || isFilterDropdownOpen ? '#FFFFFF' : Colors.outline}
            />
          </TouchableOpacity>
        </View>

        {/* Collapsible Filter Dropdown/Form Panel */}
        {isFilterDropdownOpen && (
          <View style={s.filterDropdownPanel}>
            <View style={s.filterDropdownHeader}>
              <Text style={s.filterDropdownTitle}>Filter by Status</Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity onPress={() => { setActiveFilter('all'); setIsFilterDropdownOpen(false); }}>
                  <Text style={s.clearFilterText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.filterOptionsGrid}>
              {filters.map((item) => {
                const isSelected = activeFilter === item.key;
                // Helper to get matching status dot color
                const dotColor =
                  item.key === 'all'
                    ? Colors.primary
                    : getStatusConfig(item.key as GuardStatus).dotColor;

                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.85}
                    onPress={() => {
                      setActiveFilter(item.key);
                    }}
                    style={[
                      s.filterOptionCard,
                      isSelected && s.filterOptionCardActive,
                    ]}
                  >
                    <View style={s.filterOptionLeft}>
                      <View style={[s.filterOptionDot, { backgroundColor: dotColor }]} />
                      <Text
                        style={[
                          s.filterOptionLabel,
                          isSelected && s.filterOptionLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.filterOptionBadge,
                        isSelected ? s.filterOptionBadgeActive : s.filterOptionBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          s.filterOptionCount,
                          isSelected && s.filterOptionCountActive,
                        ]}
                      >
                        {counts[item.key]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsFilterDropdownOpen(false)}
              style={s.applyFilterBtn}
            >
              <Text style={s.applyFilterBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══ Guard List ═══ */}
      <FlatList
        data={filteredGuards}
        keyExtractor={(item) => item.id}
        renderItem={renderGuardCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
      />

      {/* ═══ FAB ═══ */}
      <Animated.View style={[s.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.fabInner}
          onPress={() => navigation.navigate('AddGuard')}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ═══ Bottom Nav Bar (Floating pill style) ═══ */}
      <View style={s.bottomNav}>
        {navItems.map((item) => {
          const isActive = item.key === 'guards';
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

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
    paddingRight: 8,
    height: 56,
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
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },

  // ── Search & Filters ──
  searchFilterContainer: {
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingBottom: 2,
    zIndex: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,208,0.3)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
    marginBottom: 8,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
  },
  searchBarWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterDropdownPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginHorizontal: Spacing.screenPadding,
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterDropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterOptionCard: {
    width: FILTER_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterOptionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterOptionLabelActive: {
    color: '#FFFFFF',
  },
  filterOptionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterOptionBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterOptionBadgeInactive: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  filterOptionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  filterOptionCountActive: {
    color: '#FFFFFF',
  },
  applyFilterBtn: {
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 32,
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

  // ── Guard Card Styles (Aligned with HTML mockup) ──
  guardCard: {
    flexDirection: 'column',
    padding: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guardCardDisabled: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  guardAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  guardInitials: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardInitialsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  guardNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 20,
  },
  guardIdText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 12,
    marginBottom: 14,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  cardRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  detailsBtn: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },

  // FAB button
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 50,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Bottom Navigation Bar (Floating pill style)
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
