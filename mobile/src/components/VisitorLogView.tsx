import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';

import { VisitorLog } from '../types/workforce';

// Format time from ISO string
const formatTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface VisitorLogViewProps {
  logs: VisitorLog[];
  onAddVisitor?: () => void;
  showAddButton?: boolean;
  fabBottomOffset?: number;
  onCheckoutVisitor?: (id: string) => void;
}

export default function VisitorLogView({ logs, onAddVisitor, showAddButton = false, fabBottomOffset, onCheckoutVisitor }: VisitorLogViewProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVisitors = logs.filter(
    (v) =>
      v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.flat_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visitor_phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentlyInsideCount = logs.filter(v => v.status === 'active').length;

  const renderVisitorCard = ({ item }: { item: VisitorLog }) => {
    const isInside = item.status === 'active';

    return (
      <View style={[s.card, isInside && s.cardActive]}>
        <View style={s.cardHeader}>
          <View>
            <Text style={s.visitorName}>{item.visitor_name}</Text>
            <Text style={s.contactInfo}>{item.visitor_phone}</Text>
          </View>
          <View style={s.purposeBadge}>
            <Text style={s.purposeText}>{item.purpose}</Text>
          </View>
        </View>

        <View style={s.detailsRow}>
          <MaterialIcons name="apartment" size={16} color={Colors.outline} />
          <Text style={s.destinationText}>{item.flat_number || 'Site Premises'}</Text>
        </View>

        <View style={s.divider} />

        <View style={s.timelineRow}>
          <View style={s.timeBlock}>
            <View style={s.timeItem}>
              <MaterialIcons name="login" size={16} color={isInside ? Colors.successGreen : Colors.outline} />
              <Text style={isInside ? s.timeTextActive : s.timeText}>In: <Text style={{ fontWeight: isInside ? 'bold' : 'normal' }}>{formatTime(item.check_in_time)}</Text></Text>
            </View>
            <View style={s.timeItem}>
              <MaterialIcons name="logout" size={16} color={Colors.outline} style={{ opacity: isInside ? 0.4 : 1 }} />
              <Text style={[s.timeText, isInside && { opacity: 0.4, fontStyle: 'italic' }]}>
                {item.check_out_time ? `Out: ${formatTime(item.check_out_time)}` : 'Pending'}
              </Text>
            </View>
          </View>
          
          {isInside && onCheckoutVisitor ? (
            <TouchableOpacity 
              style={[s.statusBadge, s.statusBadgeInside, { paddingRight: 8 }]}
              onPress={() => onCheckoutVisitor(item.id)}
              activeOpacity={0.7}
            >
              <View style={s.pulseDot} />
              <Text style={[s.statusText, s.statusTextInside, { marginRight: 4 }]}>
                MARK OUT
              </Text>
              <MaterialIcons name="logout" size={14} color={Colors.successGreen} />
            </TouchableOpacity>
          ) : (
            <View style={[s.statusBadge, isInside ? s.statusBadgeInside : s.statusBadgeExit]}>
              {isInside && <View style={s.pulseDot} />}
              <Text style={[s.statusText, isInside ? s.statusTextInside : s.statusTextExit]}>
                {isInside ? 'STILL INSIDE' : 'LOGGED EXIT'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Date Navigator */}
      <View style={s.dateNavigator}>
        <TouchableOpacity style={s.iconButton}>
          <MaterialIcons name="chevron-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={s.dateCenter}>
          <Text style={s.dateLabel}>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
          <Text style={s.dateTitle}>Today</Text>
        </View>
        <TouchableOpacity style={s.iconButton}>
          <MaterialIcons name="chevron-right" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={s.statsContainer}>
        <View style={s.statCardPrimary}>
          <Text style={s.statLabelPrimary}>TODAY'S ENTRIES</Text>
          <Text style={s.statValuePrimary}>{logs.length}</Text>
        </View>
        <View style={s.statCardSecondary}>
          <View style={s.statLabelRow}>
            <View style={s.pulseDot} />
            <Text style={s.statLabelSecondary}>CURRENTLY INSIDE</Text>
          </View>
          <Text style={s.statValueSecondary}>{currentlyInsideCount.toString().padStart(2, '0')}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, unit, or phone..."
          placeholderTextColor={Colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>



      {/* List */}
      <FlatList
        data={filteredVisitors}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitorCard}
        contentContainerStyle={{ paddingBottom: showAddButton ? (fabBottomOffset ? fabBottomOffset + 80 : 100) : 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      {showAddButton && (
        <TouchableOpacity
          style={[s.fab, { bottom: fabBottomOffset ?? (insets.bottom + 24) }]}
          onPress={onAddVisitor}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={32} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    padding: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconButton: {
    padding: 8,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    letterSpacing: 1,
  },
  dateTitle: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabelPrimary: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  statValuePrimary: {
    ...Typography.h3,
    color: Colors.onPrimary,
  },
  statCardSecondary: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabelSecondary: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  statValueSecondary: {
    ...Typography.h3,
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    height: '100%',
  },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.successGreen,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorName: {
    ...Typography.bodyBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  contactInfo: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  purposeBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  purposeText: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  destinationText: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timeBlock: {
    gap: 4,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  timeTextActive: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.onSurface,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  statusBadgeInside: {
    backgroundColor: Colors.successGreen + '1A', // 10% opacity
    borderColor: Colors.successGreen + '33', // 20% opacity
  },
  statusBadgeExit: {
    backgroundColor: Colors.surfaceContainer,
    borderColor: Colors.surfaceContainerHigh,
  },
  statusText: {
    ...Typography.labelSm,
  },
  statusTextInside: {
    color: Colors.successGreen,
  },
  statusTextExit: {
    color: Colors.onSurfaceVariant,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successGreen,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brandRed || '#B02D21',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
