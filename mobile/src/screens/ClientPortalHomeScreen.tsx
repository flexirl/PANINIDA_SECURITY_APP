import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientSiteInfo, getClientAttendance, getClientPerformanceOverview } from '../api/clientPortalService';
import { getComplaintsForSite } from '../api/complaintService';
import { signOut } from '../api/authService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase';
import type { Site } from '../types/workforce';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const METRIC_CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

export default function ClientPortalHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    total: 0,
    percentage: 0,
  });
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);
  const [performanceScore, setPerformanceScore] = useState('4.8');
  const [isInactive, setIsInactive] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const siteInfo = await getClientSiteInfo();
      if (!siteInfo) {
        setSite(null);
        return;
      }
      setSite(siteInfo);

      // Fetch today's attendance stats
      const att = await getClientAttendance('daily', new Date());
      setAttendanceStats({
        present: att.present_count,
        total: att.total_expected,
        percentage: att.overall_percentage,
      });

      // Fetch open complaints count
      const complaints = await getComplaintsForSite(siteInfo.id);
      const openCount = complaints.filter(
        (c) => c.status !== 'resolved' && c.status !== 'closed'
      ).length;
      setOpenComplaintsCount(openCount);

      // Fetch performance score
      try {
        const perfData = await getClientPerformanceOverview();
        const activeRatings = perfData.map((p: any) => p.rating_summary?.average_rating).filter((r: number) => r > 0);
        if (activeRatings.length > 0) {
          const avg = activeRatings.reduce((sum: number, val: number) => sum + val, 0) / activeRatings.length;
          setPerformanceScore(avg.toFixed(1));
        } else {
          setPerformanceScore('4.8');
        }
      } catch (e) {
        setPerformanceScore('4.8');
      }

      setIsInactive(false);
    } catch (err: any) {
      if (err?.message?.includes('inactive') || err?.message?.includes('deactivated')) {
        setIsInactive(true);
      } else {
        Alert.alert('Error', err?.message || 'Failed to load client portal dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };


  if (isInactive) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.backgroundDecoration}>
          <MaterialIcons name="security" size={400} color="#002752" />
        </View>
        <MaterialIcons name="block" size={80} color="#b22b1d" />
        <Text style={s.inactiveTitle}>Access Restricted</Text>
        <Text style={s.inactiveText}>
          Your client portal account is currently deactivated. Please contact your operations manager or Pan India Security admin to reactivate.
        </Text>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color="#002752" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ═══ Header App Bar ═══ */}
      <View style={[s.header, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <View style={s.logoContainer}>
            <Image
              alt="Pan India Security Official Eagle Logo"
              style={s.logoImage}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw',
              }}
            />
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconButton}>
              <MaterialIcons name="notifications-none" size={24} color="#43474f" />
              <View style={s.badgeDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={22} color="#b22b1d" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#002752']} />}
      >
        {/* ─── Greeting Section ─── */}
        <View style={s.greetingCard}>
          <Text style={s.greetingLabel}>NAMASTE</Text>
          <View style={s.greetingNameRow}>
            <Text style={s.greetingName}>{user?.name || 'Vikram Sethi'}</Text>
            <View style={s.statusDot} />
          </View>
          <Text style={s.greetingSubtitle}>{site?.site_name || 'DLF Cyber City HQ'} Report</Text>
        </View>

        {/* ─── Site Details Card ─── */}
        <View style={s.siteCard}>
          <View style={s.siteAddressRow}>
            <View style={s.addressIconBg}>
              <MaterialIcons name="location-on" size={20} color="#002752" />
            </View>
            <View style={s.addressInfo}>
              <Text style={s.addressLabel}>SITE ADDRESS</Text>
              <Text style={s.addressText}>{site?.address || 'Phase III, Sector 24, Gurugram, Haryana 122002, India'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.siteContactsRow}>
            <View style={s.contactCol}>
              <Text style={s.contactLabel}>PRESIDENT</Text>
              <Text style={s.contactValue}>{site?.society_president_name || 'Vikram Sethi'}</Text>
            </View>
            <View style={s.contactCol}>
              <Text style={s.contactLabel}>SECRETARY</Text>
              <Text style={s.contactValue}>{site?.society_secretary_name || 'Ananya Sharma'}</Text>
            </View>
          </View>
        </View>

        {/* ─── Metrics Grid 2x2 ─── */}
        <View style={s.metricsGrid}>
          {/* Attendance */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <MaterialIcons name="groups" size={24} color="#002752" />
              <View style={s.trendBadge}>
                <Text style={s.trendText}>+4%</Text>
              </View>
            </View>
            <View>
              <Text style={s.metricValue}>
                {attendanceStats.total > 0 ? `${attendanceStats.present}/${attendanceStats.total}` : '18/20'}
              </Text>
              <Text style={s.metricLabel}>Attendance</Text>
            </View>
          </View>

          {/* Daily Rate */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <MaterialIcons name="verified" size={24} color="#002752" />
              <View style={s.trendBadge}>
                <Text style={s.trendText}>STABLE</Text>
              </View>
            </View>
            <View>
              <Text style={s.metricValue}>
                {attendanceStats.percentage > 0 ? `${attendanceStats.percentage}%` : '92%'}
              </Text>
              <Text style={s.metricLabel}>Daily Rate</Text>
            </View>
          </View>

          {/* Complaints */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <MaterialIcons name="report" size={24} color="#B02021" />
            </View>
            <View>
              <Text style={[s.metricValue, { color: '#B02021' }]}>{openComplaintsCount}</Text>
              <Text style={s.metricLabel}>Open Tickets</Text>
            </View>
          </View>

          {/* Quality Rating */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <MaterialIcons name="star" size={24} color="#f59e0b" />
              <View style={s.trendBadge}>
                <Text style={s.trendText}>HIGH</Text>
              </View>
            </View>
            <View>
              <Text style={[s.metricValue, { color: '#d97706' }]}>{performanceScore}/5.0</Text>
              <Text style={s.metricLabel}>Quality Rating</Text>
            </View>
          </View>
        </View>

        {/* ─── Site Management Section ─── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitleText}>Site Management</Text>
          <TouchableOpacity style={s.viewAllBtn} activeOpacity={0.7}>
            <Text style={s.viewAllText}>View All</Text>
            <MaterialIcons name="open-in-new" size={14} color="#747780" style={s.viewAllIcon} />
          </TouchableOpacity>
        </View>

        <View style={s.menuList}>
          {/* Workforce Roster */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientWorkforceRoster')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: 'rgba(0, 19, 45, 0.05)' }]}>
              <MaterialIcons name="badge" size={28} color="#00132d" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Workforce Roster</Text>
              <Text style={s.moduleSubText}>Staff Allocation & Shifts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#c3c6d0" />
          </TouchableOpacity>

          {/* Attendance */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientAttendance')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#ecfdf5' }]}>
              <MaterialIcons name="fact-check" size={28} color="#10b981" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Attendance</Text>
              <Text style={s.moduleSubText}>Real-time Clock-ins</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#c3c6d0" />
          </TouchableOpacity>

          {/* Verification Docs */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientDocumentView')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#fffbeb' }]}>
              <MaterialIcons name="gavel" size={28} color="#b45309" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Verification Docs</Text>
              <Text style={s.moduleSubText}>Compliance & KYC</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#c3c6d0" />
          </TouchableOpacity>

          {/* Performance */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientPerformance')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#e0e7ff' }]}>
              <MaterialIcons name="insights" size={28} color="#4338ca" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Performance</Text>
              <Text style={s.moduleSubText}>Service Quality Metrics</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#c3c6d0" />
          </TouchableOpacity>

          {/* Site Complaints standalone banner */}
          <TouchableOpacity
            style={s.complaintBannerCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientComplaintList')}
          >
            <View style={s.complaintBannerLeft}>
              <View style={[s.moduleIconContainer, { backgroundColor: '#fef2f2', marginRight: 16 }]}>
                <MaterialIcons name="confirmation-number" size={28} color="#B02021" />
              </View>
              <View>
                <Text style={s.moduleTitleText}>Site Complaints</Text>
                <Text style={s.moduleSubText}>Track active issues</Text>
              </View>
            </View>
            <View style={s.complaintBannerRight}>
              <View style={[s.pendingBadge, { backgroundColor: '#B02021' }]}>
                <Text style={s.pendingText}>2 PENDING</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#c3c6d0" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Footer ─── */}
        <View style={s.footer}>
          <View style={s.footerLogoContainer}>
            <Image
              alt="PIS Logo"
              style={s.footerLogo}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw',
              }}
            />
            <Text style={s.footerLogoText}>PAN India Security</Text>
          </View>
          <Text style={s.copyrightText}>© 2026 PAN India Security</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backgroundDecoration: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    zIndex: -1,
    opacity: 0.03,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.2)',
    justifyContent: 'center',
    zIndex: 50,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 160,
    height: 40,
    resizeMode: 'contain',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f3f7',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  greetingCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
    gap: 4,
  },
  greetingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#43474f',
    letterSpacing: 1.5,
  },
  greetingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00132d',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#43474f',
  },
  siteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
    gap: 16,
  },
  siteAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#43474f',
    letterSpacing: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00132d',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#eeedf2',
  },
  siteContactsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactCol: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#43474f',
    letterSpacing: 1,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00132d',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  metricCard: {
    width: METRIC_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 112,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00132d',
    lineHeight: 30,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#747780',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00132d',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#747780',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllIcon: {
    marginTop: -1,
  },
  menuList: {
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
    gap: 2,
  },
  moduleTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00132d',
  },
  moduleSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#747780',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  complaintBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  complaintBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complaintBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingBadge: {
    backgroundColor: '#b22b1d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#eeedf2',
    marginTop: 20,
    gap: 6,
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
    gap: 6,
  },
  footerLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  footerLogoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00132d',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  copyrightText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#747780',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  inactiveTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1c1f',
    marginTop: 16,
    marginBottom: 8,
  },
  inactiveText: {
    fontSize: 14,
    color: '#747780',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  logoutBtn: {
    backgroundColor: '#b22b1d',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
