import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as attendanceService from '../api/attendanceService';
import * as siteService from '../api/siteService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - CARD_GAP) / 2;

const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi_f7HzWWUK3r9qVfk21NI-iLmMLqpi4ZX_0MZ3TUDwwDst5XCSXIrOmFPb8MMYlHKgupKpG2mQzLFt6RG4_qjUJtwkCwrnpy6JfTfaaULHZtWY7iq1YKMShFsaUG3rOUISRTpIRYgYpog-vmxaqPPa9RG4OolnfKt2pcTkoeetElgorqSvGVjRhBoPtGzpYuvCWwVtYVHSxXeBuJEss33fDNr5oWXeI9hT3Nyy2WJe45iQO0Tp0VRnzYYOXxhJJEg8HLbseKh2iA';
const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';
const MAP_MOCK = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';

export default function GuardHomeScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [siteDetails, setSiteDetails] = useState<any>(null);
  const [liveTime, setLiveTime] = useState('');

  // Stats
  const [presentCount, setPresentCount] = useState(0);

  const loadData = async () => {
    try {
      // Refresh profile to get latest user data (fixes stale closure)
      const freshProfile = await refreshProfile();
      const currentUser = freshProfile || user;

      // Fetch today's attendance record
      if (currentUser?.guard_id || currentUser?.workforce_personnel_id) {
        const personnelId = currentUser.workforce_personnel_id || currentUser.guard_id;
        const todayStr = new Date().toISOString().split('T')[0];
        try {
          const logs = await attendanceService.getAttendance({
            guard_id: personnelId,
            date: todayStr,
          });
          if (logs && logs.length > 0) {
            setTodayRecord(logs[0]);
          }
        } catch (err) {
          console.warn('Could not fetch today attendance:', err);
        }
      }

      // Load site details
      if (currentUser?.current_assignment?.site_id) {
        try {
          const site = await siteService.getSiteDetail(currentUser.current_assignment.site_id);
          setSiteDetails(site);
        } catch (err) {
          console.warn('Could not fetch site details:', err);
        }
      }

      // Compute attendance stats for current month
      if (currentUser?.guard_id || currentUser?.workforce_personnel_id) {
        const personnelId = currentUser.workforce_personnel_id || currentUser.guard_id;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = now.toISOString().split('T')[0];
        try {
          const monthLogs = await attendanceService.getAttendance({
            guard_id: personnelId,
          });
          if (monthLogs) {
            const present = monthLogs.filter((l: any) => {
              const isCurrentMonth = l.attendance_date >= monthStart && l.attendance_date <= monthEnd;
              return isCurrentMonth && (l.status === 'present' || l.check_in_time);
            }).length;
            setPresentCount(present);
          }
        } catch (err) {
          console.warn('Could not fetch monthly attendance stats:', err);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      setLiveTime(`${hours}:${minStr} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleCheckInOutPress = () => {
    navigation.navigate('GuardAttendance');
  };

  const navItems = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'attendance') {
      navigation.navigate('GuardAttendanceHistory');
    } else if (key === 'salary') {
      navigation.navigate('GuardSalarySlips');
    } else if (key === 'profile') {
      navigation.navigate('GuardProfile');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Fetching guard details...</Text>
      </View>
    );
  }

  const checkInTimeText = todayRecord?.check_in_time 
    ? new Date(todayRecord.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const checkOutTimeText = todayRecord?.check_out_time
    ? new Date(todayRecord.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';
  let statusText = 'Not Checked In';
  let buttonLabel = 'Check In Now';
  let buttonIcon: any = 'login';
  let statusColor = Colors.primary;

  if (todayRecord) {
    if (todayRecord.check_out_time) {
      statusText = 'Shift Complete';
      buttonLabel = 'Shift Complete';
      buttonIcon = 'check-circle' as const;
      statusColor = Colors.successGreen;
    } else {
      statusText = `Checked In at ${checkInTimeText}`;
      buttonLabel = 'Check Out Now';
      buttonIcon = 'logout' as const;
      statusColor = Colors.successGreen;
    }
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* ─── Greeting Section ─── */}
        <View style={s.greetingSection}>
          <Text style={s.greetingTitle}>Namaste, {user?.name ? user.name.split(' ')[0] : 'Guard'}</Text>
          <Text style={s.greetingSubtitle}>{siteDetails?.site_name || 'No Site Assigned'}</Text>
        </View>

        {/* ─── Simplified Current Site Card ─── */}
        <View style={s.currentSiteCard}>
          <View style={s.siteHeaderContainer}>
            <View style={s.siteIconContainer}>
              <MaterialIcons name="location-on" size={30} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.siteName} numberOfLines={1}>
                {siteDetails?.site_name || 'No Site Assigned'}
              </Text>
              <View style={s.shiftRow}>
                <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                <Text style={s.shiftTimeText}>
                  {user?.shift_type === 'night' ? '8 PM — 8 AM' : '8 AM — 8 PM'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              s.mainCheckInBtn,
              todayRecord?.check_out_time 
                ? s.mainCheckInBtnDisabled 
                : (todayRecord?.check_in_time ? s.mainCheckInBtnActive : s.mainCheckInBtnInactive)
            ]}
            onPress={handleCheckInOutPress}
            disabled={!!todayRecord?.check_out_time}
          >
            <MaterialIcons 
              name={todayRecord?.check_out_time ? 'check-circle' : (todayRecord?.check_in_time ? 'check-circle' : 'login')} 
              size={22} 
              color="#ffffff" 
            />
            <Text style={s.mainCheckInBtnText}>
              {todayRecord?.check_out_time 
                ? 'SHIFT COMPLETE' 
                : (todayRecord?.check_in_time ? 'CHECKED IN' : 'CHECK IN')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Simplified Stats Row ─── */}
        <View style={s.statsGridRow}>
          {/* Days Present Card */}
          <View style={s.statMiniCard}>
            <View style={s.statMiniCardHeader}>
              <View style={s.statMiniIconContainerBlue}>
                <MaterialIcons name="calendar-month" size={20} color={Colors.primary} />
              </View>
            </View>
            <Text style={s.statMiniLabel}>DAYS PRESENT</Text>
            <Text style={s.statMiniValue}>
              {presentCount}
              <Text style={s.statMiniValueSlash}>/22</Text>
            </Text>
          </View>

          {/* Earnings Card */}
          <View style={s.statMiniCard}>
            <View style={s.statMiniCardHeader}>
              <View style={s.statMiniIconContainerRed}>
                <MaterialIcons name="payments" size={20} color={Colors.secondary} />
              </View>
            </View>
            <Text style={s.statMiniLabel}>EARNINGS</Text>
            <Text style={s.earningsText}>
              Will be available at end of month
            </Text>
          </View>
        </View>

        {/* ─── Recent Activity Section ─── */}
        <View style={s.activitySection}>
          <View style={s.activityHeader}>
            <Text style={s.activityTitle}>Activity</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardAttendanceHistory')}
            >
              <Text style={s.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={s.activityListCard}>
            {/* Dynamic Today Activity */}
            {todayRecord ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={s.activityItem}
                onPress={() => navigation.navigate('GuardAttendanceHistory')}
              >
                <View style={s.activityItemLeft}>
                  <View style={[s.activityIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons 
                      name={todayRecord.check_out_time ? 'logout' : 'login'} 
                      size={20} 
                      color={Colors.primary} 
                    />
                  </View>
                  <View>
                    <Text style={s.activityItemTitle}>
                      {todayRecord.check_out_time ? 'Shift Check-out' : 'Shift Check-in'}
                    </Text>
                    <Text style={s.activityItemTime}>
                      Today, {todayRecord.check_out_time ? checkOutTimeText : checkInTimeText}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
              </TouchableOpacity>
            ) : null}

            {/* Static Item 2: Patrol Completed */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.activityItem}
              onPress={() => Alert.alert('Patrol Info', 'All checkpoints verified successfully.')}
            >
              <View style={s.activityItemLeft}>
                <View style={[s.activityIconCircle, { backgroundColor: '#e8f5e9' }]}>
                  <MaterialIcons name="verified-user" size={20} color={Colors.successGreen} />
                </View>
                <View>
                  <Text style={s.activityItemTitle}>Patrol Completed</Text>
                  <Text style={s.activityItemTime}>Yesterday, 4:30 PM</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
            </TouchableOpacity>

            {/* Static Item 3: Site Incident */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.activityItem}
              onPress={() => Alert.alert('Incident Info', 'Unauthorized parking reported at Gate 2.')}
            >
              <View style={s.activityItemLeft}>
                <View style={[s.activityIconCircle, { backgroundColor: '#ffebee' }]}>
                  <MaterialIcons name="report-problem" size={20} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={s.activityItemTitle}>Site Incident</Text>
                  <Text style={s.activityItemTime}>Oct 24, 11:15 AM</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Bottom Navigation Bar ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'home';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.outline,
    fontWeight: '600',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    gap: 20,
  },
  greetingSection: {
    marginBottom: 4,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  greetingSubtitle: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  currentSiteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: 24,
    gap: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  siteHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  siteIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  shiftTimeText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  mainCheckInBtn: {
    height: 64,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  mainCheckInBtnInactive: {
    backgroundColor: Colors.secondary,
  },
  mainCheckInBtnActive: {
    backgroundColor: Colors.successGreen,
  },
  mainCheckInBtnDisabled: {
    backgroundColor: '#7a818c',
  },
  mainCheckInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope',
    letterSpacing: 0.5,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statMiniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statMiniIconContainerBlue: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniIconContainerRed: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(176, 45, 33, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniTrendText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  statMiniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statMiniValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: 'Manrope',
    marginTop: 4,
  },
  statMiniValueSlash: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  earningsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter',
    marginTop: 6,
    lineHeight: 16,
  },
  activitySection: {
    gap: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Inter',
  },
  activityListCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.15)',
  },
  activityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Inter',
  },
  activityItemTime: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontFamily: 'Inter',
  },
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
    paddingHorizontal: 8,
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
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 39, 82, 0.15)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backBtn: {
    padding: 8,
    marginLeft: -4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
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
