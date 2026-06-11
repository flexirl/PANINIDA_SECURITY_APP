import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AttendanceStatus } from '../types/workforce';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | 'not_required' | null | undefined;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present:      { label: 'Present',      color: '#27AE60', bg: 'rgba(39,174,96,0.12)' },
  late:         { label: 'Late',         color: '#F39C12', bg: 'rgba(243,156,18,0.12)' },
  half_day:     { label: 'Half Day',     color: '#E67E22', bg: 'rgba(230,126,34,0.12)' },
  absent:       { label: 'Absent',       color: '#E74C3C', bg: 'rgba(231,76,60,0.12)' },
  corrected:    { label: 'Corrected',    color: '#2980B9', bg: 'rgba(41,128,185,0.12)' },
  not_required: { label: 'N/A',          color: '#747780', bg: 'rgba(116,119,128,0.10)' },
};

const DEFAULT_CONFIG = { label: 'N/A', color: '#747780', bg: 'rgba(116,119,128,0.10)' };

/**
 * Color-coded attendance status badge.
 * Task 42.1: Supports present/absent/late/half_day/corrected/N/A states.
 */
export default function AttendanceStatusBadge({ status, size = 'sm' }: AttendanceStatusBadgeProps) {
  const config = status ? (STATUS_CONFIG[status] || DEFAULT_CONFIG) : DEFAULT_CONFIG;
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isMd && styles.badgeMd,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Attendance status: ${config.label}`}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isMd && styles.labelMd,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelMd: {
    fontSize: 12,
  },
});
