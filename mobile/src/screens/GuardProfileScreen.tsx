import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Linking,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as guardService from '../api/guardService';
import * as siteService from '../api/siteService';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';
const EAGLE_LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHZueJsEm-6R0h_TAAf5DC7mUA4N3op7FLhysxj4BBSmMd3ScjTMLPQSISOrPL1UD9F-gEtpi7qc4hHYvKio8u-EDHnQDQNU6x_DFXV5N7j92s67vojAaAdces9mU_8ybzJsG5R3k3RIFovRoQiQyMQMCNzNrhxj6v2GkAAGWjHzdjzsSt260JmwDaOHKzgfLfBrleIlMkqJNNNAMsOOfZtY1IOGjYP0hgAQw03pSi0l8AtoKm_d8lZp03a4LBD9w61g';

export default function GuardProfileScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, signOutUser, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guardDetail, setGuardDetail] = useState<guardService.GuardProfile | null>(null);
  const [siteDetails, setSiteDetails] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Status pulse animation
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 2, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0.5, 2],
    outputRange: [1, 0],
  });

  const loadProfileData = async () => {
    if (!user?.guard_id && !user?.workforce_personnel_id) {
      setLoading(false);
      return;
    }

    try {
      // For workforce_personnel users, query directly from workforce_personnel table
      if (user.role === 'workforce_personnel' || user.workforce_personnel_id) {
        const personnelId = user.workforce_personnel_id || user.guard_id;
        
        const { data: detail, error } = await supabase
          .from('workforce_personnel')
          .select(`
            *,
            category:workforce_categories(name, prefix_code),
            site_assignments(
              id, site_id, shift_type, is_active, start_date,
              sites(site_name, client_name, address)
            )
          `)
          .eq('id', personnelId)
          .single();

        if (error) {
          console.error('Error fetching workforce personnel details:', error);
          throw error;
        }

        if (detail) {
          // Map to GuardProfile format for compatibility
          const mappedDetail: any = {
            id: detail.id,
            user_id: detail.user_id,
            employee_id: detail.employee_id,
            name: detail.name,
            phone: detail.phone,
            photo_url: detail.photo_url,
            employment_status: detail.employment_status,
            shift_type: detail.shift_type,
            base_salary: detail.base_salary,
            joining_date: detail.joining_date,
            emergency_contact_name: detail.emergency_contact_name,
            emergency_contact_phone: detail.emergency_contact_phone,
            bank_account_number: detail.bank_account_number,
            bank_ifsc: detail.bank_ifsc,
            bank_name: detail.bank_name,
            aadhaar_number: detail.aadhaar_number,
            pan_number: detail.pan_number,
            address: detail.address,
            guard_site_assignments: detail.site_assignments,
          };
          setGuardDetail(mappedDetail);
          if (detail.photo_url) {
            setAvatarUri(detail.photo_url);
          }
        }
      } else {
        // For legacy guards, use the Edge Function
        const detail = await guardService.getGuardDetail(user.guard_id || '');
        setGuardDetail(detail);
        if (detail.photo_url) {
          setAvatarUri(detail.photo_url);
        }
      }

      if (user?.current_assignment?.site_id) {
        const site = await siteService.getSiteDetail(user.current_assignment.site_id);
        setSiteDetails(site);
      }
    } catch (err) {
      console.error('Error fetching guard profile details:', err);
      Alert.alert('Error', 'Failed to load profile details. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });

    return unsubscribe;
  }, [user, navigation]);

  const handleUpdateAvatar = async () => {
    if (!user?.guard_id) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is required to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setUploadingAvatar(true);
      try {
        const docResult = await guardService.uploadGuardDocument(
          user.guard_id,
          'photo',
          selectedUri,
          `avatar_${Date.now()}.jpg`
        );

        await guardService.updateGuard(user.guard_id, {
          photo_url: docResult.document_url,
        });

        await refreshProfile();
        setAvatarUri(docResult.document_url);
        Alert.alert('Success', 'Profile photo updated successfully!');
      } catch (uploadErr) {
        console.error('Failed to upload avatar:', uploadErr);
        Alert.alert('Upload Failed', 'Could not update profile photo.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleCallEmergency = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout / लॉगआउट',
      'Are you sure you want to log out?\nक्या आप लॉग आउट करना चाहते हैं?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

  const navItems = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'home') {
      navigation.navigate('GuardHome');
    } else if (key === 'attendance') {
      navigation.navigate('GuardAttendanceHistory');
    } else if (key === 'salary') {
      navigation.navigate('GuardSalarySlips');
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Loading profile details...</Text>
      </View>
    );
  }

  // Format joined date
  const joinedDateText = guardDetail?.joining_date
    ? new Date(guardDetail.joining_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '15 Mar 2022';

  // Format Guard ID
  const guardIdShort = guardDetail?.employee_id || user?.employee_id || 'Not Assigned';

  // Bank account masked
  const bankAccMasked = guardDetail?.bank_account_number
    ? `A/C: ${'*'.repeat(12)}${guardDetail.bank_account_number.slice(-4)}`
    : 'A/C: ************5678';

  // Aadhaar masked
  const aadhaarMasked = guardDetail?.aadhaar_number
    ? `**** ${guardDetail.aadhaar_number.slice(-4)}`
    : '**** 1234';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ═══ Top AppBar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image
              source={{ uri: EAGLE_LOGO }}
              style={s.logoImage as any}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.topBarIconBtn}
            onPress={() => navigation.navigate('NotificationCenter')}
          >
            <MaterialIcons name="notifications-none" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Avatar Header Card ─── */}
        <View style={s.profileHeaderCard}>
          <View style={s.avatarContainer}>
            <View style={s.avatarBorder}>
              {uploadingAvatar ? (
                <View style={s.avatarSpinner}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                <Image
                  source={{ uri: avatarUri || user?.avatar_url || DEFAULT_AVATAR }}
                  style={s.avatarImg}
                />
              )}
            </View>
            {/* Camera Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.cameraBtn}
              onPress={handleUpdateAvatar}
              disabled={uploadingAvatar}
            >
              <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
            </TouchableOpacity>
            {/* Status Pulse Dot */}
            <View style={s.statusDot}>
              <Animated.View
                style={[
                  s.statusPulseRing,
                  { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
                ]}
              />
            </View>
          </View>

          <Text style={s.profileName}>{user?.name || 'Suresh Mahto'}</Text>
          <Text style={s.profileId}>ID: {guardIdShort}</Text>
        </View>

        {/* ─── Personal Details Card ─── */}
        <View style={s.cardWrapper}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>Personal Details / व्यक्तिगत विवरण</Text>
            <MaterialIcons name="info-outline" size={20} color={Colors.onSurfaceVariant} />
          </View>
          <View style={s.cardBody}>
            <View style={s.gridRow}>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Phone / फ़ोन</Text>
                <Text style={s.fieldValue}>{user?.phone || '+91 97777 77780'}</Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Joined / शामिल हुए</Text>
                <Text style={s.fieldValue}>{joinedDateText}</Text>
              </View>
            </View>
            <View style={s.gridRow}>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Blood Group / रक्त समूह</Text>
                <Text style={[s.fieldValue, { color: Colors.secondary }]}>
                  {(guardDetail as any)?.blood_group || guardDetail?.education || 'O+'}
                </Text>
              </View>
              <View style={s.gridCol}>
                <Text style={s.fieldLabel}>Category / श्रेणी</Text>
                <Text style={s.fieldValue}>
                  {(guardDetail as any)?.category || user?.role || 'Guard'}
                </Text>
              </View>
            </View>
            <View style={s.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Aadhaar / आधार</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={s.fieldValue}>{aadhaarMasked}</Text>
                  <MaterialIcons name="verified" size={16} color={Colors.successGreen} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Emergency Contact Card ─── */}
        <View style={s.emergencyCard}>
          <View style={s.emergencyLeft}>
            <View style={s.emergencyIconFrame}>
              <MaterialIcons name="share-location" size={24} color={Colors.onPrimaryContainer} />
            </View>
            <View>
              <Text style={s.emergencyLabel}>Emergency Contact</Text>
              <Text style={s.emergencyName}>
                {guardDetail?.emergency_contact_name || 'Kiran Yadav'} (Wife)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={s.emergencyCallBtn}
            onPress={() =>
              handleCallEmergency(guardDetail?.emergency_contact_phone || '+91 98765 43210')
            }
          >
            <MaterialIcons name="call" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* ─── Bank Account Card ─── */}
        <TouchableOpacity activeOpacity={0.8} style={s.bankCard}>
          <View style={s.bankIconFrame}>
            <MaterialIcons name="account-balance" size={26} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bankLabel}>Salary Account / बैंक खाता</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.bankName}>
                {guardDetail?.bank_name || 'State Bank of India (SBI)'}
              </Text>
              <View style={s.verifiedPill}>
                <MaterialIcons name="check-circle" size={12} color={Colors.successGreen} />
                <Text style={s.verifiedText}>VERIFIED</Text>
              </View>
            </View>
            <Text style={s.bankAccNumber}>{bankAccMasked}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* ─── Assigned Site Card ─── */}
        <View style={s.cardWrapper}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>Assigned Site / नियुक्त स्थान</Text>
            <View style={s.activePill}>
              <View style={s.activeDot} />
              <Text style={s.activeText}>Active Now</Text>
            </View>
          </View>
          <View style={s.siteMapBox}>
            {siteDetails ? (
              <MapView
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: siteDetails.latitude,
                  longitude: siteDetails.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Circle
                  center={{ latitude: siteDetails.latitude, longitude: siteDetails.longitude }}
                  radius={siteDetails.geofence_radius}
                  strokeWidth={2}
                  strokeColor={Colors.primary}
                  fillColor="rgba(0, 39, 82, 0.05)"
                />
                <Marker
                  coordinate={{
                    latitude: siteDetails.latitude,
                    longitude: siteDetails.longitude,
                  }}
                  title={siteDetails.site_name}
                />
              </MapView>
            ) : (
              <View style={s.siteMapPlaceholder}>
                <Image
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida/AP1WRLtX4zBUhWvChlhyIgqWdEOU92ok1yF1uKKYoY0-tRo5usSBxAkXdfVNsWTOGSogvpGqs5hvk8ZOWY9OU9VzYKlb4bYsZnikJLd6lBB8ArKWPLcEu-8KfZcoTxqqOcodmsrNqDsCM_efjM2HnQOrzJ6S_ehAQ1EMvWo23JBUQ5oBxGh92wnSsFti7jCMRRp4DqUKpmzXcTyrwLFNndOMFUpBrggV4korJzhWQ-APhraz7lPqeNDGL6Luc_g',
                  }}
                  style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]}
                  resizeMode="cover"
                />
                <MaterialIcons name="location-on" size={40} color={Colors.secondary} />
              </View>
            )}
          </View>
          <View style={s.siteInfoBox}>
            <Text style={s.siteName}>{siteDetails?.site_name || 'No site assigned'}</Text>
            <Text style={s.siteAddress}>
              {siteDetails?.address || 'Not Assigned'}
            </Text>
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={s.actionsGroup}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={s.actionBtn}
            onPress={() => navigation.navigate('EditGuardProfile')}
          >
            <View style={s.actionBtnLeft}>
              <MaterialIcons name="edit" size={22} color={Colors.primary} />
              <Text style={s.actionBtnText}>Edit Profile / प्रोफ़ाइल संपादित करें</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={s.actionBtn}
            onPress={() => navigation.navigate('GuardDocuments')}
          >
            <View style={s.actionBtnLeft}>
              <MaterialIcons name="security" size={22} color={Colors.primary} />
              <Text style={s.actionBtnText}>Document Vault / दस्तावेज़ तिजोरी</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={s.actionBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={s.actionBtnLeft}>
              <MaterialIcons name="settings" size={22} color={Colors.primary} />
              <Text style={s.actionBtnText}>Settings / सेटिंग्स</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity activeOpacity={0.8} style={s.logoutBtn} onPress={handleLogout}>
            <View style={s.actionBtnLeft}>
              <MaterialIcons name="logout" size={22} color={Colors.error} />
              <Text style={s.logoutBtnText}>Logout / लॉगआउट</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="rgba(186, 26, 26, 0.4)" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══ Bottom Navigation Bar ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'profile';
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
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.outline,
    fontWeight: '600',
    fontSize: 14,
  },

  /* ── Top Bar ── */
  topBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  topBarIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },

  /* ── Profile Header Card ── */
  profileHeaderCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: Colors.primaryFixed,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.successGreen,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusPulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.successGreen,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  profileId: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    letterSpacing: 1.5,
    fontWeight: '600',
  },

  /* ── Card Wrapper (shared) ── */
  cardWrapper: {
    backgroundColor: Colors.surfaceContainerLowest,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 20,
    gap: 20,
  },

  /* ── Grid fields ── */
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  /* ── Emergency Contact ── */
  emergencyCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emergencyIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onPrimaryContainer,
    marginTop: 2,
  },
  emergencyCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  /* ── Bank Account ── */
  bankCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  bankIconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  bankAccNumber: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  /* ── Assigned Site ── */
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.successGreen,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
    textTransform: 'uppercase',
  },
  siteMapBox: {
    height: 160,
    backgroundColor: Colors.surfaceContainerHigh,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteMapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteInfoBox: {
    padding: 16,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  siteAddress: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },

  /* ── Action Buttons ── */
  actionsGroup: {
    gap: 12,
  },
  actionBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  logoutBtn: {
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },

  /* ── Bottom Nav ── */
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
    backgroundColor: Colors.surfaceContainerHighest,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    zIndex: 100,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  navItemActive: {
    backgroundColor: Colors.primary,
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
  logoImage: {
    width: 175,
    height: 44,
    resizeMode: 'contain',
  },
});
