import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as workforcePersonnelService from '../api/workforcePersonnelService';
import * as siteAssignmentService from '../api/siteAssignmentService';
import * as siteService from '../api/siteService';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AssignGuardScreenProps {
  navigation: any;
  route?: any;
}

interface Personnel {
  id: string;
  name: string;
  phone: string;
  status: 'Available' | 'Deployed';
  avatar?: string;
  initials: string;
  categoryName?: string;
  currentSiteName?: string;
}

export default function AssignGuardScreen({ navigation, route }: AssignGuardScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  // Read params passed from Site Detail
  const routeSiteId = route?.params?.siteId;

  // State Variables
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<siteService.SiteProfile[]>([]);
  const [selectedSite, setSelectedSite] = useState<siteService.SiteProfile | null>(null);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  const [availableCount, setAvailableCount] = useState(0);
  const [deployedCount, setDeployedCount] = useState(0);

  // Animations
  const saveBtnScale = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPersonnelData, allSites] = await Promise.all([
        workforcePersonnelService.getPersonnel({ status: 'active' }),
        siteService.getSites(),
      ]);

      // Filter active sites
      const activeSites = allSites.filter((s) => s.is_active);
      setSites(activeSites);

      // Pre-select if siteId was passed in route params
      if (routeSiteId) {
        const found = activeSites.find((s) => s.id === routeSiteId);
        if (found) {
          setSelectedSite(found);
        }
      } else {
        setSelectedSite(null);
      }

      // Fetch all active site_assignments to know who is deployed where
      const { data: allAssignments } = await supabase
        .from('site_assignments')
        .select('personnel_id, site_id, sites(site_name)')
        .eq('is_active', true);

      const assignmentMap = new Map<string, { siteId: string; siteName: string }>();
      (allAssignments || []).forEach((a: any) => {
        assignmentMap.set(a.personnel_id, {
          siteId: a.site_id,
          siteName: a.sites?.site_name || 'Another Site',
        });
      });

      // Map ALL active personnel (deployed or not)
      let avail = 0;
      let deployed = 0;
      const mappedPersonnel: Personnel[] = allPersonnelData.map((p: any) => {
        const nameParts = (p.name || '').trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : (nameParts[0] || 'XX').substring(0, 2).toUpperCase();

        const assignment = assignmentMap.get(p.id);
        const isDeployed = !!assignment;
        if (isDeployed) deployed++;
        else avail++;

        return {
          id: p.id,
          name: p.name || 'Unknown',
          phone: (p.phone || '').startsWith('+91') ? p.phone : `+91 ${p.phone || ''}`,
          status: isDeployed ? 'Deployed' as const : 'Available' as const,
          avatar: p.photo_url || undefined,
          initials,
          categoryName: p.category?.name || '',
          currentSiteName: assignment?.siteName || undefined,
        };
      });

      setAllPersonnel(mappedPersonnel);
      setAvailableCount(avail);
      setDeployedCount(deployed);

    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Load Error', 'Failed to retrieve personnel or sites.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [routeSiteId])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAssign = () => {
    if (!selectedPersonnelId) {
      Alert.alert('Selection Required', 'Please select a personnel to assign.');
      return;
    }

    const selectedPerson = allPersonnel.find((p) => p.id === selectedPersonnelId);
    if (!selectedPerson) return;

    // Haptic bounce
    Animated.sequence([
      Animated.timing(saveBtnScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(saveBtnScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Build confirmation message with reassignment warning
    let confirmMessage = `Assign ${selectedPerson.name} to ${selectedSite?.site_name} for the ${selectedShift.toUpperCase()} shift?`;
    if (selectedPerson.status === 'Deployed' && selectedPerson.currentSiteName) {
      confirmMessage = `⚠️ ${selectedPerson.name} is currently deployed at "${selectedPerson.currentSiteName}".\n\nReassigning will remove them from that site.\n\nProceed with assignment to ${selectedSite?.site_name} (${selectedShift.toUpperCase()} shift)?`;
    }

    Alert.alert(
      selectedPerson.status === 'Deployed' ? 'Reassignment Warning' : 'Confirm Assignment',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: selectedPerson.status === 'Deployed' ? 'Reassign' : 'Confirm',
          style: selectedPerson.status === 'Deployed' ? 'destructive' : 'default',
          onPress: async () => {
            if (!selectedSite?.id) {
              Alert.alert('Error', 'Missing Site Reference.');
              return;
            }

            setLoading(true);
            try {
              await siteAssignmentService.assignPersonnelToSite({
                personnel_id: selectedPerson.id,
                site_id: selectedSite.id,
                shift_type: selectedShift,
              });

              Alert.alert(
                'Success',
                `✅ ${selectedPerson.name} successfully assigned to ${selectedSite.site_name}.`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (err: any) {
              setLoading(false);
              Alert.alert('Assignment Failed', err.message || 'Unable to complete shift assignment.');
            }
          },
        },
      ]
    );
  };

  // Filter Personnel List
  const filteredPersonnel = allPersonnel.filter((person) => {
    const query = searchQuery.toLowerCase();
    return (
      person.name.toLowerCase().includes(query) ||
      person.id.toLowerCase().includes(query) ||
      person.phone.includes(query) ||
      (person.categoryName || '').toLowerCase().includes(query)
    );
  });

  // Filter Sites List
  const filteredSites = sites.filter((site) => {
    const query = siteSearchQuery.toLowerCase();
    return (
      site.site_name.toLowerCase().includes(query) ||
      (site.client_name || '').toLowerCase().includes(query) ||
      site.address.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.outline, fontWeight: '600', fontSize: 14 }}>
          Loading personnel roster...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Assign Personnel</Text>
        </View>
        <View style={s.topBarRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.topBarIconBtn}
            onPress={() => navigation.navigate('NotificationCenter')}
          >
            <MaterialIcons name="notifications" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {selectedSite === null ? (
          /* Site Selection view */
          <View style={s.siteSelectionBlock}>
            <Text style={s.selectionTitle}>Select Target Site</Text>
            <View style={s.siteSearchWrapper}>
              <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Search active sites by name or client..."
                placeholderTextColor={Colors.outline}
                value={siteSearchQuery}
                onChangeText={setSiteSearchQuery}
              />
              {siteSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSiteSearchQuery('')} style={s.clearBtn}>
                  <MaterialIcons name="close" size={16} color={Colors.outline} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.sitesListContainer}>
              {filteredSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedSite(site);
                    setSelectedPersonnelId(null);
                  }}
                  style={s.siteRow}
                >
                  <View style={s.siteRowLeft}>
                    <View style={s.siteIconWrapper}>
                      <MaterialIcons name="business" size={22} color={Colors.onPrimary} />
                    </View>
                    <View style={s.siteRowInfo}>
                      <Text style={s.siteRowName} numberOfLines={1}>{site.site_name}</Text>
                      <Text style={s.siteRowClient} numberOfLines={1}>{site.client_name || 'Individual Client'}</Text>
                      <Text style={s.siteRowAddress} numberOfLines={1}>{site.address}</Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
                </TouchableOpacity>
              ))}

              {filteredSites.length === 0 && (
                <View style={s.emptyState}>
                  <MaterialIcons name="search-off" size={48} color={Colors.outlineVariant} />
                  <Text style={s.emptyTitle}>No matching sites found</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* Site Selected view (Shows details + Guard Selection) */
          <>
            {/* Site Info Header Card (Context) */}
            <Animated.View
              style={[
                s.contextCard,
                {
                  transform: [{ translateY: slideIn }],
                  opacity: fadeIn,
                },
              ]}
            >
              <View style={s.contextHeader}>
                <View style={s.locationIconWrapper}>
                  <MaterialIcons name="location-on" size={32} color={Colors.onPrimary} />
                </View>
                <View style={s.contextTexts}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[s.siteName, { flex: 1, paddingRight: 8 }]} numberOfLines={1}>
                      {selectedSite.site_name}
                    </Text>
                    {!routeSiteId && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedSite(null);
                          setSelectedPersonnelId(null);
                        }}
                        style={s.changeSiteBtn}
                      >
                        <Text style={s.changeSiteBtnText}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.clientNameLabel} numberOfLines={1}>
                    {(selectedSite.client_name || 'Individual Client').toUpperCase()}
                  </Text>
                  <View style={s.addressRow}>
                    <MaterialIcons name="map" size={14} color={Colors.outline} />
                    <Text style={s.addressText} numberOfLines={1}>
                      {selectedSite.address}
                    </Text>
                  </View>

                  <View style={s.highlightsRow}>
                    <View style={s.highlightBadge}>
                      <MaterialIcons name="shield" size={12} color={Colors.primary} />
                      <Text style={s.highlightBadgeText}>Active Site</Text>
                    </View>
                    <View style={s.highlightBadge}>
                      <MaterialIcons name="history" size={12} color={Colors.primary} />
                      <Text style={s.highlightBadgeText}>24/7 Monitoring</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Configuration Split Layout */}
            <View style={s.configContainer}>
              {/* Shift Type Selector */}
              <View style={s.shiftBox}>
                <Text style={s.boxTitle}>Shift Type</Text>
                <View style={s.shiftButtonsRow}>
                  {/* Day shift */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedShift('day')}
                    style={[
                      s.shiftBtn,
                      selectedShift === 'day' ? s.shiftBtnActive : s.shiftBtnInactive,
                    ]}
                  >
                    <MaterialIcons
                      name="wb-sunny"
                      size={20}
                      color={selectedShift === 'day' ? '#FFFFFF' : Colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        s.shiftBtnText,
                        selectedShift === 'day' ? s.shiftBtnTextActive : s.shiftBtnTextInactive,
                      ]}
                    >
                      Day Shift
                    </Text>
                  </TouchableOpacity>

                  {/* Night shift */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedShift('night')}
                    style={[
                      s.shiftBtn,
                      selectedShift === 'night' ? s.shiftBtnActive : s.shiftBtnInactive,
                    ]}
                  >
                    <MaterialIcons
                      name="brightness-3"
                      size={18}
                      color={selectedShift === 'night' ? '#FFFFFF' : Colors.onSurfaceVariant}
                      style={selectedShift === 'night' ? s.nightIconActive : undefined}
                    />
                    <Text
                      style={[
                        s.shiftBtnText,
                        selectedShift === 'night' ? s.shiftBtnTextActive : s.shiftBtnTextInactive,
                      ]}
                    >
                      Night Shift
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Guard Availability Summary Box */}
              <View style={s.availBox}>
                <Text style={s.boxTitle}>Deployments</Text>
                <View style={s.summaryList}>
                  <View style={s.summaryItem}>
                    <Text style={s.summaryLabel}>Available</Text>
                    <Text style={[s.summaryCount, { color: Colors.successGreen }]}>{availableCount}</Text>
                  </View>
                  <View style={[s.summaryItem, s.lastSummaryItem]}>
                    <Text style={s.summaryLabel}>Deployed</Text>
                    <Text style={[s.summaryCount, { color: Colors.primary }]}>{deployedCount}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Guard Selection list block */}
            <View style={s.guardsListBlock}>
              {/* Search Header */}
              <View style={s.searchHeader}>
                <View style={s.searchBarWrapper}>
                  <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search personnel by name or category..."
                    placeholderTextColor={Colors.outline}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearBtn}>
                      <MaterialIcons name="close" size={16} color={Colors.outline} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Columns Headers */}
                <View style={s.columnHeaders}>
                  <Text style={[s.columnHeaderText, { width: '50%' }]}>Personnel Profile</Text>
                  <Text style={[s.columnHeaderText, { width: '50%', textAlign: 'right' }]}>Category / Status</Text>
                </View>
              </View>

              {/* Scrollable list */}
              <View style={s.guardsListContainer}>
                {filteredPersonnel.map((person) => {
                  const isSelected = selectedPersonnelId === person.id;
                  const isAvailable = person.status === 'Available';
                  return (
                    <TouchableOpacity
                      key={person.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedPersonnelId(person.id)}
                      style={[
                        s.guardRow,
                        isSelected && s.guardRowSelected,
                      ]}
                    >
                      {/* Left Radio and Profile */}
                      <View style={s.guardRowLeft}>
                        <View style={[
                          s.radioButton,
                          isSelected && s.radioButtonActive
                        ]}>
                          {isSelected && <View style={s.radioDot} />}
                        </View>

                        <View style={s.guardProfileWrapper}>
                          <View style={s.guardAvatarWrapper}>
                            {person.avatar ? (
                              <Image source={{ uri: person.avatar }} style={s.guardAvatar} />
                            ) : (
                              <View style={{ flex: 1, backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{person.initials}</Text>
                              </View>
                            )}
                          </View>
                          <View style={s.guardInfoTexts}>
                            <Text style={s.guardName} numberOfLines={1}>
                              {person.name}
                            </Text>
                            <Text style={s.guardId}>{person.categoryName || 'Personnel'}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Status Badge + Current Site */}
                      <View style={s.guardRowRight}>
                        {person.currentSiteName && (
                          <Text style={[s.guardPhone, { fontSize: 10, color: Colors.outline }]} numberOfLines={1}>
                            @ {person.currentSiteName}
                          </Text>
                        )}
                        <View style={[
                          s.statusBadge,
                          isAvailable ? s.statusBadgeAvail : s.statusBadgeBuffer
                        ]}>
                          <Text style={[
                            s.statusBadgeText,
                            isAvailable ? s.statusBadgeTextAvail : s.statusBadgeTextBuffer
                          ]}>
                            {person.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {filteredPersonnel.length === 0 && (
                  <View style={s.emptyState}>
                    <MaterialIcons name="search-off" size={48} color={Colors.outlineVariant} />
                    <Text style={s.emptyTitle}>No personnel found</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ═══ Fixed Save Action Bar ═══ */}
      {selectedSite !== null && (
        <View style={[s.fixedActionBar, { bottom: Math.max(20, insets.bottom) }]}>
          <Animated.View style={{ transform: [{ scale: saveBtnScale }], width: '100%' }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAssign}
              style={s.assignBtn}
            >
              <MaterialIcons name="person-add" size={22} color="#FFFFFF" />
              <Text style={s.assignBtnText}>Assign Selected Personnel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    height: 56,
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
    borderRadius: BorderRadius.full,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
  },

  // ScrollContainer
  scrollContainer: {
    padding: 16,
    paddingBottom: 120,
  },

  // Context Card
  contextCard: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(195,198,208,0.3)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 20,
  },
  contextHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  locationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contextTexts: {
    flex: 1,
    gap: 2,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onPrimaryFixedVariant,
  },

  // Configuration Panel
  configContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shiftBox: {
    flex: 1.1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 14,
  },
  availBox: {
    flex: 0.9,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 14,
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  shiftButtonsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    padding: 3,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  shiftBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  shiftBtnActive: {
    backgroundColor: Colors.primaryContainer,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  shiftBtnInactive: {
    backgroundColor: 'transparent',
  },
  shiftBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  shiftBtnTextActive: {
    color: '#FFFFFF',
  },
  shiftBtnTextInactive: {
    color: Colors.onSurfaceVariant,
  },
  nightIconActive: {
    transform: [{ rotate: '-15deg' }],
  },

  // Guard summary list
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,208,0.2)',
    paddingBottom: 6,
  },
  lastSummaryItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  summaryCount: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Guard Selection List Box
  guardsListBlock: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchHeader: {
    padding: 16,
    backgroundColor: 'rgba(240, 243, 255, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },

  // Guard List rows
  guardsListContainer: {
    padding: 8,
    minHeight: 200,
  },
  guardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  guardRowSelected: {
    backgroundColor: 'rgba(26,61,109,0.06)',
    borderColor: Colors.outlineVariant,
  },
  guardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '50%',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: Colors.primaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryContainer,
  },
  guardProfileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guardAvatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  guardAvatar: {
    width: '100%',
    height: '100%',
  },
  guardInfoTexts: {
    gap: 1,
    flex: 1,
  },
  guardName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardId: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  guardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
  },
  guardPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    width: '63%',
    paddingLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    width: '37%',
    alignItems: 'center',
  },
  statusBadgeAvail: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  statusBadgeBuffer: {
    backgroundColor: Colors.errorContainer,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusBadgeTextAvail: {
    color: Colors.successGreen,
  },
  statusBadgeTextBuffer: {
    color: Colors.onErrorContainer,
  },

  // Fixed Bottom Button
  fixedActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(250,249,253,0.95)',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    alignItems: 'center',
    zIndex: 40,
  },
  assignBtn: {
    height: 52,
    width: '100%',
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  assignBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Site Selection Styles
  siteSelectionBlock: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 16,
  },
  siteSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  sitesListContainer: {
    gap: 8,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 14,
  },
  siteRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  siteIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteRowInfo: {
    flex: 1,
    gap: 2,
  },
  siteRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  siteRowClient: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  siteRowAddress: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  changeSiteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
  },
  changeSiteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  clientNameLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    color: Colors.outline,
  },
});
