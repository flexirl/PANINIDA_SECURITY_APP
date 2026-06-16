import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';

interface ClientBottomNavProps {
  activeTab: 'home' | 'roster' | 'attendance' | 'more';
}

export default function ClientBottomNav({ activeTab }: ClientBottomNavProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const navItems = [
    { key: 'home', icon: 'dashboard', label: 'Home', route: 'ClientPortalHome' },
    { key: 'roster', icon: 'badge', label: 'Staff', route: 'ClientWorkforceRoster' },
    { key: 'attendance', icon: 'fact-check', label: 'Attendance', route: 'ClientAttendance' },
    { key: 'more', icon: 'menu', label: 'More', route: 'ClientMoreMenu' },
  ] as const;

  return (
    <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      {navItems.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isActive && styles.navItemActive]}
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive && item.route) {
                // If "more" is pressed, it goes to MoreMenu which might have different behavior, but it's consistent.
                navigation.navigate(item.route);
              }
            }}
          >
            <MaterialIcons
              name={item.icon as any}
              size={24}
              color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
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
    borderRadius: 16,
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
