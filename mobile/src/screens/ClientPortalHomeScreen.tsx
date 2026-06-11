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
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientSiteInfo, getClientAttendance } from '../api/clientPortalService';
import { getComplaintsForSite } from '../api/complaintService';
import { signOut } from '../api/authService';
import type { Site } from '../types/workforce';

export default function ClientPortalHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    total: 0,
    percentage: 0
  });
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);
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
        percentage: att.overall_percentage
      });

      // Fetch open complaints count
      const complaints = await getComplaintsForSite(siteInfo.id);
      const openCount = complaints.filter(
        c => c.status !== 'resolved' && c.status !== 'closed'
      ).length;
      setOpenComplaintsCount(openCount);
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
          <MaterialIcons name="security" size={400} color={Colors.primary} />
        </View>
        <MaterialIcons name="block" size={80} color={Colors.secondary} />
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 8) }]}>
      {/* Decorative Background Element */}
      <View style={s.backgroundDecoration} pointerEvents="none">
        <MaterialIcons name="security" size={480} color={Colors.primary} />
      </View>

      {/* Top App Bar & Context Info */}
      <View style={s.header}>
        {/* Brand Bar */}
        <View style={s.brandBar}>
          <View style={s.logoContainer}>
            <Image
              alt="Pan India Security Official Eagle Logo"
              style={s.logoImage}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw'
              }}
            />
            <Text style={s.brandText}>PIS</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconButton}>
              <MaterialIcons name="notifications" size={22} color={Colors.onSurfaceVariant} />
              <View style={s.badgeDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={20} color={Colors.secondary} />
              <Text style={s.logoutText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Context Bar */}
        <View style={s.contextBar}>
          <Text style={s.contextLabel}>CLIENT DASHBOARD</Text>
          <Text style={s.contextTitle} numberOfLines={1}>
            {site?.site_name || 'My Site'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Site Details Card */}
        {site && (
          <View style={s.siteCard}>
            <View style={s.siteAddressRow}>
              <View style={s.addressIconBg}>
                <MaterialIcons name="location-on" size={20} color={Colors.primary} />
              </View>
              <View style={s.addressInfo}>
                <Text style={s.addressLabel}>Site Address</Text>
                <Text style={s.addressText}>{site.address}</Text>
              </View>
            </View>
            <View style={s.siteContactsRow}>
              <View style={s.contactCol}>
                <Text style={s.contactLabel}>President</Text>
                <Text style={s.contactValue} numberOfLines={1}>
                  {site.society_president_name || 'Not Assigned'}
                </Text>
              </View>
              <View style={s.contactCol}>
                <Text style={s.contactLabel}>Secretary</Text>
                <Text style={s.contactValue} numberOfLines={1}>
                  {site.society_secretary_name || 'Not Assigned'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Metrics Row (Stacked Vertically for Premium Mobile Look) */}
        <View style={s.metricsSection}>
          {/* Attendance */}
          <View style={s.metricCard}>
            <View style={[s.metricIconContainer, { backgroundColor: Colors.primaryFixed }]}>
              <MaterialIcons name="groups" size={28} color={Colors.primary} />
            </View>
            <View style={s.metricInfo}>
              <Text style={s.metricValueText}>
                {attendanceStats.total > 0 ? `${attendanceStats.present}/${attendanceStats.total}` : '0/0'}
              </Text>
              <Text style={s.metricLabelText}>Attendance</Text>
            </View>
          </View>

          {/* Daily Rate */}
          <View style={s.metricCard}>
            <View style={[s.metricIconContainer, { backgroundColor: Colors.successGreen + '15' }]}>
              <MaterialIcons name="verified" size={26} color={Colors.successGreen} />
            </View>
            <View style={s.metricInfo}>
              <Text style={s.metricValueText}>{attendanceStats.percentage}%</Text>
              <Text style={s.metricLabelText}>Daily Rate</Text>
            </View>
          </View>

          {/* Complaints */}
          <View style={s.metricCard}>
            <View style={[s.metricIconContainer, { backgroundColor: Colors.secondaryFixed }]}>
              <MaterialIcons name="report" size={26} color={Colors.secondary} />
            </View>
            <View style={s.metricInfo}>
              <Text style={[s.metricValueText, { color: Colors.secondary }]}>
                {openComplaintsCount}
              </Text>
              <Text style={s.metricLabelText}>Open Complaints</Text>
            </View>
          </View>
        </View>

        {/* Site Management Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitleText}>Site Management</Text>
          <TouchableOpacity style={s.viewAllBtn}>
            <Text style={s.viewAllText}>View All Modules</Text>
            <MaterialIcons name="open-in-new" size={14} color={Colors.outline} style={s.viewAllIcon} />
          </TouchableOpacity>
        </View>

        <View style={s.menuList}>
          {/* Workforce Roster */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientWorkforceRoster')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: Colors.primaryFixed }]}>
              <MaterialIcons name="badge" size={28} color={Colors.primary} />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Workforce Roster</Text>
              <Text style={s.moduleSubText}>Staff Allocation & Shifts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
          </TouchableOpacity>

          {/* Attendance */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientAttendance')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="fact-check" size={28} color={Colors.successGreen} />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Attendance</Text>
              <Text style={s.moduleSubText}>Real-time Clock-ins</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
          </TouchableOpacity>

          {/* Verification Docs */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientDocumentView')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="gavel" size={28} color="#E65100" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Verification Docs</Text>
              <Text style={s.moduleSubText}>Compliance & KYC</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
          </TouchableOpacity>

          {/* Performance */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientPerformance')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#F3E5F5' }]}>
              <MaterialIcons name="insights" size={28} color="#7B1FA2" />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Performance</Text>
              <Text style={s.moduleSubText}>Service Quality Metrics</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
          </TouchableOpacity>

          {/* Complaint Tickets */}
          <TouchableOpacity
            style={s.moduleCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ClientComplaintList')}
          >
            <View style={[s.moduleIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <MaterialIcons name="confirmation-number" size={28} color={Colors.secondary} />
            </View>
            <View style={s.moduleInfo}>
              <Text style={s.moduleTitleText}>Site Complaint Tickets</Text>
              <Text style={s.moduleSubText}>Track and resolve active issues</Text>
            </View>
            {openComplaintsCount > 0 && (
              <View style={s.pendingBadge}>
                <Text style={s.pendingBadgeText}>{openComplaintsCount} PENDING</Text>
              </View>
            )}
            <MaterialIcons name="chevron-right" size={24} color={Colors.outline} style={s.chevronIcon} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerLogoContainer}>
            <Image
              alt="PIS Logo"
              style={s.footerLogo}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw'
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
    backgroundColor: Colors.background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  backgroundDecoration: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    zIndex: -1,
    opacity: 0.03
  },
  header: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingBottom: 16
  },
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoImage: {
    width: 32,
    height: 32,
    marginRight: 10,
    resizeMode: 'contain'
  },
  brandText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: -0.5
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    marginLeft: 8
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    marginLeft: 8
  },
  logoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '600',
    letterSpacing: 1
  },
  contextBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16
  },
  contextLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  contextTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 4
  },
  scrollContent: {
    padding: Spacing.screenPadding
  },
  siteCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 20,
    marginBottom: 20
  },
  siteAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  addressIconBg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  addressInfo: {
    flex: 1
  },
  addressLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  addressText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurface,
    fontWeight: '600',
    marginTop: 2
  },
  siteContactsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 16
  },
  contactCol: {
    flex: 1
  },
  contactLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  contactValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 2
  },
  metricsSection: {
    marginBottom: 24
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    marginBottom: 12
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  metricInfo: {
    flex: 1
  },
  metricValueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.primary,
    fontWeight: 'bold'
  },
  metricLabelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16
  },
  sectionTitleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold'
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2
  },
  viewAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  viewAllIcon: {
    marginLeft: 4
  },
  menuList: {
    marginBottom: 16
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    marginBottom: 12
  },
  moduleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  moduleInfo: {
    flex: 1
  },
  moduleTitleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: 'bold'
  },
  moduleSubText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4
  },
  pendingBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginRight: 8
  },
  pendingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onSecondary,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  chevronIcon: {
    color: Colors.outline
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    marginTop: 20
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
    marginBottom: 8
  },
  footerLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 6
  },
  footerLogoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: -0.5
  },
  copyrightText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  inactiveTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.onSurface,
    marginTop: 16,
    marginBottom: 8
  },
  inactiveText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24
  },
  logoutBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl
  },
  logoutBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.onSecondary,
    fontWeight: 'bold'
  }
});

