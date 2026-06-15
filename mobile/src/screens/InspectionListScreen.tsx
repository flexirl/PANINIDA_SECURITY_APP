import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as inspectionService from '../api/inspectionService';

interface InspectionReport {
  id: string;
  siteName: string;
  siteAddress: string;
  date: string;
  time: string;
  timestamp: string;
  inspectorName: string;
  gps: string;
  presentGuardsCount: number;
  absentGuardsCount: number;
  presentGuards: string[];
  absentGuards: string[];
  status: 'Completed' | 'Pending Review';
  incidentLevel: 'none' | 'minor' | 'high';
  remarks: string;
  incidentDesc?: string;
  photos: string[];
}

/** Maps backend InspectionRecord to screen's InspectionReport */
function mapToReport(r: inspectionService.InspectionRecord): InspectionReport {
  const d = r.created_at ? new Date(r.created_at) : new Date();
  const dateStr = d.toISOString().split('T')[0];
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const timestampStr = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${timeStr}`;
  const presentNames = Array.isArray(r.guards_present) ? r.guards_present : [];
  const absentNames = Array.isArray(r.guards_absent) ? r.guards_absent : [];
  return {
    id: r.id,
    siteName: r.sites?.site_name || 'Unknown Site',
    siteAddress: r.sites?.address || '',
    date: dateStr,
    time: timeStr,
    timestamp: timestampStr,
    inspectorName: r.inspector?.name || 'Unknown',
    gps: r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A',
    presentGuardsCount: presentNames.length,
    absentGuardsCount: absentNames.length,
    presentGuards: presentNames,
    absentGuards: absentNames,
    status: 'Completed',
    incidentLevel: r.incident_reported ? (r.incident_severity === 'high' || r.incident_severity === 'critical' ? 'high' : 'minor') : 'none',
    remarks: r.remarks || '',
    incidentDesc: r.incident_description,
    photos: r.photos || [],
  };
}

const SITE_OPTIONS = [
  'All Sites',
];

type IncidentFilter = 'all' | 'incident' | 'no-incident' | 'pending';

export default function InspectionListScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel } = usePersonnelCategory();
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChip, setActiveChip] = useState<IncidentFilter>('all');
  
  // Search Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSite, setSelectedSite] = useState('All Sites');
  const [isSitePickerVisible, setIsSitePickerVisible] = useState(false);

  // Search Application State
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedSite, setAppliedSite] = useState('All Sites');

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);

  // Fetch inspections from backend
  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inspectionService.getInspections();
      setReports(data.map(mapToReport));
    } catch (err: any) {
      console.error('Failed to fetch inspections:', err);
      setError(err.message || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, []);

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'guards') {
      navigation.navigate('GuardList');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleApplyFilters = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedSite(selectedSite);
    Alert.alert('Filters Applied', 'Inspection reports list has been filtered.');
  };

  // Dynamic filter logic
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      // 1. Chip filter
      if (activeChip === 'incident' && rep.incidentLevel === 'none') return false;
      if (activeChip === 'no-incident' && rep.incidentLevel !== 'none') return false;
      if (activeChip === 'pending' && rep.status !== 'Pending Review') return false;

      // 2. Site filter
      if (appliedSite !== 'All Sites') {
        const query = appliedSite.toLowerCase().split(' - ')[0];
        if (!rep.siteName.toLowerCase().includes(query)) return false;
      }

      // 3. Date range filters
      if (appliedFromDate && rep.date < appliedFromDate) return false;
      if (appliedToDate && rep.date > appliedToDate) return false;

      return true;
    });
  }, [reports, activeChip, appliedFromDate, appliedToDate, appliedSite]);

  const openDetails = (report: InspectionReport) => {
    navigation.navigate('InspectionDetail', { reportId: report.id });
  };

  const getIncidentBadge = (level: InspectionReport['incidentLevel']) => {
    switch (level) {
      case 'high':
        return {
          label: 'High Incident',
          bg: '#FEE2E2',
          text: '#BA1A1A',
          icon: 'warning',
        };
      case 'minor':
        return {
          label: 'Minor Incident',
          bg: '#FEF3C7',
          text: '#B45309',
          icon: 'report',
        };
      case 'none':
        return {
          label: 'No Incidents',
          bg: '#D1FAE5',
          text: '#065F46',
          icon: 'verified',
        };
    }
  };

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
            <Text style={s.topBarTitle} numberOfLines={1}>
              Inspections
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZGQQYMOnhjw24-o4h0v6-33nocj0vn9NBS8e_LqLsJevDxIyw2-JqOatBHqi1oKh8zaxYVVMvHZpZDZdPuS-MAMzfd86DwqUfDJpNENkrAbAhyj3VM4OS_cmReEGe9xMNzxEuQzxlaMKzhETyxlnEpqJLImco0PzhT-Q6fsLK9Lw9OqrClNaTNtjwlelBodKKT9sSE5Uk4zBzsTKNxcNNbuUJi2owu3geCbECqXzmewq7y2oT-AAXUQxf2OQmYRVJCVOJTBc6gZI' }}
                style={s.avatarSmallImage}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Filters Section ─── */}
        <View style={s.filtersCard}>
          <View style={s.dateInputsRow}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>From Date</Text>
              <View style={s.inputContainer}>
                <TextInput
                  style={s.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.outline}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
                <MaterialIcons name="event" size={18} color={Colors.outline} />
              </View>
            </View>

            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>To Date</Text>
              <View style={s.inputContainer}>
                <TextInput
                  style={s.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.outline}
                  value={toDate}
                  onChangeText={setToDate}
                />
                <MaterialIcons name="event" size={18} color={Colors.outline} />
              </View>
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Site Filter</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.dropdownBtn}
              onPress={() => setIsSitePickerVisible(true)}
            >
              <Text style={s.dropdownBtnText}>{selectedSite}</Text>
              <MaterialIcons name="expand-more" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={s.applyBtn}
            onPress={handleApplyFilters}
          >
            <MaterialIcons name="search" size={20} color="#FFFFFF" />
            <Text style={s.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Chips Scroll ─── */}
        <View style={s.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsScroll}
          >
            {[
              { key: 'all', label: 'All Inspections' },
              { key: 'incident', label: 'With Incidents' },
              { key: 'no-incident', label: 'No Incidents' },
              { key: 'pending', label: 'Pending Review' },
            ].map((chip) => {
              const isActive = activeChip === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  activeOpacity={0.7}
                  onPress={() => setActiveChip(chip.key as any)}
                  style={[s.chip, isActive && s.chipActive]}
                >
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Recent Reports Header ─── */}
        <Text style={s.sectionHeader}>Recent Reports</Text>

        {/* ─── Reports Cards List ─── */}
        <View style={s.reportsList}>
          {filteredReports.length > 0 ? (
            filteredReports.map((item) => {
              const badge = getIncidentBadge(item.incidentLevel);
              return (
                <View key={item.id} style={s.reportCard}>
                  <View style={s.cardHeaderRow}>
                    <View style={s.headerInfo}>
                      <Text style={s.cardTitle}>{item.siteName}</Text>
                      <Text style={s.cardTime}>
                        <MaterialIcons name="event" size={13} color={Colors.onSurfaceVariant} />{' '}
                        {item.timestamp}
                      </Text>
                    </View>
                    <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
                      <MaterialIcons name={badge.icon as any} size={14} color={badge.text} />
                      <Text style={[s.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={s.summaryGrid}>
                    <View style={s.gridCell}>
                      <Text style={s.cellLabel}>Inspector</Text>
                      <Text style={s.cellValue}>{item.inspectorName}</Text>
                    </View>
                    <View style={s.gridCell}>
                      <Text style={s.cellLabel}>Present</Text>
                      <Text style={[s.cellValue, { color: Colors.primary }]}>
                        {item.presentGuardsCount} Guards
                      </Text>
                    </View>
                    <View style={s.gridCell}>
                      <Text style={s.cellLabel}>Absent</Text>
                      <Text
                        style={[
                          s.cellValue,
                          item.absentGuardsCount > 0 && { color: Colors.secondary },
                        ]}
                      >
                        {String(item.absentGuardsCount).padStart(2, '0')} Guards
                      </Text>
                    </View>
                    <View style={s.gridCell}>
                      <Text style={s.cellLabel}>Status</Text>
                      <Text style={s.cellValue}>{item.status}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={s.detailsBtn}
                    onPress={() => openDetails(item)}
                  >
                    <Text style={s.detailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="search-off" size={56} color={Colors.outlineVariant} />
              <Text style={s.emptyTitle}>No inspection reports found</Text>
              <Text style={s.emptySubtitle}>Try adjusting filters or categories</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Issue/Add Inspection FAB ═══ */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={s.fab}
        onPress={() => Alert.alert('Create Inspection', 'Incident logging dashboard is coming soon.')}
      >
        <MaterialIcons name="add" size={32} color={Colors.onSecondary} />
      </TouchableOpacity>

      {/* ═══ Site Selection Dropdown Modal ═══ */}
      <Modal
        visible={isSitePickerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSitePickerVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsSitePickerVisible(false)}
        >
          <View style={s.sitePickerContent}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Site</Text>
              <TouchableOpacity onPress={() => setIsSitePickerVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SITE_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.pickerOption}
                  onPress={() => {
                    setSelectedSite(item);
                    setIsSitePickerVisible(false);
                  }}
                >
                  <Text style={s.pickerOptionText}>{item}</Text>
                  {selectedSite === item && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Inspection Details Modal (ADM-019) ═══ */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={s.detailBackdrop}>
          {selectedReport && (
            <View style={s.detailContainer}>
              {/* Header */}
              <View style={s.detailHeader}>
                <View style={s.detailHeaderLeft}>
                  <Text style={s.detailTitle}>{selectedReport.siteName}</Text>
                  <Text style={s.detailAddress} numberOfLines={2}>
                    {selectedReport.siteAddress}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={s.closeBtn}>
                  <MaterialIcons name="close" size={24} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={s.detailScroll}
                contentContainerStyle={s.detailScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Meta details */}
                <View style={s.metaRow}>
                  <View style={s.metaCol}>
                    <Text style={s.metaLabel}>Inspector Name</Text>
                    <Text style={s.metaVal}>{selectedReport.inspectorName}</Text>
                  </View>
                  <View style={s.metaCol}>
                    <Text style={s.metaLabel}>Submitted Time</Text>
                    <Text style={s.metaVal}>{selectedReport.timestamp}</Text>
                  </View>
                </View>
                <View style={s.gpsRow}>
                  <MaterialIcons name="location-on" size={16} color={Colors.secondary} />
                  <Text style={s.gpsText}>Submitted from: {selectedReport.gps}</Text>
                </View>

                {/* Guard Verification Lists */}
                <View style={s.guardSection}>
                  <Text style={s.sectionSubTitle}>Guard Verification Roster</Text>
                  
                  {/* Present Guards */}
                  <View style={s.guardGroup}>
                    <Text style={s.guardGroupLabel}>
                      Present ({selectedReport.presentGuardsCount})
                    </Text>
                    {selectedReport.presentGuards.length > 0 ? (
                      selectedReport.presentGuards.map((name, index) => (
                        <View key={index} style={s.guardItem}>
                          <MaterialIcons name="check" size={18} color="#27AE60" />
                          <Text style={s.guardName}>{name}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={s.emptyGuardsText}>No guards verified as present.</Text>
                    )}
                  </View>

                  {/* Absent Guards */}
                  <View style={s.guardGroup}>
                    <Text style={[s.guardGroupLabel, { color: Colors.secondary }]}>
                      Absent ({selectedReport.absentGuardsCount})
                    </Text>
                    {selectedReport.absentGuards.length > 0 ? (
                      selectedReport.absentGuards.map((name, index) => (
                        <View key={index} style={s.guardItem}>
                          <MaterialIcons name="close" size={18} color={Colors.secondary} />
                          <Text style={[s.guardName, { color: Colors.secondary }]}>
                            {name}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={s.emptyGuardsText}>No guards absent.</Text>
                    )}
                  </View>
                </View>

                {/* Remarks */}
                <View style={s.remarksSection}>
                  <Text style={s.sectionSubTitle}>Remarks</Text>
                  <Text style={s.remarksText}>"{selectedReport.remarks}"</Text>
                </View>

                {/* Incident Details Card */}
                {selectedReport.incidentLevel !== 'none' && (
                  <View style={[
                    s.incidentCard,
                    selectedReport.incidentLevel === 'high' ? s.incidentCardHigh : s.incidentCardMinor
                  ]}>
                    <View style={s.incidentHeader}>
                      <MaterialIcons
                        name={selectedReport.incidentLevel === 'high' ? 'warning' : 'report'}
                        size={18}
                        color={selectedReport.incidentLevel === 'high' ? Colors.secondary : '#B45309'}
                      />
                      <Text style={[
                        s.incidentTitleText,
                        { color: selectedReport.incidentLevel === 'high' ? Colors.secondary : '#B45309' }
                      ]}>
                        {selectedReport.incidentLevel === 'high' ? 'HIGH INCIDENT DETAILS' : 'MINOR INCIDENT DETAILS'}
                      </Text>
                    </View>
                    <Text style={s.incidentDesc}>{selectedReport.incidentDesc}</Text>
                  </View>
                )}

                {/* Photos */}
                {selectedReport.photos.length > 0 && (
                  <View style={s.photosSection}>
                    <Text style={s.sectionSubTitle}>Attachments / Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosGallery}>
                      {selectedReport.photos.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={s.galleryImage} />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'more';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <MaterialIcons
                name={item.icon as any}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  topBar: {
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
    gap: 8,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    letterSpacing: 1.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    borderWidth: 1.5,
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
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackLg,
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 44,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 44,
    paddingHorizontal: 12,
  },
  dropdownBtnText: {
    fontSize: 13,
    color: Colors.onSurface,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  chipsWrapper: {
    marginTop: -4,
    marginBottom: -4,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: Colors.onPrimaryContainer,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: -8,
  },
  reportsList: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    rowGap: 10,
  },
  gridCell: {
    width: '50%',
    gap: 2,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  detailsBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.outline,
  },
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 16,
    backgroundColor: Colors.secondaryContainer, // theme red-orange: #fe624e
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.secondaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 70,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sitePickerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '50%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  detailHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  detailAddress: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 16,
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.outline,
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
  },
  gpsText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  guardSection: {
    gap: 12,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingBottom: 6,
  },
  guardGroup: {
    gap: 8,
    marginBottom: 8,
  },
  guardGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27AE60',
    textTransform: 'uppercase',
  },
  guardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  guardName: {
    fontSize: 13,
    color: Colors.onSurface,
  },
  emptyGuardsText: {
    fontSize: 12,
    color: Colors.outline,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  remarksSection: {
    gap: 8,
  },
  remarksText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  incidentCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
    borderLeftWidth: 4,
  },
  incidentCardHigh: {
    backgroundColor: '#FEF2F2',
    borderColor: Colors.outlineVariant,
    borderLeftColor: Colors.secondary,
  },
  incidentCardMinor: {
    backgroundColor: '#FFFBEB',
    borderColor: Colors.outlineVariant,
    borderLeftColor: '#B45309',
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incidentTitleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  incidentDesc: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  photosSection: {
    gap: 10,
  },
  photosGallery: {
    flexDirection: 'row',
  },
  galleryImage: {
    width: 140,
    height: 100,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: Colors.surfaceContainer,
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
});
