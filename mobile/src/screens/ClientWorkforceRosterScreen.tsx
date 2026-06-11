import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientWorkforceRoster, getClientSiteInfo } from '../api/clientPortalService';
import CategoryBadge from '../components/CategoryBadge';
import AttendanceStatusBadge from '../components/AttendanceStatusBadge';
import type { WorkforcePersonnel, ShiftType } from '../types/workforce';

export default function ClientWorkforceRosterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [siteName, setSiteName] = useState('');
  const [roster, setRoster] = useState<{ title: string; data: any[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      const site = await getClientSiteInfo();
      if (site) setSiteName(site.site_name);

      const rosterData = await getClientWorkforceRoster();
      setRoster(rosterData);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const makeCall = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const filteredRoster = roster
    .map(section => {
      const filteredData = section.data.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return {
        ...section,
        data: filteredData
      };
    })
    .filter(section => section.data.length > 0);

  const renderRosterItem = ({ item }: { item: WorkforcePersonnel & { shift_type?: ShiftType; assignment_id: string } }) => {
    return (
      <View style={s.rosterCard}>
        <View style={s.rosterRow}>
          <View style={s.rosterMainInfo}>
            <Text style={s.rosterName}>{item.name}</Text>
            <Text style={s.rosterId}>
              {item.employee_id} • {(item.shift_type || 'day').toUpperCase()}
            </Text>
            {item.phone ? (
              <TouchableOpacity onPress={() => makeCall(item.phone!)} style={s.phoneRow}>
                <MaterialIcons name="phone" size={14} color={Colors.primary} style={s.phoneIcon} />
                <Text style={s.phoneText}>{item.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={s.rosterBadges}>
            <AttendanceStatusBadge status={item.today_attendance?.status} size="sm" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={s.titleContainer}>
          <Text style={s.headerTitle}>Workforce Roster</Text>
          <Text style={s.siteSub}>{siteName || 'Loading location...'}</Text>
        </View>
        <View style={s.placeholder} />
      </View>

      {/* Search bar inside Roster */}
      <View style={s.searchSection}>
        <View style={s.searchContainer}>
          <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search within roster..."
            placeholderTextColor={Colors.outline}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={filteredRoster}
          keyExtractor={(item) => item.id}
          renderItem={renderRosterItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={s.sectionHeader}>
              <CategoryBadge categoryName={title} size="md" />
            </View>
          )}
          contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="people-outline" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No matching personnel active</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  placeholder: {
    width: 40,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  siteSub: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  sectionHeader: {
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  rosterCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rosterMainInfo: {
    flex: 1,
    marginRight: 16,
  },
  rosterName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  rosterId: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  phoneIcon: {
    marginRight: 4,
  },
  phoneText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  rosterBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
});
