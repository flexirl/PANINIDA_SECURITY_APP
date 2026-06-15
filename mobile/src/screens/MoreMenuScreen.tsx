import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { hasModuleAccess } from '../api/managerPermissionsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MoreMenuScreenProps {
  navigation: any;
}

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  badge?: { label: string; bg: string; text: string; isCircle?: boolean };
  navigateTo?: string;
  permKey?: string; // maps to manager permission module key
}

export default function MoreMenuScreen({ navigation }: MoreMenuScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const { getLabel } = usePersonnelCategory();

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );
  
  const adminName = user?.name || 'Rajesh Kumar';
  const adminPhone = user?.phone ? `+91 ${user.phone.replace(/^\+91/, '')}` : '+91 98765 43210';
  const adminAvatar = user?.avatar_url ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_0DYqfWCCqQyglK94cmlyY65QjURQZnqvzhCI-kNOrwcWq2iOa9t5XZ4FGwy1gk3b0zTBjec770O5p4bKmaCXOteEABq8ZCHqhLT8ORHLvv6JEOPbZoWo7NcnB-IHh-PT1gs9sE1cuK9kndYAaNxoSECXrRdUMUIixoYLMzdPQF3vhhLU--vzBJtjvIGV-1-dUy1vDqr6XNmbL4Dci9rGdgR5YI8u5jOGLarTHD-HXhld5SubhQEh8NspBgydwjybYZLml0DDjOI';

  const allMenuItems: MenuItem[] = [
    {
      key: 'payroll',
      icon: 'payments',
      label: 'Payroll',
      subtitle: 'Manage salaries',
      badge: { label: '3 pending', bg: '#FEF3C7', text: '#92400E' },
      navigateTo: 'PayrollList',
      permKey: 'payroll',
    },
    {
      key: 'recruitment',
      icon: 'person-add',
      label: 'Recruitment',
      subtitle: 'Candidate pipeline',
      badge: { label: '5 new', bg: '#DBEAFE', text: '#1E40AF' },
      navigateTo: 'CandidateList',
      permKey: 'recruitment',
    },
    {
      key: 'workforce_categories',
      icon: 'category',
      label: 'Workforce Categories',
      subtitle: 'Manage personnel roles',
      navigateTo: 'WorkforceCategoryList',
      permKey: 'categories',
    },
    {
      key: 'uniforms',
      icon: 'checkroom',
      label: 'Uniforms',
      subtitle: 'Track issued items',
      navigateTo: 'UniformManagement',
      permKey: 'uniforms',
    },
    {
      key: 'inspections',
      icon: 'fact-check',
      label: 'Inspections',
      subtitle: 'Site inspection reports',
      navigateTo: 'InspectionList',
      permKey: 'inspections',
    },
    {
      key: 'reports',
      icon: 'assessment',
      label: 'Reports',
      subtitle: 'Export data',
      navigateTo: 'Reports',
      permKey: 'reports',
    },
    {
      key: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
      subtitle: 'Alerts & reminders',
      badge: { label: '4', bg: '#BA1A1A', text: '#FFFFFF', isCircle: true },
      navigateTo: 'NotificationCenter',
      permKey: 'notifications',
    },
    {
      key: 'settings',
      icon: 'settings',
      label: 'Settings',
      subtitle: 'App preferences',
      navigateTo: 'Settings',
      permKey: 'settings',
    },
  ];

  // Filter menu items based on manager permissions
  const isManager = user?.role === 'manager';
  const managerPerms = user?.manager_permissions;
  const menuItems = isManager
    ? allMenuItems.filter((item) => {
        if (!item.permKey) return true;
        return hasModuleAccess(managerPerms, item.permKey);
      })
    : allMenuItems;

  const handleItemPress = (item: MenuItem) => {
    if (item.navigateTo) {
      navigation.navigate(item.navigateTo);
    } else {
      Alert.alert(item.label, `${item.label} screen is coming soon.`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out of the application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const allNavItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard', permKey: 'dashboard' },
    { key: 'workforce', icon: 'people' as const, label: getLabel('plural'), permKey: 'workforce' },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites', permKey: 'sites' },
    { key: 'more', icon: 'menu' as const, label: 'More', permKey: null },
  ];

  // Filter bottom nav for managers
  const navItems = isManager
    ? allNavItems.filter((item) => {
        if (!item.permKey) return true; // 'more' tab always visible
        return hasModuleAccess(managerPerms, item.permKey);
      })
    : allNavItems;

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'workforce') {
      navigation.navigate('WorkforcePersonnelList');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top App Bar (Matches AdminDashboardScreen exactly) ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={s.topBarRight}>
            {/* Notification bell */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
            {/* Settings button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialIcons name="settings" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Admin Profile Card (Refined high-fidelity styling) ─── */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.profileCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image source={{ uri: adminAvatar }} style={s.profileAvatar} />
          <View style={s.profileDetails}>
            <View style={s.profileNameRow}>
              <Text style={s.profileName}>{adminName}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>ADMIN</Text>
              </View>
            </View>
            <View style={s.phoneRow}>
              <MaterialIcons name="phone" size={14} color="#747780" />
              <Text style={s.profilePhone}>{adminPhone}</Text>
            </View>
          </View>
          <View style={s.editBtn}>
            <MaterialIcons name="edit" size={18} color="#1A3D6D" />
          </View>
        </TouchableOpacity>

        {/* ─── Menu Items ─── */}
        <View style={s.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              style={s.menuItem}
              onPress={() => handleItemPress(item)}
            >
              <View style={s.menuIconWrapper}>
                <MaterialIcons name={item.icon as any} size={20} color="#1A3D6D" />
              </View>
              
              <View style={s.menuItemText}>
                <Text style={s.menuItemLabel}>{item.label}</Text>
                <Text style={s.menuItemSubtitle}>{item.subtitle}</Text>
              </View>

              <View style={s.menuItemRight}>
                {item.badge && (
                  <View style={[
                    s.menuBadge, 
                    { backgroundColor: item.badge.bg },
                    item.badge.isCircle && s.menuBadgeCircle
                  ]}>
                    <Text style={[
                      s.menuBadgeText, 
                      { color: item.badge.text },
                      item.badge.isCircle && s.menuBadgeCircleText
                    ]}>
                      {item.badge.label}
                    </Text>
                  </View>
                )}
                <MaterialIcons name="chevron-right" size={20} color="#C3C6D0" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Version & Logout ─── */}
        <View style={s.footer}>
          <Text style={s.versionText}>v1.0.0</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={s.logoutBtn}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={18} color="#BA1A1A" />
            <Text style={s.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'more';
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

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Elegant subtle gray bg
  },
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingLeft: 2,
    paddingRight: 8,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111C2C',
  },
  roleBadge: {
    backgroundColor: '#002752',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profilePhone: {
    fontSize: 13,
    color: '#747780',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EEFF', // Light blue/lavender edit button bg
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7EEFF', // Matches screenshot premium light blue icon frame
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111C2C',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#747780',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuBadgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuBadgeCircleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C3C6D0',
  },
  logoutBtn: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderColor: '#BA1A1A',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#BA1A1A',
  },
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
