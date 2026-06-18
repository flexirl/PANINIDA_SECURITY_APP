import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as dashboardService from '../api/dashboardService';
import * as attendanceService from '../api/attendanceService';
import { supabase } from '../api/supabase';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface RealTimeAttendanceScreenProps {
  navigation: any;
  route: any;
}

export default function RealTimeAttendanceScreen({ navigation }: RealTimeAttendanceScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, totalPct: 0, missingSites: 0, avgDelay: 0 });
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [criticalAbsentees, setCriticalAbsentees] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const todayStr = getTodayDateString();
        const overviewData = await dashboardService.getDashboardOverview([]).catch(() => ({ guards: { total: 0 } }));
        
        // Fetch today and past 2 days to check for 3 consecutive days of absence
        const d1 = new Date(); d1.setDate(d1.getDate() - 1);
        const day1Str = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
        
        const d2 = new Date(); d2.setDate(d2.getDate() - 2);
        const day2Str = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;

        const [allAttendanceRecords, day1Records, day2Records, locationPings] = await Promise.all([
          attendanceService.getAttendance({ date: todayStr }).catch(() => []),
          attendanceService.getAttendance({ date: day1Str }).catch(() => []),
          attendanceService.getAttendance({ date: day2Str }).catch(() => []),
          supabase.from('attendance_location_pings')
            .select(`*, personnel:workforce_personnel(name), site:sites(site_name)`)
            .gte('created_at', `${todayStr}T00:00:00.000Z`)
            .order('created_at', { ascending: false })
            .then(res => res.data || []).catch(() => [])
        ]);
        
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;

        const mappedFeed: any[] = [];
        const absentees: any[] = [];

        // Track absence history per guard
        const absenceHistory: Record<string, { today: boolean; day1: boolean; day2: boolean; guardName: string; site: string }> = {};

        // Helper to mark absences
        const markAbsence = (records: any[], dayKey: 'today' | 'day1' | 'day2') => {
          records.forEach((r: any) => {
            if (r.status === 'absent') {
              if (!absenceHistory[r.guard_id]) {
                absenceHistory[r.guard_id] = {
                  today: false, day1: false, day2: false,
                  guardName: r.guards?.name || r.personnel?.name || 'Unknown Guard',
                  site: r.sites?.site_name || 'Assigned Site'
                };
              }
              absenceHistory[r.guard_id][dayKey] = true;
            }
          });
        };

        markAbsence(allAttendanceRecords, 'today');
        markAbsence(day1Records, 'day1');
        markAbsence(day2Records, 'day2');

        // Check for 3 consecutive days
        Object.keys(absenceHistory).forEach(guardId => {
          const hist = absenceHistory[guardId];
          if (hist.today && hist.day1 && hist.day2) {
            absentees.push({
              id: guardId,
              name: hist.guardName,
              role: 'SECURITY PERSONNEL',
              shift: '08:00 AM', // Default/placeholder
              site: hist.site
            });
          }
        });

        // Count unique sites with absentees today
        const absentSiteIds = new Set();

        allAttendanceRecords.forEach((record: any) => {
          if (record.status === 'present') presentCount++;
          else if (record.status === 'present_late') { presentCount++; lateCount++; }
          else if (record.status === 'late') lateCount++;
          else if (record.status === 'absent') {
            absentCount++;
            if (record.site_id) absentSiteIds.add(record.site_id);
          }

          const guardName = record.guards?.name || record.personnel?.name || 'Unknown Guard';
          const role = 'SECURITY PERSONNEL';
          const site = record.sites?.site_name || 'Assigned Site';
          const avatarUrl = record.check_in_selfie || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guardName) + '&background=random';

          const formatTime = (t: string) => {
            try {
              return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) { return 'Scheduled'; }
          };

          if (record.check_in_time) {
            // Check-in Event
            let inLabel = 'IN (ON-TIME)';
            let inColor = '#10B981';
            if (record.status === 'late' || record.status === 'present_late') { 
              inLabel = 'IN (LATE)'; 
              inColor = Colors.secondaryContainer; 
            }

            mappedFeed.push({
              id: `${record.id}_in`,
              name: guardName,
              role: role,
              site: site,
              rawTime: new Date(record.check_in_time).getTime(),
              time: formatTime(record.check_in_time),
              status: inLabel,
              avatar: avatarUrl,
              statusColor: inColor,
            });

            // Check-out Event
            if (record.check_out_time) {
              let outLabel = 'OUT (FULL)';
              let outColor = '#10B981';
              if (record.status === 'half_day') { 
                outLabel = 'OUT (HALF)'; 
                outColor = '#F59E0B'; 
              } else if (record.status === 'absent') {
                outLabel = 'OUT (EARLY)'; 
                outColor = Colors.secondaryContainer; 
              }

              mappedFeed.push({
                id: `${record.id}_out`,
                name: guardName,
                role: role,
                site: site,
                rawTime: new Date(record.check_out_time).getTime(),
                time: formatTime(record.check_out_time),
                status: outLabel,
                avatar: avatarUrl,
                statusColor: outColor,
              });
            }
          }
        });

        // Process location pings
        locationPings.forEach((ping: any) => {
          const guardName = ping.personnel?.name || 'Unknown Guard';
          const siteName = ping.site?.site_name || 'Unknown Site';
          const formatTime = (t: string) => {
            try {
              return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) { return 'Unknown'; }
          };
          mappedFeed.push({
            id: `ping_${ping.id}`,
            name: guardName,
            role: 'SECURITY PERSONNEL',
            site: `📍 ${siteName}`,
            rawTime: new Date(ping.created_at).getTime(),
            time: formatTime(ping.created_at),
            status: 'LOCATION PING',
            avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guardName) + '&background=random',
            statusColor: '#3B82F6',
          });
        });

        const total = overviewData.guards?.total || 1;
        setStats({
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          totalPct: Math.round((presentCount / total) * 100),
          missingSites: absentSiteIds.size,
          avgDelay: lateCount > 0 ? 14 : 0, // placeholder average delay logic
        });

        // Sort feed by time descending
        mappedFeed.sort((a, b) => b.rawTime - a.rawTime);
        setFeedItems(mappedFeed.slice(0, 20)); 
        setCriticalAbsentees(absentees.slice(0, 10)); // Top 10 critical absentees

      } catch (error) {
        console.error('Error loading realtime attendance data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      
      {/* ═══ Top App Bar ═══ */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }} 
          style={{ width: 120, height: 40, resizeMode: 'contain' }} 
        />
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={s.headerSection}>
          <View>
            <Text style={s.overviewSubtitle}>OPERATIONAL OVERVIEW</Text>
            <Text style={s.pageTitle}>Real-Time Attendance</Text>
          </View>
          <View style={s.dateFilterCard}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.primary} />
            <Text style={s.dateText}>
              {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={s.dateDivider} />
            <Text style={s.networkText}>PAN India Network</Text>
          </View>
        </View>

        {/* Operational Stats Row */}
        <View style={s.statsContainer}>
          {/* Present Card */}
          <View style={[s.statCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
            <View style={s.statHeader}>
              <View>
                <Text style={s.statLabel}>PRESENT PERSONNEL</Text>
                <Text style={[s.statValue, { color: Colors.primary }]}>
                  {String(stats.present).padStart(2, '0')}
                </Text>
              </View>
              <View style={[s.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <MaterialIcons name="check-circle" size={24} color="#10B981" />
              </View>
            </View>
            <View style={s.statFooter}>
              <MaterialIcons name="trending-up" size={14} color="#10B981" />
              <Text style={[s.statSub, { color: '#10B981' }]}>{stats.totalPct}% of total strength</Text>
            </View>
          </View>

          {/* Absent Card */}
          <View style={[s.statCard, { borderLeftColor: '#B02021', borderLeftWidth: 4 }]}>
            <View style={s.statHeader}>
              <View>
                <Text style={s.statLabel}>ABSENTEES</Text>
                <Text style={[s.statValue, { color: '#B02021' }]}>
                  {String(stats.absent).padStart(2, '0')}
                </Text>
              </View>
              <View style={[s.iconWrapper, { backgroundColor: 'rgba(176, 32, 33, 0.1)' }]}>
                <MaterialIcons name="person-off" size={24} color={'#B02021'} />
              </View>
            </View>
            <View style={s.statFooter}>
              <MaterialIcons name="info" size={14} color={Colors.onSurfaceVariant} />
              <Text style={s.statSub}>Action required for {stats.missingSites} sites</Text>
            </View>
          </View>

          {/* Late Card */}
          <View style={[s.statCard, { borderLeftColor: Colors.secondaryContainer, borderLeftWidth: 4 }]}>
            <View style={s.statHeader}>
              <View>
                <Text style={s.statLabel}>LATE CHECK-INS</Text>
                <Text style={[s.statValue, { color: Colors.onSecondaryContainer }]}>
                  {String(stats.late).padStart(2, '0')}
                </Text>
              </View>
              <View style={[s.iconWrapper, { backgroundColor: 'rgba(255, 98, 77, 0.1)' }]}>
                <MaterialIcons name="schedule" size={24} color={Colors.secondaryContainer} />
              </View>
            </View>
            <View style={s.statFooter}>
              <MaterialIcons name="history" size={14} color={Colors.onSurfaceVariant} />
              <Text style={s.statSub}>Average delay: {stats.avgDelay} mins</Text>
            </View>
          </View>
        </View>

        {/* Attendance Feed */}
        <View style={s.feedSection}>
          <View style={s.feedHeader}>
            <Text style={s.feedTitle}>Staff Check-in Feed</Text>
            <TouchableOpacity style={s.downloadBtn}>
              <Text style={s.downloadBtnText}>DOWNLOAD LOGS</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 12, color: Colors.onSurfaceVariant }}>Loading feed...</Text>
            </View>
          ) : feedItems.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <MaterialIcons name="event-busy" size={40} color={Colors.outline} />
              <Text style={{ marginTop: 12, color: Colors.onSurfaceVariant }}>No check-ins today yet.</Text>
            </View>
          ) : (
            feedItems.map((item, index) => (
              <View key={item.id} style={s.feedItem}>
                <View style={s.feedItemLeft}>
                  <View style={s.avatarContainer}>
                    <Image source={{ uri: item.avatar }} style={s.avatar} />
                    <Animated.View 
                      style={[
                        s.pulseDot,
                        {
                          transform: [
                            {
                              scale: pulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.5]
                              })
                            }
                          ],
                          opacity: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0]
                          })
                        }
                      ]} 
                    />
                    <View style={s.statusDot} />
                  </View>
                  <View style={s.feedDetails}>
                    <Text style={s.feedName}>{item.name}</Text>
                    <View style={s.roleRow}>
                      <MaterialIcons name="badge" size={12} color={Colors.onSurfaceVariant} />
                      <Text style={s.feedRole}>{item.role}</Text>
                    </View>
                    <Text style={s.feedSite}>{item.site}</Text>
                  </View>
                </View>

                <View style={s.feedItemRight}>
                  <View style={s.timeContainer}>
                    <Text style={s.feedTime}>{item.time}</Text>
                    <View style={[
                      s.statusBadge, 
                      { backgroundColor: item.statusColor + '20' } // 20 is hex for ~12% opacity
                    ]}>
                      <Text style={[
                        s.statusBadgeText,
                        { color: item.statusColor }
                      ]}>{item.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Absentees Section */}
        <View style={s.absenteesCard}>
          <View style={s.absenteesHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="warning" size={20} color="#FFF" />
              <Text style={s.absenteesTitle}>Critical Absentees</Text>
            </View>
            <View style={s.absenteesCountBadge}>
              <Text style={s.absenteesCountText}>{String(criticalAbsentees.length).padStart(2, '0')} CRITICAL</Text>
            </View>
          </View>
          <View style={s.absenteesList}>
            {loading ? (
              <ActivityIndicator size="small" color="#B02021" style={{ padding: 20 }} />
            ) : criticalAbsentees.length === 0 ? (
              <Text style={{ textAlign: 'center', padding: 20, color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>
                No guards have been absent for 3 consecutive days.
              </Text>
            ) : (
              criticalAbsentees.map((item) => (
                <View key={item.id} style={s.absentItem}>
                  <View style={s.absentTopRow}>
                    <View>
                      <Text style={s.absentName}>{item.name}</Text>
                      <Text style={s.absentRole}>{item.role} • SHIFT: {item.shift}</Text>
                    </View>
                    <Text style={s.noShowText}>NO-SHOW</Text>
                  </View>
                  <Text style={s.absentSite}>{item.site}</Text>
                  <View style={s.absentActionRow}>
                    <TouchableOpacity style={s.callBtn}>
                      <MaterialIcons name="phone" size={16} color="#FFF" />
                      <Text style={s.callBtnText}>CALL STAFF</Text>
                    </TouchableOpacity>
                    {/* Removed SUPERVISOR option based on user request */}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    height: 56,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackLg,
  },
  headerSection: {
    marginBottom: Spacing.stackLg,
  },
  overviewSubtitle: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 4,
  },
  pageTitle: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: 12,
  },
  dateFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
  },
  dateText: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  dateDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.outlineVariant,
  },
  networkText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
  },
  statsContainer: {
    gap: 16,
    marginBottom: Spacing.stackLg,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statLabel: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.h1,
    fontSize: 32,
    lineHeight: 40,
  },
  iconWrapper: {
    padding: 12,
    borderRadius: 12,
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  statSub: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  feedSection: {
    marginBottom: Spacing.stackLg,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedTitle: {
    ...Typography.h2,
    fontSize: 18,
    color: Colors.primary,
  },
  downloadBtn: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  downloadBtnText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  feedItem: {
    flexDirection: 'column',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    marginBottom: 12,
  },
  feedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  pulseDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  feedDetails: {
    flex: 1,
  },
  feedName: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  feedRole: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  feedSite: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  feedItemRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedTime: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    ...Typography.labelSm,
    fontSize: 9,
    letterSpacing: 1,
  },
  absenteesCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  absenteesHeader: {
    backgroundColor: '#B02021',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  absenteesTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: '#FFF',
  },
  absenteesCountBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  absenteesCountText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: '#B02021',
  },
  absenteesList: {
    padding: 16,
    gap: 12,
  },
  absentItem: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
  },
  absentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  absentName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  absentRole: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  noShowText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: '#B02021',
  },
  absentSite: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: 12,
  },
  absentActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#B02021',
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: '#FFF',
  },
});
