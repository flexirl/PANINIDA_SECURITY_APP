import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Switch,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { useFontScale, FONT_SCALE_PRESETS, useScaledStyles } from '../context/FontSizeContext';

interface SettingsScreenProps {
  navigation: any;
}

const LANGUAGE_OPTIONS = ['English (Default)', 'हिन्दी (Hindi)', 'मराठी (Marathi)'];

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const { fontScale, setFontScale, scaledSize } = useFontScale();
  const { getLabel } = usePersonnelCategory();
  const s = useScaledStyles(styles);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

  const profileName = user?.name || 'Suresh Mahto';
  const profilePhone = user?.phone ? `+91 ${user.phone.replace(/^\+91/, '')}` : '+91 97777 77780';
  const profileAvatar = user?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1VcGDXtK4RjGNOzE352Kj-aAmt-5wL4DrbVA1975c8PVe28ptDHMtqwL0M13zbTDY-whjXgZ07-atvewMUW_m5xzYYN1jJ0GGkDfghxCDW0hfWRN14vxKLj1CP6QzNv1k-WFZGukNQqClTTEZa1gkp7BR5eq3LTgtOcvoBH2TZ8N7K7hPKlzxYslkFyZb9BoD6LkN5QlPc0uG8BMUAm-brQLEJ6eWcR-SEmrUjNQ4DmqCixViFQ7YGkGV-wPNF26xJTWhK9Hhg4Y';

  // App settings state
  const [language, setLanguage] = useState('English (Default)');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Admin configurations state
  const [geofence, setGeofence] = useState(100); // 50m to 500m
  const [latePenalty, setLatePenalty] = useState('200');
  const [overtimeRate, setOvertimeRate] = useState('1.5x');

  // Loading/export state
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Modal visibility
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  const handleExport = (type: 'attendance' | 'payroll' | 'guards') => {
    setIsExporting(type);
    setTimeout(() => {
      setIsExporting(null);
      let title = '';
      let msg = '';
      if (type === 'attendance') {
        title = 'Export Success';
        msg = 'Attendance report compiled successfully. Download starting...';
      } else if (type === 'payroll') {
        title = 'Export Success';
        msg = 'Payroll summary report compiled successfully. Download starting...';
      } else if (type === 'guards') {
        title = 'Export Success';
        msg = 'Guard list data exported successfully as CSV.';
      }
      Alert.alert(title, msg);
    }, 1200);
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

  const adjustGeofence = (val: number) => {
    const newVal = Math.min(500, Math.max(50, val));
    setGeofence(newVal);
  };

  // Slider percentage helper
  const sliderPercentage = ((geofence - 50) / (500 - 50)) * 100;

  // Role check: Admin versus Guard (Personnel)
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  // Navigation Items for Admin
  const navItemsAdmin = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPressAdmin = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'guards') {
      navigation.navigate('GuardList');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  // Navigation Items for Guard
  const navItemsGuard = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPressGuard = (key: string) => {
    if (key === 'home') {
      navigation.navigate('GuardHome');
    } else if (key === 'attendance') {
      navigation.navigate('GuardAttendanceHistory');
    } else if (key === 'salary') {
      navigation.navigate('GuardSalarySlips');
    } else if (key === 'profile') {
      navigation.navigate('GuardProfile');
    }
  };

  if (user?.role === 'manager') {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#faf9fd" />
        <MaterialIcons name="security" size={80} color="#BA1A1A" />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1C2B', marginTop: 16, marginBottom: 8 }}>Access Denied</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 24 }}>
          Settings are restricted to Administrator roles only.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#4F46E5', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 }} 
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ══════════════════════════════════════════════════
  // RENDER GUARD / PERSONNEL VERSION OF SETTINGS SCREEN
  // ══════════════════════════════════════════════════
  if (!isAdmin) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* ═══ Top AppBar (Personnel Version) ═══ */}
        <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <View style={s.topBarInner}>
            <View style={s.topBarLeft}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.goBack()}
                style={s.backBtn}
              >
                <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={s.topBarTitle}>Settings / सेटिंग्स</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.notificationBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.onSurfaceVariant} />
              <View style={s.redBadgeDot} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ─── Profile Summary Card ─── */}
          <View style={s.guardProfileCard}>
            <View style={s.avatarContainer}>
              <Image source={{ uri: profileAvatar }} style={s.guardAvatar as any} />
              <View style={s.statusDot} />
            </View>
            <View style={s.guardDetailsContainer}>
              <View style={s.guardNameRow}>
                <Text style={s.guardName}>{profileName}</Text>
                <View style={s.guardRoleBadge}>
                  <Text style={s.guardRoleText}>Guard / गार्ड</Text>
                </View>
              </View>
              <Text style={s.guardPhone}>{profilePhone}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EditGuardProfile')}
                style={s.editProfileLinkRow}
              >
                <Text style={s.editProfileLinkTxt}>Edit Profile / प्रोफ़ाइल संपादित करें</Text>
                <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── App Settings Section ─── */}
          <View style={s.settingsCol}>
            <Text style={s.sectionHeaderLabel}>App Settings / ऐप सेटिंग</Text>
            <View style={s.settingsListCard}>
              {/* Language Selection */}
              <View style={s.settingBlock}>
                <Text style={s.settingBlockLabel}>Language / भाषा</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.dropdownSelector}
                  onPress={() => setIsLanguageModalVisible(true)}
                >
                  <Text style={s.dropdownText}>{language}</Text>
                  <MaterialIcons name="expand-more" size={20} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {/* Font Size Selection */}
              <View style={s.settingBlock}>
                <Text style={s.settingBlockLabel}>Font Size / अक्षर का आकार</Text>
                <View style={s.fontSizePresetsContainer}>
                  {FONT_SCALE_PRESETS.map((preset) => {
                    const isActive = fontScale === preset.value;
                    const labelText = preset.value === 1.0 ? 'Normal' : preset.value === 1.15 ? 'Large' : 'Extra Large';
                    return (
                      <TouchableOpacity
                        key={preset.value}
                        activeOpacity={0.8}
                        onPress={() => setFontScale(preset.value)}
                        style={[
                          s.fontSizeBtn,
                          isActive && s.fontSizeBtnActive,
                        ]}
                      >
                        <Text style={[s.fontSizeBtnText, isActive && s.fontSizeBtnTextActive]}>
                          {labelText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Push Notifications Toggle */}
              <View style={s.settingToggleRow}>
                <Text style={s.settingBlockLabel}>Push Notifications / पुश सूचनाएं</Text>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Dark Mode Toggle */}
              <View style={s.settingToggleRow}>
                <Text style={s.settingBlockLabel}>Dark Mode / डार्क मोड</Text>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* ─── Logout Section ─── */}
          <View style={s.guardLogoutSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.guardLogoutBtn}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={22} color={Colors.secondary} style={{ marginRight: 6 }} />
              <Text style={s.guardLogoutBtnText}>Logout / लॉगआउट</Text>
            </TouchableOpacity>
            <Text style={s.versionText}>Version 1.0.0</Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ═══ Language Select Modal ═══ */}
        <Modal
          visible={isLanguageModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsLanguageModalVisible(false)}
        >
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsLanguageModalVisible(false)}
          >
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Select Language / भाषा चुनें</Text>
                <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color={Colors.onSurface} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={LANGUAGE_OPTIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={s.optionItem}
                    onPress={() => {
                      setLanguage(item);
                      setIsLanguageModalVisible(false);
                    }}
                  >
                    <Text style={s.optionText}>{item}</Text>
                    {language === item && (
                      <MaterialIcons name="check" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Floating pill bottom nav capsule */}
        <View style={[s.bottomNav, { bottom: 24 + insets.bottom / 2 }]}>
          {navItemsGuard.map((item) => {
            const isActive = item.key === 'profile';
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.navItem, isActive && s.navItemActiveGuard]}
                activeOpacity={0.7}
                onPress={() => handleNavPressGuard(item.key)}
              >
                <MaterialIcons
                  name={item.icon}
                  size={24}
                  color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
                />
                <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════
  // RENDER ADMIN VERSION OF SETTINGS SCREEN
  // ══════════════════════════════════════════════════
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle} numberOfLines={1}>
              Settings
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: profileAvatar }}
                style={s.avatarSmallImage as any}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Section ─── */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Image
              source={{ uri: profileAvatar }}
              style={s.profileAvatar as any}
            />
            <TouchableOpacity activeOpacity={0.8} style={s.editAvatarBtn}>
              <MaterialIcons name="edit" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={s.profileName}>{profileName}</Text>
          <Text style={s.profilePhone}>{profilePhone}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>ADMIN</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.editProfileLink}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={s.editProfileLinkText}>Edit Profile</Text>
            <MaterialIcons name="open-in-new" size={12} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── Role & Access Management ─── */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={s.roleManagementCard}
          onPress={() => navigation.navigate('RoleManagement')}
        >
          <View style={s.roleManagementLeft}>
            <View style={s.roleManagementIcon}>
              <MaterialIcons name="admin-panel-settings" size={22} color="#FFFFFF" />
            </View>
            <View style={s.roleManagementText}>
              <Text style={s.roleManagementTitle}>Role & Access Management</Text>
              <Text style={s.roleManagementSub}>
                Assign managers, supervisors, inspectors & more
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* ─── App Settings ─── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>App Settings</Text>
          </View>

          <View style={s.settingsList}>
            {/* Language */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.settingItem}
              onPress={() => setIsLanguageModalVisible(true)}
            >
              <View style={s.settingItemLeft}>
                <MaterialIcons name="language" size={20} color={Colors.onSurfaceVariant} />
                <View>
                  <Text style={s.settingLabel}>Language</Text>
                  <Text style={s.settingSub}>System default</Text>
                </View>
              </View>
              <Text style={s.settingValText}>{language}</Text>
            </TouchableOpacity>

            {/* Push Notifications */}
            <View style={s.settingItem}>
              <View style={s.settingItemLeft}>
                <MaterialIcons name="notifications-active" size={20} color={Colors.onSurfaceVariant} />
                <Text style={s.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#CBD5E1', true: Colors.primaryFixedDim }}
                thumbColor={pushNotifications ? Colors.primary : '#F4F4F5'}
              />
            </View>

            {/* Dark Mode */}
            <View style={s.settingItem}>
              <View style={s.settingItemLeft}>
                <MaterialIcons name="dark-mode" size={20} color={Colors.onSurfaceVariant} />
                <Text style={s.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#CBD5E1', true: Colors.primaryFixedDim }}
                thumbColor={darkMode ? Colors.primary : '#F4F4F5'}
              />
            </View>

            {/* Font Size Adjustment */}
            <View style={s.settingItem}>
              <View style={s.settingItemLeft}>
                <MaterialIcons name="text-fields" size={20} color={Colors.onSurfaceVariant} />
                <View>
                  <Text style={s.settingLabel}>Font Size</Text>
                  <Text style={s.settingSub}>Adjust text size across the app</Text>
                </View>
              </View>
            </View>
            <View style={s.fontSizePickerContainer}>
              <View style={s.fontSizePresetsRow}>
                {FONT_SCALE_PRESETS.map((preset) => {
                  const isActive = fontScale === preset.value;
                  return (
                    <TouchableOpacity
                      key={preset.value}
                      activeOpacity={0.8}
                      onPress={() => setFontScale(preset.value)}
                      style={[
                        s.fontPresetBtn,
                        isActive && s.fontPresetBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.fontPresetLabel,
                          isActive && s.fontPresetLabelActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <Text
                        style={[
                          s.fontPresetDesc,
                          isActive && s.fontPresetDescActive,
                        ]}
                      >
                        {preset.value === 1.0 ? 'Aa' : preset.value === 1.15 ? 'Aa+' : 'Aa++'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Live Preview */}
              <View style={s.fontPreviewBox}>
                <Text style={[s.fontPreviewLabel]}>Preview</Text>
                <Text style={{ fontSize: scaledSize(14), color: Colors.onSurface, fontWeight: '500' }}>
                  Pan India Security Management
                </Text>
                <Text style={{ fontSize: scaledSize(12), color: Colors.onSurfaceVariant, marginTop: 2 }}>
                  Guard deployment & monitoring dashboard
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Data & Reports ─── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Data & Reports</Text>
          </View>
          <View style={s.reportsGrid}>
            {/* Export Attendance */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.reportBtn}
              onPress={() => handleExport('attendance')}
              disabled={isExporting !== null}
            >
              {isExporting === 'attendance' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons name="file-download" size={18} color={Colors.primary} />
              )}
              <Text style={s.reportBtnText}>Export Attendance</Text>
            </TouchableOpacity>

            {/* Export Payroll */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.reportBtn}
              onPress={() => handleExport('payroll')}
              disabled={isExporting !== null}
            >
              {isExporting === 'payroll' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons name="file-download" size={18} color={Colors.primary} />
              )}
              <Text style={s.reportBtnText}>Export Payroll</Text>
            </TouchableOpacity>

            {/* Export Guard List */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.reportBtn}
              onPress={() => handleExport('guards')}
              disabled={isExporting !== null}
            >
              {isExporting === 'guards' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialIcons name="file-download" size={18} color={Colors.primary} />
              )}
              <Text style={s.reportBtnText}>Export Guard List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── App Configuration ─── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>App Configuration</Text>
          </View>
          <View style={s.configBody}>
            {/* Custom Slider for Geofence */}
            <View style={s.sliderGroup}>
              <View style={s.sliderHeader}>
                <View style={s.sliderLabelRow}>
                  <MaterialIcons name="zoom-out-map" size={18} color={Colors.onSurfaceVariant} />
                  <Text style={s.sliderLabel}>Default Geofence</Text>
                </View>
                <View style={s.badgeLabel}>
                  <Text style={s.badgeLabelText}>{geofence}m</Text>
                </View>
              </View>

              {/* Slider Track and Thumb */}
              <View style={s.sliderTrackContainer}>
                {/* Decrement Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.adjustBtn}
                  onPress={() => adjustGeofence(geofence - 25)}
                >
                  <MaterialIcons name="remove" size={16} color={Colors.primary} />
                </TouchableOpacity>

                <View style={s.trackWrapper}>
                  {/* Gray background track */}
                  <View style={s.trackBg} />
                  {/* Filled primary track */}
                  <View style={[s.trackFilled, { width: `${sliderPercentage}%` }]} />
                  {/* Thumb indicator */}
                  <View style={[s.trackThumb, { left: `${sliderPercentage}%` }]} />
                  
                  {/* Interactive tap steps overlay (5 zones) */}
                  <View style={s.trackOverlay}>
                    <TouchableOpacity style={s.stepZone} onPress={() => setGeofence(50)} />
                    <TouchableOpacity style={s.stepZone} onPress={() => setGeofence(150)} />
                    <TouchableOpacity style={s.stepZone} onPress={() => setGeofence(250)} />
                    <TouchableOpacity style={s.stepZone} onPress={() => setGeofence(375)} />
                    <TouchableOpacity style={s.stepZone} onPress={() => setGeofence(500)} />
                  </View>
                </View>

                {/* Increment Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.adjustBtn}
                  onPress={() => adjustGeofence(geofence + 25)}
                >
                  <MaterialIcons name="add" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={s.sliderTicks}>
                <Text style={s.tickText}>50m</Text>
                <Text style={s.tickText}>250m</Text>
                <Text style={s.tickText}>500m</Text>
              </View>
            </View>

            {/* Shift Configurations */}
            <View style={s.gridConfigs}>
              <View style={s.fieldGroup}>
                <View style={s.fieldHeader}>
                  <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                  <Text style={s.fieldTitle}>Late Penalty</Text>
                </View>
                <View style={s.inputContainer}>
                  <Text style={s.currencyPrefix}>₹</Text>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={latePenalty}
                    onChangeText={setLatePenalty}
                  />
                </View>
              </View>

              <View style={s.fieldGroup}>
                <View style={s.fieldHeader}>
                  <MaterialIcons name="more-time" size={16} color={Colors.onSurfaceVariant} />
                  <Text style={s.fieldTitle}>Overtime Rate</Text>
                </View>
                <View style={s.inputContainer}>
                  <TextInput
                    style={s.textInput}
                    value={overtimeRate}
                    onChangeText={setOvertimeRate}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Logout ─── */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={s.logoutBtn}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={18} color="#E74C3C" />
          <Text style={s.logoutBtnText}>LogOut</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Language Select Modal ═══ */}
      <Modal
        visible={isLanguageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsLanguageModalVisible(false)}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGE_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.optionItem}
                  onPress={() => {
                    setLanguage(item);
                    setIsLanguageModalVisible(false);
                  }}
                >
                  <Text style={s.optionText}>{item}</Text>
                  {language === item && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItemsAdmin.map((item) => {
          const isActive = item.key === 'more';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPressAdmin(item.key)}
            >
              <MaterialIcons
                name={item.icon as any}
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
    backgroundColor: '#faf9fd',
  },
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.screenPadding,
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
  backBtn: {
    padding: 8,
    marginRight: 4,
    marginLeft: -8,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    marginRight: 6,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    padding: 8,
    marginRight: -8,
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackLg,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: Colors.surfaceContainer,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  editProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editProfileLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  settingsList: {},
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: Colors.outlineVariant,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  settingSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  settingValText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Font Size Picker
  fontSizePickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fontSizePresetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fontPresetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: '#ffffff',
    gap: 4,
  },
  fontPresetBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  fontPresetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  fontPresetLabelActive: {
    color: Colors.primary,
  },
  fontPresetDesc: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.outline,
  },
  fontPresetDescActive: {
    color: Colors.primary,
  },
  fontPreviewBox: {
    marginTop: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  fontPreviewLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  reportsGrid: {
    padding: 16,
    gap: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    height: 44,
    backgroundColor: '#ffffff',
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  configBody: {
    padding: 16,
    gap: 20,
  },
  sliderGroup: {
    gap: 10,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  badgeLabel: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sliderTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3,
    width: '100%',
  },
  trackFilled: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  trackThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 1,
    transform: [{ translateX: -9 }],
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  trackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  stepZone: {
    flex: 1,
    height: '100%',
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tickText: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  gridConfigs: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldGroup: {
    flex: 1,
    gap: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  currencyPrefix: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
  },
  logoutBtn: {
    height: 48,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderColor: '#eeedf2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  // ── Bottom Nav (Floating pill style) ──
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
  // ── Role Management Card ──
  roleManagementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  roleManagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  roleManagementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  roleManagementText: {
    flex: 1,
  },
  roleManagementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  roleManagementSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },

  // ─── Guard Settings Specific Styles ───
  scroll: {
    flex: 1,
  },
  guardProfileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  guardAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLow,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.successGreen,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  guardDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  guardNameRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 2,
  },
  guardName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  guardRoleBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  guardRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  guardPhone: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 8,
  },
  editProfileLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editProfileLinkTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsGrid: {
    gap: 16,
  },
  settingsCol: {
    gap: 8,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  settingsListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  settingBlock: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 8,
  },
  settingBlockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  dropdownSelector: {
    height: 48,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  fontSizePresetsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 4,
  },
  fontSizeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeBtnActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fontSizeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  fontSizeBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  supportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  guardLogoutSection: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  guardLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  guardLogoutBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  navItemActiveGuard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C3C6D0',
  },
});
