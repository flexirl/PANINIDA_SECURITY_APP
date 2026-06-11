import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import Skeleton from '../components/Skeleton';
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
  incidentPhotos?: string[];
  inspectionPhotos?: string[];
  mapImage?: string;
}

export default function InspectionDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel } = usePersonnelCategory();
  const { reportId } = route.params || { reportId: '' };
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!reportId) {
      setError('No report ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await inspectionService.getInspectionDetail(reportId);
      const d = r.created_at ? new Date(r.created_at) : new Date();
      const presentNames = Array.isArray(r.guards_present) ? r.guards_present : [];
      const absentNames = Array.isArray(r.guards_absent) ? r.guards_absent : [];
      setReport({
        id: r.id,
        siteName: r.sites?.site_name || 'Unknown Site',
        siteAddress: r.sites?.address || '',
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
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
        inspectionPhotos: r.photos || [],
      });
    } catch (err: any) {
      console.error('Failed to fetch inspection detail:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

        {/* TopAppBar Skeleton */}
        <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <View style={s.topBarInner}>
            <View style={s.topBarLeft}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={s.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={s.topBarTitle}>Inspection Detail</Text>
            </View>
            <View style={s.topBarRight}>
              <View style={s.topBarIconBtn}>
                <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              </View>
              <View style={s.avatarSmall} />
            </View>
          </View>
        </View>

        <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Info Card Skeleton */}
          <View style={s.infoCard}>
            <View style={s.infoHeaderRow}>
              <View style={[s.infoTextWrap, { gap: 8 }]}>
                <Skeleton width="75%" height={22} />
                <View style={[s.addressRow, { gap: 6 }]}>
                  <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                  <Skeleton width="85%" height={14} />
                </View>
              </View>
              <View style={s.visitDateBadge}>
                <Skeleton width={80} height={28} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <Skeleton circle width={40} height={40} />
                <View style={{ gap: 4, flex: 1 }}>
                  <Skeleton width="40%" height={10} />
                  <Skeleton width="80%" height={14} />
                </View>
              </View>
              <View style={s.gridCell}>
                <Skeleton circle width={40} height={40} />
                <View style={{ gap: 4, flex: 1 }}>
                  <Skeleton width="40%" height={10} />
                  <Skeleton width="80%" height={14} />
                </View>
              </View>
            </View>
          </View>

          {/* Guard Verification Section Skeleton */}
          <View style={s.guardsRosterRow}>
            <View style={[s.guardPanel, s.panelPresent]}>
              <View style={[s.panelHeader, { gap: 6 }]}>
                <MaterialIcons name="check-circle" size={18} color={Colors.successGreen} />
                <Skeleton width="50%" height={14} />
              </View>
              <View style={[s.guardsListContainer, { gap: 8 }]}>
                <Skeleton width="90%" height={30} borderRadius={8} />
                <Skeleton width="80%" height={30} borderRadius={8} />
              </View>
            </View>

            <View style={[s.guardPanel, s.panelAbsent]}>
              <View style={[s.panelHeader, { gap: 6 }]}>
                <MaterialIcons name="cancel" size={18} color={Colors.error} />
                <Skeleton width="50%" height={14} />
              </View>
              <View style={[s.guardsListContainer, { gap: 8 }]}>
                <Skeleton width="85%" height={30} borderRadius={8} />
              </View>
            </View>
          </View>

          {/* Remarks Section Skeleton */}
          <View style={s.remarksSection}>
            <View style={[s.sectionHeader, { flexDirection: 'row', gap: 6 }]}>
              <MaterialIcons name="edit-note" size={20} color={Colors.primary} />
              <Skeleton width="40%" height={16} />
            </View>
            <View style={[s.remarksTextContainer, { height: 60, justifyContent: 'center' }]}>
              <Skeleton width="95%" height={14} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={14} />
            </View>

            <View style={s.actionRow}>
              <Skeleton width="100%" height={44} borderRadius={12} />
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <MaterialIcons name="error-outline" size={48} color={Colors.error} />
        <Text style={{ marginTop: 12, color: Colors.onSurfaceVariant, textAlign: 'center' }}>{error || 'Report not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleExport = () => {
    Alert.alert('Success', `Report ${report.id} has been exported to PDF successfully.`);
  };

  const handleFlagReview = () => {
    Alert.alert('Flagged for Review', `Report ${report.id} has been flagged for senior operations review.`);
  };

  const handleAddPhotoMock = () => {
    Alert.alert('Add Photo', 'Launch device camera to take inspection photos.');
  };

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

  const navItems = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'guards', icon: 'security', label: getLabel('plural') },
    { key: 'sites', icon: 'location-on', label: 'Sites' },
    { key: 'more', icon: 'menu', label: 'More' },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ TopAppBar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              aria-label="Back"
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle} numberOfLines={1}>
              Inspection Detail
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHToGvAcAzfgSk1nF58VzNZg0AoBcMWoSrVr7oKGVh88qf9Y8DVCXPeEWR_Rx86pXqgt9KoAQdg2uRi_RQF_cD98AucN0o4hA6AGiB6dfGVvkRECwa09mmg3exCDpw1U1aZ2bw8NIvbM2KqxGHCbdjNvaYUdTVtz18pBlYv8kI2NMA6oUEU3EUIynWdac-RG0xdPZCk7v02f5wfNByHgME5MwmCrEw51gjeRjMauzzFK_GB0pu5sr0tduwsQMqs5hlFR-Dw00OnaI' }}
                style={s.avatarSmallImage as any}
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
        {/* ═══ Site Info Section ═══ */}
        <View style={s.infoCard}>
          <View style={s.infoHeaderRow}>
            <View style={s.infoTextWrap}>
              <Text style={s.siteName}>{report.siteName}</Text>
              <View style={s.addressRow}>
                <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                <Text style={s.addressText}>{report.siteAddress}</Text>
              </View>
            </View>
            {/* Visit Date Badge */}
            <View style={s.visitDateBadge}>
              <MaterialIcons name="calendar-today" size={18} color={Colors.onPrimaryFixed} />
              <View style={s.visitDateTextWrap}>
                <Text style={s.visitDateLabel}>Date of Visit</Text>
                <Text style={s.visitDateValue}>{report.date}</Text>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Grid row for Inspector & GPS */}
          <View style={s.gridRow}>
            <View style={s.gridCell}>
              <View style={s.gridIconCircle}>
                <MaterialIcons name="person" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={s.gridLabel}>Inspector</Text>
                <Text style={s.gridVal}>{report.inspectorName}</Text>
              </View>
            </View>

            <View style={s.gridCell}>
              <View style={s.gridIconCircle}>
                <MaterialIcons name="explore" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={s.gridLabel}>GPS Coordinates</Text>
                <Text style={s.gridVal}>{report.gps}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ Guard Verification Section ═══ */}
        <View style={s.guardsRosterRow}>
          {/* Present Panel */}
          <View style={[s.guardPanel, s.panelPresent]}>
            <View style={s.panelHeader}>
              <MaterialIcons name="check-circle" size={18} color={Colors.successGreen} />
              <Text style={s.panelTitle}>Guards Present ({report.presentGuardsCount})</Text>
            </View>
            <View style={s.guardsListContainer}>
              {report.presentGuards.map((name, index) => (
                <View key={index} style={s.guardBadgePresent}>
                  <Text style={s.guardNamePresent}>{name}</Text>
                  <MaterialIcons name="verified" size={14} color={Colors.successGreen} />
                </View>
              ))}
              {report.presentGuards.length === 0 && (
                <Text style={s.emptyText}>No guards present.</Text>
              )}
            </View>
          </View>

          {/* Absent Panel */}
          <View style={[s.guardPanel, s.panelAbsent]}>
            <View style={s.panelHeader}>
              <MaterialIcons name="cancel" size={18} color={Colors.error} />
              <Text style={s.panelTitle}>Guards Absent ({report.absentGuardsCount})</Text>
            </View>
            <View style={s.guardsListContainer}>
              {report.absentGuards.map((name, index) => (
                <View key={index} style={s.guardBadgeAbsent}>
                  <Text style={s.guardNameAbsent}>{name}</Text>
                  <MaterialIcons name="close" size={14} color={Colors.error} />
                </View>
              ))}
              {report.absentGuards.length === 0 && (
                <Text style={s.emptyText}>No guards absent.</Text>
              )}
            </View>
          </View>
        </View>

        {/* ═══ Incident Details Card ═══ */}
        {report.incidentLevel !== 'none' && (
          <View style={s.incidentCard}>
            {/* Watermark Logo */}
            <View style={s.watermarkContainer}>
              <MaterialIcons name="report-problem" size={120} color="rgba(186,26,26,0.06)" />
            </View>

            <View style={s.incidentCardHeader}>
              <View style={s.severityBadge}>
                <Text style={s.severityBadgeText}>High Severity</Text>
              </View>
              <Text style={s.incidentTitle}>Unauthorized Entry Incident</Text>
            </View>

            <Text style={s.incidentDesc}>{report.incidentDesc}</Text>

            {/* Horizontal gallery for incident photos */}
            {report.incidentPhotos && report.incidentPhotos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.incidentPhotosScroll}
                contentContainerStyle={s.incidentPhotosContent}
              >
                {report.incidentPhotos.map((url, index) => (
                  <TouchableOpacity key={index} activeOpacity={0.9}>
                    <Image
                      source={{ uri: url }}
                      style={s.incidentPhoto as any}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ═══ Inspection Photos Gallery ═══ */}
        <View style={s.photosSection}>
          <Text style={s.sectionHeader}>
            <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
            {'  '}Inspection Photos
          </Text>
          <View style={s.photosGrid}>
            {report.inspectionPhotos && report.inspectionPhotos.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={s.gridImage as any}
              />
            ))}
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.addPhotoCell}
              onPress={handleAddPhotoMock}
            >
              <MaterialIcons name="add-a-photo" size={24} color={Colors.onSurfaceVariant} />
              <Text style={s.addPhotoText}>+12 More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Remarks Section ═══ */}
        <View style={s.remarksSection}>
          <Text style={s.sectionHeader}>
            <MaterialIcons name="edit-note" size={20} color={Colors.primary} />
            {'  '}Inspector Remarks
          </Text>
          <View style={s.remarksTextContainer}>
            <Text style={s.remarksText}>"{report.remarks}"</Text>
          </View>

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={s.exportBtn}
              onPress={handleExport}
            >
              <MaterialIcons name="download" size={20} color={Colors.onPrimary} />
              <Text style={s.exportBtnText}>Export Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={s.flagBtn}
              onPress={handleFlagReview}
            >
              <MaterialIcons name="warning" size={18} color={Colors.secondary} />
              <Text style={s.flagBtnText}>Flag for Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Map Section ═══ */}
        {report.mapImage && (
          <View style={s.mapContainer}>
            <Image
              source={{ uri: report.mapImage }}
              style={s.mapImage as any}
            />
            {/* Map Overlay and Pin */}
            <View style={s.mapOverlay} />
            <View style={s.mapPinContainer}>
              <MaterialIcons name="location-on" size={44} color={Colors.error} />
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  infoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextWrap: {
    flex: 1,
    gap: 6,
  },
  siteName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: -2,
  },
  addressText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  visitDateBadge: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitDateTextWrap: {
    flexDirection: 'column',
  },
  visitDateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onPrimaryFixed,
    textTransform: 'uppercase',
  },
  visitDateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimaryFixed,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardsRosterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  guardPanel: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 12,
  },
  panelPresent: {
    borderColor: 'rgba(39,174,96,0.3)',
  },
  panelAbsent: {
    borderColor: 'rgba(186,26,26,0.3)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardsListContainer: {
    gap: 8,
  },
  guardBadgePresent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  guardNamePresent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  guardBadgeAbsent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.errorContainer,
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  guardNameAbsent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  incidentCard: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.xl,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    gap: 12,
  },
  watermarkContainer: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.8,
  },
  incidentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  severityBadge: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onErrorContainer,
  },
  incidentDesc: {
    fontSize: 13,
    color: Colors.onErrorContainer,
    lineHeight: 18,
    zIndex: 2,
  },
  incidentPhotosScroll: {
    marginTop: 4,
  },
  incidentPhotosContent: {
    gap: 10,
    paddingRight: 10,
  },
  incidentPhoto: {
    width: 160,
    height: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.15)',
    backgroundColor: Colors.surfaceContainer,
  },
  photosSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridImage: {
    width: '48%',
    height: 100,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainer,
  },
  addPhotoCell: {
    width: '48%',
    height: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  remarksSection: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 12,
  },
  remarksTextContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 14,
    borderRadius: BorderRadius.lg,
  },
  remarksText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  exportBtn: {
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  flagBtn: {
    borderColor: Colors.secondary,
    borderWidth: 1.5,
    height: 44,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  flagBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  mapContainer: {
    height: 160,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,39,82,0.1)',
  },
  mapPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -22 }, { translateY: -44 }],
  },
});
