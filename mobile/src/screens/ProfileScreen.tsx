import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { useFileUpload } from '../hooks/useFileUpload';
import CachedImage from '../components/CachedImage';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const { getLabel } = usePersonnelCategory();
  const { upload } = useFileUpload();

  // Profile Editable Details
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('Rajesh Kumar');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('rajesh.k@panindia.com');
  const [location, setLocation] = useState('Sector 144, Electronic City, Bangalore');
  const [avatar, setAvatar] = useState(
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_0DYqfWCCqQyglK94cmlyY65QjURQZnqvzhCI-kNOrwcWq2iOa9t5XZ4FGwy1gk3b0zTBjec770O5p4bKmaCXOteEABq8ZCHqhLT8ORHLvv6JEOPbZoWo7NcnB-IHh-PT1gs9sE1cuK9kndYAaNxoSECXrRdUMUIixoYLMzdPQF3vhhLU--vzBJtjvIGV-1-dUy1vDqr6XNmbL4Dci9rGdgR5YI8u5jOGLarTHD-HXhld5SubhQEh8NspBgydwjybYZLml0DDjOI'
  );

  useEffect(() => {
    if (user) {
      setName(user.name || 'Rajesh Kumar');
      setPhone(user.phone ? `+91 ${user.phone.replace(/^\+91/, '')}` : '+91 98765 43210');
      if (user.avatar_url) {
        setAvatar(user.avatar_url);
      }
    }
  }, [user]);

  const handleEditToggle = async () => {
    if (isEditMode) {
      setSaving(true);
      try {
        const rawPhone = phone.replace(/\D/g, '');
        const dbPhone = rawPhone.length === 10 ? rawPhone : phone;

        let uploadedAvatarUrl = avatar;
        if (avatar && !avatar.startsWith('http')) {
          const uploadRes = await upload({
            fileUri: avatar,
            category: 'profiles',
          });

          if (uploadRes.success && uploadRes.url) {
            uploadedAvatarUrl = uploadRes.url;
          } else {
            Alert.alert('Upload Failed / अपलोड विफल', uploadRes.error?.message || 'Could not upload profile photo. Please try again. / प्रोफ़ाइल फ़ोटो अपलोड नहीं कर सके। कृपया पुनः प्रयास करें।');
            setSaving(false);
            return;
          }
        }

        if (updateProfile) {
          await updateProfile({
            name: name.trim(),
            phone: dbPhone,
            avatar_url: uploadedAvatarUrl,
          });
        }
        Alert.alert('Profile Saved / प्रोफ़ाइल सहेजी गई', 'Your updated profile information has been saved successfully. / आपकी अद्यतन प्रोफ़ाइल जानकारी सफलतापूर्वक सहेज ली गई है।');
        setIsEditMode(false);
      } catch (err: any) {
        Alert.alert('Save Failed / सहेजना विफल', err.message || 'Could not update profile. Please try again. / प्रोफ़ail अपडेट नहीं कर सके। कृपया पुनः प्रयास करें।');
      } finally {
        setSaving(false);
      }
    } else {
      setIsEditMode(true);
    }
  };

  const launchCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is required to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery access is required to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleCameraPress = () => {
    Alert.alert('Upload Photo', 'Select a professional profile picture from camera or gallery.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: launchCamera },
      { text: 'Gallery', onPress: launchGallery },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the Pan India Security application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleSettingOption = (optionName: string) => {
    Alert.alert(optionName, `Navigate to ${optionName} setup screen.`);
  };

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPress = (key: string) => {
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
              aria-label="Back"
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Profile</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditToggle}
            style={s.topBarIconBtn}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <MaterialIcons name={isEditMode ? 'save' : 'edit'} size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Header Section ─── */}
        <View style={s.profileHeader}>
          <View style={s.avatarWrap}>
            <View style={s.avatarBorder}>
              <CachedImage
                uri={avatar}
                style={s.avatarImage as any}
                containerStyle={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                fallbackIcon="person"
                fallbackIconSize={48}
                showRetry={false}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.cameraBtn}
              onPress={handleCameraPress}
            >
              <MaterialIcons name="photo-camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {isEditMode ? (
            <TextInput
              style={s.adminNameInput}
              value={name}
              onChangeText={setName}
              placeholder="Admin Name"
            />
          ) : (
            <Text style={s.adminName}>{name}</Text>
          )}
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={s.adminId}>
            ID: {user?.id ? `PSI-ADM-${user.id.substring(0, 4).toUpperCase()}` : 'PSI-ADM-001'}
          </Text>
        </View>

        {/* ─── Contact Information Card ─── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <MaterialIcons name="contact-page" size={24} color={Colors.primary} />
            <Text style={s.cardTitle}>Contact Information</Text>
          </View>

          <View style={s.cardBody}>
            {/* Phone */}
            <View style={s.infoRow}>
              <View style={s.infoIconBox}>
                <MaterialIcons name="call" size={18} color={Colors.primary} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Phone Number</Text>
                {isEditMode ? (
                  <TextInput
                    style={s.infoInput}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={s.infoVal}>{phone}</Text>
                )}
              </View>
            </View>

            {/* Email */}
            <View style={s.infoRow}>
              <View style={s.infoIconBox}>
                <MaterialIcons name="mail" size={18} color={Colors.primary} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Email Address</Text>
                {isEditMode ? (
                  <TextInput
                    style={s.infoInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={s.infoVal}>{email}</Text>
                )}
              </View>
            </View>

            {/* Location */}
            <View style={s.infoRow}>
              <View style={s.infoIconBox}>
                <MaterialIcons name="location-on" size={18} color={Colors.primary} />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Work Location</Text>
                {isEditMode ? (
                  <TextInput
                    style={s.infoInput}
                    value={location}
                    onChangeText={setLocation}
                  />
                ) : (
                  <Text style={s.infoVal}>{location}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ─── Account Settings Section ─── */}
        <View style={s.settingsSection}>
          <View style={s.settingsHeader}>
            <Text style={s.settingsHeaderLabel}>Account Settings</Text>
          </View>

          <View style={s.settingsList}>
            {/* Change Password */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.settingsItem}
              onPress={() => handleSettingOption('Change Password')}
            >
              <View style={s.settingsItemLeft}>
                <MaterialIcons name="lock-reset" size={22} color={Colors.onSurfaceVariant} />
                <Text style={s.settingsItemText}>Change Password</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.outlineVariant} />
            </TouchableOpacity>

            {/* Notification Preferences */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.settingsItem}
              onPress={() => handleSettingOption('Notification Preferences')}
            >
              <View style={s.settingsItemLeft}>
                <MaterialIcons name="notifications-active" size={22} color={Colors.onSurfaceVariant} />
                <Text style={s.settingsItemText}>Notification Preferences</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.outlineVariant} />
            </TouchableOpacity>

            {/* Security Questions */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.settingsItem}
              onPress={() => handleSettingOption('Security Questions')}
            >
              <View style={s.settingsItemLeft}>
                <MaterialIcons name="security" size={22} color={Colors.onSurfaceVariant} />
                <Text style={s.settingsItemText}>Security Questions</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.outlineVariant} />
            </TouchableOpacity>

            {/* Document Vault */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.settingsItem}
              onPress={() => handleSettingOption('Document Vault')}
            >
              <View style={s.settingsItemLeft}>
                <MaterialIcons name="inventory-2" size={22} color={Colors.onSurfaceVariant} />
                <Text style={s.settingsItemText}>Document Vault</Text>
              </View>
              <View style={s.actionNeededRow}>
                <View style={s.actionBadge}>
                  <Text style={s.actionBadgeText}>ACTION NEEDED</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={Colors.outlineVariant} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Sign Out secondary action ─── */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={s.signOutLink}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color={Colors.secondary} />
          <Text style={s.signOutLinkText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Fixed Bottom Action Bar (Mobile only sticky bar) ═══ */}
      <View style={s.fixedBottomBar}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[s.mainActionBtn, isEditMode ? s.btnSave : s.btnEdit]}
          onPress={handleEditToggle}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name={isEditMode ? 'save' : 'edit-square'} size={20} color="#FFFFFF" />
              <Text style={s.mainActionBtnText}>
                {isEditMode ? 'Save Changes' : 'Edit Profile'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
    backgroundColor: Colors.surface,
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
    gap: 8,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackLg,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1.5 },
  },
  adminName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.onBackground,
    marginBottom: 4,
  },
  adminNameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onBackground,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    textAlign: 'center',
    width: '80%',
  },
  adminBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  adminId: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardBody: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  infoInput: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    height: 32,
    backgroundColor: '#ffffff',
  },
  settingsSection: {
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
  settingsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  settingsHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  settingsList: {
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderColor: Colors.outlineVariant,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  actionNeededRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  actionBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  signOutLinkText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    zIndex: 45,
  },
  mainActionBtn: {
    height: 48,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  btnEdit: {
    backgroundColor: Colors.secondary,
  },
  btnSave: {
    backgroundColor: Colors.primary,
  },
  mainActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
});
