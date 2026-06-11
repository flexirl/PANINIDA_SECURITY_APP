import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import type { WorkforcePersonnel, ShiftType } from '../types/workforce';

interface WorkforcePersonnelCardProps {
  personnel: WorkforcePersonnel & { shift_type?: ShiftType };
  onPress: () => void;
  index?: number;
  siteName?: string;
}

export default function WorkforcePersonnelCard({ personnel, onPress, index = 0, siteName = 'Assigned Site' }: WorkforcePersonnelCardProps) {
  const s = useScaledStyles(styles);
  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  
  const isActive = personnel.employment_status !== 'terminated' && personnel.employment_status !== 'inactive';
  const isDisabled = !isActive;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 400,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  // Generate initials if no photo_url is provided
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getShiftLabelText = (shift?: string) => {
    switch (shift) {
      case 'day': return 'Day (08:00 - 20:00)';
      case 'night': return 'Night (20:00 - 08:00)';
      case 'general': return 'General (10:00 - 18:00)';
      case 'late': return 'Late (16:00 - 00:00)';
      case 'rotational': return 'Rotational Shift';
      default: return 'Day (08:00 - 20:00)';
    }
  };

  const displayCategory = (personnel.category?.name || 'STAFF').toUpperCase();
  const displayShift = personnel.shift_type || 'day';

  return (
    <Animated.View
      style={{
        opacity: fadeIn,
        transform: [{ translateY: slideIn }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[s.guardCard, isDisabled && s.guardCardDisabled]}
      >
        {/* Top Section: Avatar + Name + ID */}
        <View style={s.cardHeader}>
          <View style={[s.avatarWrapper, isDisabled && { opacity: 0.5 }]}>
            {personnel.photo_url ? (
              <Image
                source={{ uri: personnel.photo_url }}
                style={[s.guardAvatar, personnel.employment_status === 'terminated' && { opacity: 0.5 }]}
              />
            ) : (
              <View style={s.guardInitials}>
                <Text style={s.guardInitialsText}>{getInitials(personnel.name)}</Text>
              </View>
            )}
            {/* Status dot */}
            <View
              style={[
                s.statusDot,
                { backgroundColor: isActive ? '#27AE60' : (personnel.employment_status === 'terminated' ? Colors.error : '#FB923C') },
              ]}
            />
          </View>
          
          <View style={s.headerInfo}>
            <View style={s.nameBadgeRow}>
              <Text style={s.guardNameText} numberOfLines={1}>{personnel.name}</Text>
              <View style={[s.statusBadge, !isActive && s.statusBadgeInactive]}>
                <Text style={[s.statusBadgeText, !isActive && s.statusBadgeTextInactive]}>
                  {personnel.employment_status === 'terminated' ? 'TERMINATED' : (isActive ? 'ACTIVE' : 'INACTIVE')}
                </Text>
              </View>
            </View>
            <Text style={s.guardIdText}>
              ID: {personnel.employee_id} • {displayCategory}
            </Text>
          </View>
        </View>

        {/* Divider & Info Table */}
        <View style={s.cardInfoContainer}>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Profession</Text>
            <Text style={s.cardRowValue}>{personnel.category?.name || 'Staff'}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Phone Number</Text>
            <Text style={s.cardRowValue}>
              {personnel.phone.startsWith('+91') ? personnel.phone : `+91 ${personnel.phone}`}
            </Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Primary Site</Text>
            <Text style={s.cardRowValue}>{siteName}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardRowLabel}>Current Shift</Text>
            <Text style={s.cardRowValue}>{getShiftLabelText(displayShift)}</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={s.detailsBtn}>
          <Text style={s.detailsBtnText}>VIEW DETAILS</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  guardCard: {
    flexDirection: 'column',
    padding: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guardCardDisabled: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  guardAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  guardInitials: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardInitialsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  guardNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#27AE60',
  },
  statusBadgeInactive: {
    backgroundColor: '#FFB4A8',
  },
  statusBadgeTextInactive: {
    color: '#8F0F07',
  },
  guardIdText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  cardInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 12,
    marginBottom: 14,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  cardRowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  detailsBtn: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
});

