import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CategoryBadgeProps {
  categoryName: string;
  size?: 'sm' | 'md';
}

/**
 * Deterministic color mapping: same category name always gets the same color.
 * Colors are chosen for sufficient contrast on both light and dark backgrounds.
 */
const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  'Guard':              { color: '#002752', bg: 'rgba(0,39,82,0.10)' },
  'Gunman':             { color: '#8B0000', bg: 'rgba(139,0,0,0.10)' },
  'Rifleman':           { color: '#7B2D26', bg: 'rgba(123,45,38,0.10)' },
  'PSO':                { color: '#1B4332', bg: 'rgba(27,67,50,0.10)' },
  'Bouncer':            { color: '#3C1361', bg: 'rgba(60,19,97,0.10)' },
  'Supervisor':         { color: '#0D47A1', bg: 'rgba(13,71,161,0.10)' },
  'Security Officer':   { color: '#004D40', bg: 'rgba(0,77,64,0.10)' },
  'Housekeeping':       { color: '#E65100', bg: 'rgba(230,81,0,0.10)' },
  'Sweeper':            { color: '#BF360C', bg: 'rgba(191,54,12,0.10)' },
  'Gardener':           { color: '#1B5E20', bg: 'rgba(27,94,32,0.10)' },
  'Electrician':        { color: '#F57F17', bg: 'rgba(245,127,23,0.10)' },
  'Plumber':            { color: '#01579B', bg: 'rgba(1,87,155,0.10)' },
  'Carpenter':          { color: '#4E342E', bg: 'rgba(78,52,46,0.10)' },
  'Lift Operator':      { color: '#263238', bg: 'rgba(38,50,56,0.10)' },
  'Pump Operator':      { color: '#006064', bg: 'rgba(0,96,100,0.10)' },
  'Technician':         { color: '#311B92', bg: 'rgba(49,27,146,0.10)' },
  'Receptionist':       { color: '#880E4F', bg: 'rgba(136,14,79,0.10)' },
  'Office Assistant':   { color: '#33691E', bg: 'rgba(51,105,30,0.10)' },
  'Data Entry Operator':{ color: '#4A148C', bg: 'rgba(74,20,140,0.10)' },
};

/**
 * Fallback: generate a deterministic color from the category name hash.
 */
function getHashColor(name: string): { color: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // convert to 32-bit int
  }
  const hue = Math.abs(hash) % 360;
  return {
    color: `hsl(${hue}, 55%, 35%)`,
    bg: `hsla(${hue}, 55%, 35%, 0.10)`,
  };
}

/**
 * Colored chip badge displaying a workforce category name.
 * Task 42.2: Consistent color mapping per category name.
 */
export default function CategoryBadge({ categoryName, size = 'sm' }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[categoryName] || getHashColor(categoryName);
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isMd && styles.badgeMd,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Category: ${categoryName}`}
    >
      <Text
        style={[
          styles.label,
          { color: colors.color },
          isMd && styles.labelMd,
        ]}
        numberOfLines={1}
      >
        {categoryName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
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
