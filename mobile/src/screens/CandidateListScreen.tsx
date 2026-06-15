import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as candidateService from '../api/candidateService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CandidateListScreenProps {
  navigation: any;
}

type CandidateStatus = 'new' | 'contacted' | 'interested' | 'interview' | 'interview_scheduled' | 'selected' | 'hired' | 'rejected';
type FilterTab = 'all' | CandidateStatus;

interface Candidate {
  id: string;
  name: string;
  phone: string;
  status: CandidateStatus;
  education: string;
  experience: string;
  location: string;
  expectedSalary: number;
  addedBy: string;
  addedDaysAgo: number;
  initialsColor: string;
  interviewDate?: string;
  height: number; // height in cm
  age: number; // age in years
}

// Color palette for candidate initials
const INITIALS_COLORS = [
  Colors.primaryFixedDim, Colors.secondaryFixed, '#E8F8EF', '#FFF3E0',
  Colors.primaryFixed, '#E3F2FD', '#FCE4EC', '#F3E5F5',
];

/** Maps backend CandidateProfile to screen's Candidate interface */
function mapToCandidate(c: candidateService.CandidateProfile, idx: number): Candidate {
  // Map backend status to screen status
  let status: CandidateStatus = c.status as CandidateStatus;
  if (status === 'interview_scheduled') status = 'interview_scheduled';

  const daysAgo = c.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000))
    : 0;

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    status,
    education: c.education || 'N/A',
    experience: c.experience_years ? `${c.experience_years} yr${c.experience_years !== 1 ? 's' : ''}` : 'Fresher',
    location: c.preferred_location || 'N/A',
    expectedSalary: c.salary_expectation || 0,
    addedBy: (c as any).users?.name || 'Admin',
    addedDaysAgo: daysAgo,
    initialsColor: INITIALS_COLORS[idx % INITIALS_COLORS.length],
    height: c.height || 0,
    age: 0, // age not stored in backend
  };
}

