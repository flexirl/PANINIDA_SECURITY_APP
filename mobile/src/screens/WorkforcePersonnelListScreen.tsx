import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { getPersonnel } from '../api/workforcePersonnelService';
import { getCategories } from '../api/workforceCategoryService';
import WorkforcePersonnelCard from '../components/WorkforcePersonnelCard';
import type { WorkforcePersonnel, WorkforceCategory, EmploymentStatus } from '../types/workforce';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FILTER_CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - 32 - 8) / 2;

type FilterChip = 'all' | EmploymentStatus;

// ─── Helper: Status config ──────────────────────────
const getStatusConfig = (status: EmploymentStatus) => {
  switch (status) {
    case 'active':
      return { label: 'ACTIVE', dotColor: '#27AE60' };
    case 'inactive':
      return { label: 'INACTIVE', dotColor: '#FB923C' };
    case 'terminated':
      return { label: 'TERMINATED', dotColor: Colors.error };
  }
};

interface WorkforcePersonnelListScreenProps {
  navigation: any;
}

export default function WorkforcePersonnelListScreen({ navigation }: WorkforcePersonnelListScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { selectedCategory, categoryFilterIds, getLabel, categoryFilterError } = usePersonnelCategory();

  const [personnel, setPersonnel] = useState<WorkforcePersonnel[]>([]);
  const [categories, setCategories] = useState<WorkforceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Animations
  const fabScale = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

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

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);

      // Fetch categories once if not loaded
      if (categories.length === 0) {
        const catData = await getCategories();
        setCategories(catData);
      }

      // Fetch personnel with current filters
      const filterParams: any = {};

      if (categoryFilterIds && categoryFilterIds.length > 0) {
        filterParams.category_ids = categoryFilterIds;
      }

      if (searchQuery.trim()) {
        filterParams.search = searchQuery.trim();
      }

      const pData = await getPersonnel(filterParams);
      setPersonnel(pData);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve personnel list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [categoryFilterIds])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [categoryFilterIds]);

  const filters: { key: FilterChip; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'terminated', label: 'Terminated' },
  ];

  // Filter + search logic
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((p) => {
      const matchesFilter = activeFilter === 'all' || p.employment_status === activeFilter;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery));
      return matchesFilter && matchesSearch;
    });
  }, [personnel, activeFilter, searchQuery]);

  // Count per filter
  const counts = useMemo(() => {
    return {
      all: personnel.length,
      active: personnel.filter((p) => p.employment_status === 'active').length,
      inactive: personnel.filter((p) => p.employment_status === 'inactive').length,
      terminated: personnel.filter((p) => p.employment_status === 'terminated').length,
    };
  }, [personnel]);

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'personnel', icon: 'security' as const, label: getLabel('plural') },
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

  const renderPersonnelCard = useCallback(
    ({ item, index }: { item: WorkforcePersonnel; index: number }) => (
      <WorkforcePersonnelCard
        personnel={item}
        index={index}
        onPress={() => navigation.navigate('WorkforcePersonnelDetail', { personnelId: item.id })}
      />
    ),
    [navigation]
  );

  const renderHeader = () => (
    <View style={s.listHeader}>
      <Text style={s.resultCount}>
        {filteredPersonnel.length} {getLabel('plural').toLowerCase()} found
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.emptyState}>
      <MaterialIcons name="search-off" size={56} color={Colors.outlineVariant} />
      <Text style={s.emptyTitle}>No {getLabel('plural').toLowerCase()} found</Text>
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
              placeholder={`Search ${getLabel('plural').toLowerCase()} by name or phone...`}
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

        {/* Collapsible Filter Dropdown Panel */}
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
                const dotColor =
                  item.key === 'all'
                    ? Colors.primary
                    : getStatusConfig(item.key as EmploymentStatus).dotColor;

                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.85}
                    onPress={() => setActiveFilter(item.key)}
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

      {/* Category Filter Error */}
      {categoryFilterError && (
        <View style={s.categoryErrorContainer}>
          <MaterialIcons name="error-outline" size={20} color={Colors.error} />
          <Text style={s.categoryErrorText}>{categoryFilterError}</Text>
        </View>
      )}

      {/* ═══ Personnel List ═══ */}
      <FlatList
        data={filteredPersonnel}
        keyExtractor={(item) => item.id}
        renderItem={renderPersonnelCard}
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
          onPress={() => navigation.navigate('AddWorkforcePersonnel')}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ═══ Bottom Nav Bar (Floating pill style) ═══ */}
      <View style={s.bottomNav}>
        {navItems.map((item) => {
          const isActive = item.key === 'personnel';
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

  // ── Category Error ──
  categoryErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
    marginHorizontal: Spacing.screenPadding,
    marginVertical: 8,
  },
  categoryErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.error,
    lineHeight: 18,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 120,
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

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 100,
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

  // ── Bottom Nav (Floating pill style) ──
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

  // ── Empty State ──
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
