import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import type { Site } from '../types/workforce';

interface SiteSummaryCardProps {
  site: Site & {
    workforce_count?: number;
    present_count?: number;
    absent_count?: number;
    open_complaints?: number;
  };
  onPress: () => void;
}

export default function SiteSummaryCard({ site, onPress }: SiteSummaryCardProps) {
  const s = useScaledStyles(styles);

  const getAttendanceText = () => {
    const present = site.present_count ?? 0;
    const total = site.workforce_count ?? 0;
    if (total === 0) return '0 Deployed';
    return `${present}/${total} Present`;
  };

  const getAttendancePercentage = () => {
    const present = site.present_count ?? 0;
    const total = site.workforce_count ?? 0;
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={s.card}
      onPress={onPress}
    >
      <View style={s.header}>
        <View style={s.titleContainer}>
          <Text style={s.siteName} numberOfLines={1}>
            {site.site_name}
          </Text>
          <Text style={s.clientName} numberOfLines={1}>
            {site.client_name || 'Generic Client'}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.outlineVariant} />
      </View>

      <View style={s.divider} />

      <View style={s.body}>
        <View style={s.metricItem}>
          <MaterialIcons name="people" size={18} color={Colors.primary} />
          <Text style={s.metricText}>{getAttendanceText()}</Text>
          {site.workforce_count ? (
            <Text style={s.percentageText}>({getAttendancePercentage()}%)</Text>
          ) : null}
        </View>

        <View style={s.metricItem}>
          <MaterialIcons name="warning" size={18} color={site.open_complaints ? Colors.dangerRed : Colors.outline} />
          <Text style={[s.metricText, site.open_complaints && s.dangerText]}>
            {site.open_complaints ?? 0} Open {site.open_complaints === 1 ? 'Complaint' : 'Complaints'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  siteName: {
    ...Typography.h2,
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  clientName: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 12,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginLeft: 6,
  },
  percentageText: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginLeft: 4,
  },
  dangerText: {
    color: Colors.dangerRed,
  },
});