const cmToFeetInches = (cm: number) => {
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${cm} cm (${feet}'${remainingInches}")`;
};

export default function CandidateListScreen({ navigation }: CandidateListScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterHeight, setFilterHeight] = useState('any');
  const [filterEducation, setFilterEducation] = useState('any');
  const [filterExperience, setFilterExperience] = useState('any');

  // Temporary States (committed only on Apply)
  const [tempFilterHeight, setTempFilterHeight] = useState('any');
  const [tempFilterEducation, setTempFilterEducation] = useState('any');
  const [tempFilterExperience, setTempFilterExperience] = useState('any');

  const activeFiltersCount = 
    (filterHeight !== 'any' ? 1 : 0) +
    (filterEducation !== 'any' ? 1 : 0) +
    (filterExperience !== 'any' ? 1 : 0);

  const searchScale = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  // Fetch candidates from backend
  const fetchCandidates = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const data = await candidateService.getCandidates();
      setAllCandidates(data.map((c, i) => mapToCandidate(c, i)));
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
      setError(err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Re-fetch when returning from AddCandidate
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCandidates();
    });
    return unsubscribe;
  }, [navigation, fetchCandidates]);

  // Pop in FAB
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.spring(searchScale, { toValue: 1.01, useNativeDriver: true }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.spring(searchScale, { toValue: 1, useNativeDriver: true }).start();
  };

  // Helper Initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getStatusBadgeConfig = (status: CandidateStatus) => {
    switch (status) {
      case 'new':
        return { label: 'New', bg: Colors.primaryFixed, text: Colors.onPrimaryFixedVariant };
      case 'contacted':
        return { label: 'Contacted', bg: '#E8F5E9', text: '#27AE60' };
      case 'interested':
        return { label: 'Interested', bg: '#FFF3E0', text: '#F39C12' };
      case 'interview':
      case 'interview_scheduled':
        return { label: 'Interview', bg: '#F3E5F5', text: '#8E24AA' };
      case 'selected':
        return { label: 'Selected', bg: '#E8F8EF', text: '#27AE60' };
      case 'hired':
        return { label: 'Hired', bg: Colors.primary, text: '#FFFFFF' };
      case 'rejected':
        return { label: 'Rejected', bg: '#FFEBEE', text: '#E74C3C' };
    }
  };

  // Helper to get education level value
  const getEducationLevel = (edu: string): number => {
    const e = edu.toLowerCase();
    if (e.includes('graduate')) return 4;
    if (e.includes('12th')) return 3;
    if (e.includes('10th')) return 2;
    if (e.includes('8th')) return 1;
    return 0;
  };

  const getEducationLevelFromFilter = (filterVal: string): number => {
    if (filterVal === 'graduate') return 4;
    if (filterVal === '12th') return 3;
    if (filterVal === '10th') return 2;
    if (filterVal === '8th') return 1;
    return 0;
  };

  // Helper to extract experience years as number
  const getExperienceYears = (exp: string): number => {
    const match = exp.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Filter & Search Logic
  const filteredCandidates = allCandidates.filter((candidate) => {
    const matchesTab = activeTab === 'all' || candidate.status === activeTab || (activeTab === 'interview' && candidate.status === 'interview_scheduled');
    const matchesSearch =
      searchQuery === '' ||
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.phone.includes(searchQuery) ||
      candidate.location.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Height filter (minimum height threshold in cm)
    let matchesHeight = true;
    if (filterHeight !== 'any') {
      const minHeight = parseInt(filterHeight, 10);
      matchesHeight = candidate.height >= minHeight;
    }

    // Education filter (minimum education level)
    let matchesEducation = true;
    if (filterEducation !== 'any') {
      const requiredLevel = getEducationLevelFromFilter(filterEducation);
      const candidateLevel = getEducationLevel(candidate.education);
      matchesEducation = candidateLevel >= requiredLevel;
    }

    // Experience filter (minimum experience threshold in years)
    let matchesExperience = true;
    if (filterExperience !== 'any') {
      const minExperience = parseInt(filterExperience, 10);
      const candidateExperience = getExperienceYears(candidate.experience);
      matchesExperience = candidateExperience >= minExperience;
    }

    return matchesTab && matchesSearch && matchesHeight && matchesEducation && matchesExperience;
  });

  const applyFilterCheck = (c: Candidate) =>
    (filterHeight === 'any' || c.height >= parseInt(filterHeight, 10)) &&
    (filterEducation === 'any' || getEducationLevel(c.education) >= getEducationLevelFromFilter(filterEducation)) &&
    (filterExperience === 'any' || getExperienceYears(c.experience) >= parseInt(filterExperience, 10));

  const stats = {
    new: allCandidates.filter((c) => c.status === 'new' && applyFilterCheck(c)).length,
    inProgress: allCandidates.filter((c) => (c.status === 'contacted' || c.status === 'interested' || c.status === 'interview' || c.status === 'interview_scheduled') && applyFilterCheck(c)).length,
    selected: allCandidates.filter((c) => c.status === 'selected' && applyFilterCheck(c)).length,
    hired: allCandidates.filter((c) => c.status === 'hired' && applyFilterCheck(c)).length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'interested', label: 'Interested' },
    { key: 'interview', label: 'Interview' },
    { key: 'selected', label: 'Selected' },
    { key: 'hired', label: 'Hired' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const handleAddCandidate = () => {
    navigation.navigate('AddCandidate');
  };

  const handleCandidatePress = (candidate: Candidate) => {
    navigation.navigate('CandidateDetail', { candidateId: candidate.id });
  };

  const renderCandidateCard = useCallback(
    ({ item, index }: { item: Candidate; index: number }) => {
      const badge = getStatusBadgeConfig(item.status);
      const isInterview = item.status === 'interview';

      return (
        <Animated.View style={s.cardContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={s.candidateCard}
            onPress={() => handleCandidatePress(item)}
          >
            {/* Header part */}
            <View style={s.cardHeader}>
              <View style={s.cardHeaderLeft}>
                <View style={[s.avatarInitials, { backgroundColor: item.initialsColor }]}>
                  <Text style={s.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={s.headerTitleContainer}>
                  <Text style={s.candidateName}>{item.name}</Text>
                  <View style={s.phoneRow}>
                    <MaterialIcons name="phone" size={12} color={Colors.onSurfaceVariant} />
                    <Text style={s.candidatePhone}>{item.phone}</Text>
                  </View>
                </View>
              </View>
              <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[s.statusText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            </View>

            {/* Grid details or schedule text */}
            {isInterview && item.interviewDate ? (
              <View style={s.interviewContent}>
                <Text style={s.interviewSub}>Scheduled for {item.interviewDate}</Text>
                <TouchableOpacity style={s.viewScheduleBtn}>
                  <Text style={s.viewScheduleBtnText}>View Schedule</Text>
                  <MaterialIcons name="arrow-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.cardGrid}>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>EDUCATION</Text>
                  <Text style={s.gridValue}>{item.education}</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>EXPERIENCE</Text>
                  <Text style={s.gridValue}>{item.experience}</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>HEIGHT</Text>
                  <Text style={s.gridValue}>{cmToFeetInches(item.height)}</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>AGE</Text>
                  <Text style={s.gridValue}>{item.age} yrs</Text>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>LOCATION</Text>
                  <View style={s.locationRow}>
                    <MaterialIcons name="location-on" size={13} color={Colors.secondary} />
                    <Text style={s.gridValue} numberOfLines={1}>{item.location}</Text>
                  </View>
                </View>
                <View style={s.gridItem}>
                  <Text style={s.gridLabel}>EXP. SALARY</Text>
                  <Text style={[s.gridValue, s.salaryText]}>
                    ₹{item.expectedSalary.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            {/* Card footer */}
            <View style={s.cardFooter}>
              <Text style={s.addedByText}>
                Added by: <Text style={s.addedByName}>{item.addedBy}</Text> • {item.addedDaysAgo} days ago
              </Text>
              <TouchableOpacity style={s.moreVertBtn}>
                <MaterialIcons name="more-vert" size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    []
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Recruitment</Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAURMzBFvovBRfSMLyD18GdbmHO6YM-uaQL14rc_I5lYc3xX2Q6YWrFx_n0OBFR-QrnSS6aeicTNYTQ0wmPZwVLRFQFd-gdtxjuEGnx4fy0T7_gFPWLV3qMZI3Bz0SYa1bpwU5FE_Nm3-pon-QR0bQHr3iv7IWydITPLoSwM-_SP_GGbwF1GZC4wVlgKNyozzQQbug_A2C0eq6L6iVkHSVvagcVdXYOsXN3cT5OpGMc68pDCTNfIK5bpxKTlBZevDm_EqQ3FONayR4' }}
                style={s.avatarSmallImage as any}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ═══ Scrollable content ═══ */}
      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        {/* ─── Pipeline Stats Row ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statsScroll}
        >
          <View style={s.statCard}>
            <Text style={s.statLabelText}>NEW</Text>
            <Text style={[s.statValueText, { color: Colors.primary }]}>{stats.new}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabelText}>IN PROGRESS</Text>
            <Text style={[s.statValueText, { color: Colors.secondary }]}>{stats.inProgress}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabelText}>SELECTED</Text>
            <Text style={[s.statValueText, { color: Colors.primary }]}>{stats.selected}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabelText}>HIRED</Text>
            <Text style={[s.statValueText, { color: Colors.primary }]}>{stats.hired}</Text>
          </View>
        </ScrollView>

        {/* ─── Search & Filter Bar ─── */}
        <View style={s.searchSection}>
          <View style={s.searchSectionRow}>
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
                placeholder="Search candidates..."
                placeholderTextColor={Colors.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearBtn}>
                  <MaterialIcons name="close" size={18} color={Colors.outline} />
                </TouchableOpacity>
              )}
            </Animated.View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                s.filterBtn,
                activeFiltersCount > 0 && s.filterBtnActive,
              ]}
              onPress={() => {
                setTempFilterHeight(filterHeight);
                setTempFilterEducation(filterEducation);
                setTempFilterExperience(filterExperience);
                setIsFilterModalVisible(true);
              }}
            >
              <MaterialIcons
                name="filter-list"
                size={22}
                color={activeFiltersCount > 0 ? '#FFFFFF' : Colors.primary}
              />
              {activeFiltersCount > 0 && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Filter Tabs ─── */}
        <View style={s.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[s.tabItem, isActive && s.tabItemActive]}
                >
                  <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Candidates Cards Grid ─── */}
        <View style={s.listContainer}>
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((item, idx) => (
              <React.Fragment key={item.id}>
                {renderCandidateCard({ item, index: idx })}
              </React.Fragment>
            ))
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="search-off" size={56} color={Colors.outlineVariant} />
              <Text style={s.emptyTitle}>No candidates found</Text>
              <Text style={s.emptySubtitle}>Try adjusting your search query or tabs</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ FAB ═══ */}
      <Animated.View style={[s.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.fabInner}
          onPress={handleAddCandidate}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity
          style={s.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <MaterialIcons name="dashboard" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('GuardList')}
        >
          <MaterialIcons name="security" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>Guards</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.navItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('SiteList')}
        >
          <MaterialIcons name="location-on" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>Sites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.navItem, s.navItemActive]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('MoreMenu')}
        >
          <MaterialIcons name="menu" size={24} color="#ffffff" />
          <Text style={[s.navLabel, s.navLabelActive]}>More</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ Filter Modal ═══ */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={s.filterModalContent}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filter Candidates</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.filterModalBody} showsVerticalScrollIndicator={false}>
              {/* Height Filter */}
              <View style={s.filterSection}>
                <Text style={s.filterSectionTitle}>Minimum Height</Text>
                <View style={s.chipsRow}>
                  {[
                    { label: 'Any', value: 'any' },
                    { label: '5.5 ft+ (168 cm)', value: '168' },
                    { label: '5.7 ft+ (170 cm)', value: '170' },
                    { label: '5.9 ft+ (175 cm)', value: '175' },
                    { label: '6.0 ft+ (183 cm)', value: '183' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        s.filterChip,
                        tempFilterHeight === option.value && s.filterChipActive,
                      ]}
                      onPress={() => setTempFilterHeight(option.value)}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          tempFilterHeight === option.value && s.filterChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Education Filter */}
              <View style={s.filterSection}>
                <Text style={s.filterSectionTitle}>Minimum Education</Text>
                <View style={s.chipsRow}>
                  {[
                    { label: 'Any', value: 'any' },
                    { label: '8th Pass', value: '8th' },
                    { label: '10th Pass', value: '10th' },
                    { label: '12th Pass', value: '12th' },
                    { label: 'Graduate', value: 'graduate' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        s.filterChip,
                        tempFilterEducation === option.value && s.filterChipActive,
                      ]}
                      onPress={() => setTempFilterEducation(option.value)}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          tempFilterEducation === option.value && s.filterChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Experience Filter */}
              <View style={s.filterSection}>
                <Text style={s.filterSectionTitle}>Minimum Experience</Text>
                <View style={s.chipsRow}>
                  {[
                    { label: 'Any', value: 'any' },
                    { label: '1+ Year', value: '1' },
                    { label: '2+ Years', value: '2' },
                    { label: '3+ Years', value: '3' },
                    { label: '5+ Years', value: '5' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        s.filterChip,
                        tempFilterExperience === option.value && s.filterChipActive,
                      ]}
                      onPress={() => setTempFilterExperience(option.value)}
                    >
                      <Text
                        style={[
                          s.filterChipText,
                          tempFilterExperience === option.value && s.filterChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Modal Actions */}
            <View style={s.modalFooterActions}>
              <TouchableOpacity
                style={s.filterResetBtn}
                onPress={() => {
                  setTempFilterHeight('any');
                  setTempFilterEducation('any');
                  setTempFilterExperience('any');
                }}
              >
                <Text style={s.filterResetText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.filterApplyBtn}
                onPress={() => {
                  setFilterHeight(tempFilterHeight);
                  setFilterEducation(tempFilterEducation);
                  setFilterExperience(tempFilterExperience);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text style={s.filterApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.screenPadding,
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
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  statsScroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    minWidth: 120,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  statValueText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
  },
  searchBarWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: 16,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderColor: Colors.secondary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  tabLabelActive: {
    color: Colors.onSurface,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
  },
  cardContainer: {
    marginBottom: 4,
  },
  candidateCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(195,198,208,0.2)',
    backgroundColor: '#F8FAFC',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  candidatePhone: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  gridItem: {
    width: '45%',
    gap: 4,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  salaryText: {
    fontWeight: '700',
  },
  interviewContent: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 8,
  },
  interviewSub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  viewScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewScheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderColor: 'rgba(195,198,208,0.2)',
  },
  addedByText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  addedByName: {
    fontWeight: '600',
  },
  moreVertBtn: {
    padding: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    zIndex: 60,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    zIndex: 100,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.outline,
    marginTop: 4,
  },
  searchSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.secondary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filterModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  filterModalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  filterResetBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  filterApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  filterApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
});
