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
import { useAuth } from '../hooks/useAuth';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import Skeleton from '../components/Skeleton';
import * as inspectionService from '../api/inspectionService';
import SuccessModal from '../components/SuccessModal';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

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

      const defaultInspectionPhotos = [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAJUr_Ma8RcU9eeT5rmmVsK_rKVlIQKkrgOXDMboZqYcdbAJuSBsUMJprB_KgfABmXpqBWy0ddeIUuEP95UTz6Mydop2m3TUyxBnvdaWNp4mNkFtnzrVa1So745n-smzjokImbpigCK0meqjlQm632baDYK87Xv5GkVj_IjeFeZ553Fj8SVnL-vQp8gus3Fpn0f1PU5a02Z0wU5gRNi2KKx_QUSUQkNva7-TCsK4B_EPgj1KLbvHGOen2OaFCQpU4zT50Ruryf4sOw',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDDvjJzOnMKPN_h3fR2dN4Iarn9cJtC19uBY2bf0bx26UumBYfga4zJReTl9w_0Nb8hUc7s3PFPg8R38TjWYajQzGI9NWUpWAxkytjiBeeMwiobUpnExIxw4Irih507tfsO9I9p4ga36I0O_S_jwIW2VP3q9hO-jQfsS39Oh-VGq3D9Uev_-WeRhkbozaSs2E8xkIfT9XuQKja9SZZi5LH6Ro_yc38vyJ8dAeiQrZ_u6KApguM6c9kTIPqxCA75sCeDGGn3ei9VPto',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCi0wfXU37UuCJ6Qw8Asu-ABQBBlolJi-4IhrjGHRoVVjlnfHlMDMBJNAEQbzSoKSmPNSpMqPYenGv-nNAx4HvJtPyF7-RIsLDm1JRqgbDGz8KPNAWVmg7u6dirtm0FpOUhbcRFyYUHcC_4lxKC-pBGNd3uz6GdofZalumxsQWr1N-w_WepfLz74IVHquhHnhWtch6yitWJxT1D8a5NbU5PNfTxFq-fGxsf0z44UbCqNGeRvmE7QCOeUDFp7UQxKt6Un-zJdIA-RQo',
      ];

      const defaultIncidentPhotos = [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCIVdS9QBp5DGqFYfKXXVC7oT6iBzwOwaoRqI3KQjOiNUj-SyUPPMIks6mPraDk31MUfGl576tipty0v8NLvbuE4kueB_p6RK02AzH8oFdBSGVsfzeeBQXFUeOefd2H2NvxF5Bj1Hqn0Wlwi9Ins9DFVf0t5kSghhuzS17zSAlhQLHKlKRnR0WvMmWa3YaK-3HK-Of-dFY4B3YS9hmDwFzOQ9LPzniOWcu_Y7cJPZZVrHqwSVwqdZDDCJudNrDfA_ex036NPDNU2jA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB5UL3Fmff8BDWs6VLYf1zrQtPE66TjNwJWK4pb3jb7MWeHRi8fBSW8dkNC6ihMsEkaz5aTHNmKOm_c9sHG6Shx10fUjIon8GxG4UrxeNbeFxJN5HDAAp5jLFiZJJdukdanGNMgP99ORONH6m2LP3PdmrBUSVY6nwa1QlpILL1p-6V4JTQMPIlEt40zvZQpiOL5z32X2zARSRv8cAAI9Lg0LTb9gRgkP1VdzfuAs-LUUavQgL1Holxlhvt7toMYJF7ux_vTyNWEEVI',
      ];

      const allPhotos = r.photos && r.photos.length > 0 ? r.photos : defaultInspectionPhotos;
      const incidentPhotos = r.incident_reported ? defaultIncidentPhotos : [];
      const inspectionPhotos = allPhotos;
      const mapImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDry2exr_vqN_3PwIKVGcPRYM_FULO-H2RkOCkra9WLsl2IIEIid-c1XulNN30ll8XOTt1t-dhTthLsB3BrXwqUeTFeAlkDMElBUZdTK-suqWAB1Fmk3qb03K8amm6kOraHjVgbPxAdukC-VaAKjzFRndd1jueZjAxzczr2UEwt0g_0hFC57LBsaB3tPEDiC_-YEFoCKhrokWlMVPxTrXwjhsEQlnkzMwqupXnIF1Tf7fnOTnDZ4ntRZrdvwZLNd_NW2E9UAoHlH2E';

      setReport({
        id: r.id,
        siteName: r.sites?.site_name || 'Unknown Site',
        siteAddress: r.sites?.address || '',
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        inspectorName: r.inspector?.name || 'Unknown',
        gps: r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A',
        presentGuardsCount: 0,
        absentGuardsCount: 0,
        presentGuards: [],
        absentGuards: [],
        status: 'Completed',
        incidentLevel: 'none',
        remarks: r.remarks || 'No remarks provided',
        inspectionPhotos,
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
        <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

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
            <View style={[s.infoTextWrap, { gap: 12 }]}>
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

          {/* Remarks Section Skeleton */}
          <View style={s.remarksSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
    setSuccessMessage(`Report ${report.id} has been exported to PDF successfully.`);
    setOnSuccessClose(() => () => {});
    setShowSuccessModal(true);
  };

  const handleFlagReview = () => {
    setSuccessMessage(`Report ${report.id} has been flagged for senior operations review.`);
    setOnSuccessClose(() => () => {});
    setShowSuccessModal(true);
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
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

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
              <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle} numberOfLines={1}>
              Inspection Detail
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications" size={24} color={Colors.onPrimary} />
            </TouchableOpacity>
            <View style={[s.avatarSmall, { backgroundColor: 'transparent', borderWidth: 0 }]}>
              <Image
                source={{ uri: LOGO_URL }}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
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
          <View style={s.infoTextWrap}>
            <Text style={s.siteName}>{report.siteName}</Text>
            <View style={s.addressRow}>
              <MaterialIcons name="location-on" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
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

          <View style={s.divider} />

          {/* Stacked row for Inspector & GPS */}
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

        {/* ═══ Inspection Photos Gallery ═══ */}
        <View style={s.photosSection}>
          <Text style={s.sectionHeader}>
            <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
            {'  '}Inspection Photo
          </Text>
          <View style={s.photosGrid}>
            {report.inspectionPhotos && report.inspectionPhotos.length > 0 ? (
              <Image
                source={{ uri: report.inspectionPhotos[0] }}
                style={s.gridImage as any}
              />
            ) : (
              <Text style={{ color: Colors.outline }}>No photo uploaded</Text>
            )}
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
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

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

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    color: Colors.onPrimary,
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
    gap: 12,
  },
  infoTextWrap: {
    gap: 6,
  },
  siteName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    flex: 1,
  },
  visitDateBadge: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
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
    marginVertical: 4,
  },
  gridRow: {
    flexDirection: 'column',
    gap: 14,
  },
  gridCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
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
    flexDirection: 'column',
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
    width: '100%',
    height: 200,
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
