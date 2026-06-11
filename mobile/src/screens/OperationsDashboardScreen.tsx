import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getOperationsDashboardData, ManagedSiteDashboardData } from '../api/operationsService';
import { signOut } from '../api/authService';

export default function OperationsDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEscalated, setTotalEscalated] = useState(0);
  const [managedSites, setManagedSites] = useState<ManagedSiteDashboardData[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getOperationsDashboardData();
      setManagedSites(data.managedSites);
      setTotalEscalated(data.totalEscalatedComplaintsCount);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.message || 'Failed to load operations dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to logout.');
    }
  };

  const renderHeader = () => (
    <View style={s.dashboardHeader}>
      <View style={s.welcomeSection}>
        <Text style={s.welcomeText}>Welcome Back,</Text>
        <Text style={s.roleText}>Operations Manager</Text>
      </View>

      {/* Escalated Complaints Summary Panel */}
      <TouchableOpacity
        style={s.escalationSummaryCard}
        onPress={() => navigation.navigate('EscalatedComplaints')}
        activeOpacity={0.8}
      >
        <View style={s.escalationInfo}>
          <Text style={s.escalationTitle}>Escalated Complaints</Text>
          <Text style={s.escalationSubtitle}>Level 2 & 3 tickets needing resolution</Text>
        </View>
        <View style={[s.badgeContainer, totalEscalated > 0 ? s.badgeActive : s.badgeInactive]}>
          <Text style={s.badgeText}>{totalEscalated}</Text>
        </View>
      </TouchableOpacity>

      <Text style={s.sectionHeader}>My Managed Sites</Text>
    </View>
  );

  const renderSiteCard = ({ item }: { item: ManagedSiteDashboardData }) => (
    <TouchableOpacity
      style={s.siteCard}
      onPress={() => navigation.navigate('SiteDashboard', { siteId: item.site.id })}
      activeOpacity={0.7}
    >
      <View style={s.siteCardHeader}>
        <View style={s.siteNameContainer}>
          <MaterialIcons name="business" size={24} color={Colors.primary} />
          <Text style={s.siteName} numberOfLines={1}>
            {item.site.site_name}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
      </View>

      <Text style={s.siteAddress} numberOfLines={2}>
        {item.site.address}
      </Text>

      <View style={s.divider} />

      <View style={s.metricsRow}>
        <View style={s.metricCol}>
          <MaterialIcons name="people" size={18} color={Colors.primaryContainer} />
          <Text style={s.metricLabel}>Workforce</Text>
          <Text style={s.metricValue}>{item.workforceCount}</Text>
        </View>

        <View style={s.metricCol}>
          <MaterialIcons
            name="error-outline"
            size={18}
            color={item.vacancyCount > 0 ? Colors.dangerRed : Colors.successGreen}
          />
          <Text style={s.metricLabel}>Vacancies</Text>
          <Text style={[s.metricValue, item.vacancyCount > 0 && s.textDanger]}>
            {item.vacancyCount}
          </Text>
        </View>

        <View style={s.metricCol}>
          <MaterialIcons
            name="warning"
            size={18}
            color={item.escalatedComplaintCount > 0 ? Colors.warningAmber : Colors.outline}
          />
          <Text style={s.metricLabel}>Escalated</Text>
          <Text style={[s.metricValue, item.escalatedComplaintCount > 0 && s.textWarning]}>
            {item.escalatedComplaintCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={s.emptyContainer}>
      <MaterialIcons name="business-center" size={60} color={Colors.outlineVariant} />
      <Text style={s.emptyTitle}>No Managed Sites</Text>
      <Text style={s.emptySubtitle}>
        You are not assigned as the site manager for any active sites. Contact your administrator.
      </Text>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Navbar */}
      <View style={s.navbar}>
        <Text style={s.navbarTitle}>Pan India Security</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Loading Dashboard...</Text>
        </View>
      ) : (
        <FlatList
          data={managedSites}
          renderItem={renderSiteCard}
          keyExtractor={(item) => item.site.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  navbarTitle: {
    ...Typography.h2,
    color: Colors.primary,
  },
  logoutBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.outline,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.stackLg,
  },
  dashboardHeader: {
    marginTop: Spacing.stackMd,
  },
  welcomeSection: {
    marginBottom: Spacing.stackMd,
  },
  welcomeText: {
    ...Typography.body,
    color: Colors.outline,
  },
  roleText: {
    ...Typography.h1,
    color: Colors.primary,
  },
  escalationSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    padding: Spacing.stackMd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.stackLg,
  },
  escalationInfo: {
    flex: 1,
    marginRight: 8,
  },
  escalationTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.onBackground,
  },
  escalationSubtitle: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  badgeContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: Colors.secondary,
  },
  badgeInactive: {
    backgroundColor: Colors.outlineVariant,
  },
  badgeText: {
    ...Typography.bodyBold,
    color: Colors.onPrimary,
  },
  sectionHeader: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.stackSm,
  },
  siteCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: Spacing.stackMd,
    marginBottom: Spacing.stackMd,
    elevation: 1,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  siteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  siteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  siteName: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.primary,
  },
  siteAddress: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginLeft: 32,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
  },
  metricValue: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.primary,
  },
  textDanger: {
    color: Colors.dangerRed,
  },
  textWarning: {
    color: Colors.warningAmber,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.outline,
    marginTop: 12,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
});
