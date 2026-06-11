import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import * as attendanceService from '../api/attendanceService';
import * as siteService from '../api/siteService';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';
const EAGLE_LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHZueJsEm-6R0h_TAAf5DC7mUA4N3op7FLhysxj4BBSmMd3ScjTMLPQSISOrPL1UD9F-gEtpi7qc4hHYvKio8u-EDHnQDQNU6x_DFXV5N7j92s67vojAaAdces9mU_8ybzJsG5R3k3RIFovRoQiQyMQMCNzNrhxj6v2GkAAGWjHzdjzsSt260JmwDaOHKzgfLfBrleIlMkqJNNNAMsOOfZtY1IOGjYP0hgAQw03pSi0l8AtoKm_d8lZp03a4LBD9w61g';

const HINDI_WEEKDAYS: { [key: string]: string } = {
  'Sunday': 'रविवार',
  'Monday': 'सोमवार',
  'Tuesday': 'मंगलवार',
  'Wednesday': 'बुधवार',
  'Thursday': 'गुरुवार',
  'Friday': 'शुक्रवार',
  'Saturday': 'शनिवार'
};

export default function GuardAttendanceScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { coords: gpsCoords, error: locationError, loading: locationLoading, getCurrentLocation } = useLocation();

  const [siteDetails, setSiteDetails] = useState<any>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [secondsWorked, setSecondsWorked] = useState(0);

  const mapRef = useRef<any>(null);

  // Dynamic Date calculation
  const dateObj = new Date();
  const dayNameEn = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStrEn = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const hindiDay = HINDI_WEEKDAYS[dayNameEn] || dayNameEn;

  const loadAttendanceState = async () => {
    try {
      if (user?.current_assignment?.site_id) {
        const site = await siteService.getSiteDetail(user.current_assignment.site_id);
        setSiteDetails(site);
      }

      // Check if user is workforce_personnel and fetch attendance requirements
      if (user?.role === 'workforce_personnel' || user?.workforce_personnel_id) {
        const personnelId = user.workforce_personnel_id || user.guard_id;
        const { data: wp } = await supabase
          .from('workforce_personnel')
          .select('category:workforce_categories(attendance_required)')
          .eq('id', personnelId)
          .single();
        if (wp && (wp as any).category) {
          setAttendanceRequired((wp as any).category.attendance_required);
        }
      }

      // Fetch today's attendance record
      if (user?.guard_id || user?.workforce_personnel_id) {
        const personnelId = user.workforce_personnel_id || user.guard_id;
        const todayStr = new Date().toISOString().split('T')[0];
        let record = null;

        if (user.role === 'workforce_personnel' || user.workforce_personnel_id) {
          const { data } = await supabase
            .from('workforce_attendance')
            .select('*')
            .eq('personnel_id', personnelId)
            .eq('attendance_date', todayStr)
            .limit(1);
          if (data && data.length > 0) record = data[0];
        } else {
          const logs = await attendanceService.getAttendance({
            guard_id: personnelId,
            date: todayStr,
          });
          if (logs && logs.length > 0) record = logs[0];
        }

        if (record) {
          setAttendanceRecord(record);
          setIsCheckedIn(true);
          if (record.check_in_selfie) {
            setSelfieUri(record.check_in_selfie);
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading attendance state:', err);
    }
  };

  useEffect(() => {
    loadAttendanceState();
  }, [user]);

  // Working duration timer implementation
  useEffect(() => {
    let timer: any;
    if (isCheckedIn && attendanceRecord?.check_in_time) {
      const updateTimer = () => {
        try {
          let checkInDate: Date;
          if (attendanceRecord.check_in_time.includes('T') || attendanceRecord.check_in_time.includes('-')) {
            checkInDate = new Date(attendanceRecord.check_in_time);
          } else {
            const [h, m, s] = attendanceRecord.check_in_time.split(':').map(Number);
            checkInDate = new Date();
            checkInDate.setHours(h, m, s, 0);
          }
          
          const now = new Date();
          const diffMs = now.getTime() - checkInDate.getTime();
          if (diffMs > 0) {
            setSecondsWorked(Math.floor(diffMs / 1000));
          } else {
            setSecondsWorked(0);
          }
        } catch (e) {
          console.error(e);
        }
      };

      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setSecondsWorked(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCheckedIn, attendanceRecord]);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleTakeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied / अनुमति अस्वीकार', 'Camera permission is required to take a selfie. / सेल्फी लेने के लिए कैमरे की अनुमति आवश्यक है।');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const handleCheckInAction = async () => {
    if (submitting) return;

    const personnelId = user?.workforce_personnel_id || user?.guard_id;
    if (!user || !personnelId) {
      Alert.alert('Error / त्रुटि', 'User information not found. / उपयोगकर्ता की जानकारी नहीं मिली।');
      return;
    }

    const siteId = user.current_assignment?.site_id || siteDetails?.id;
    if (!siteId) {
      Alert.alert('Error / त्रुटि', 'Site information not found. / साइट की जानकारी नहीं मिली।');
      return;
    }

    if (attendanceRequired && (!gpsCoords || !isInside)) {
      let errorMessage = 'You must be inside the site geofence to mark attendance. / हाजिरी लगाने के लिए आपका साइट की सीमा के भीतर होना आवश्यक है।';
      
      if (gpsCoords && siteDetails) {
        const distance = Math.round(calculateHaversineDistance(
          gpsCoords.latitude,
          gpsCoords.longitude,
          siteDetails.latitude,
          siteDetails.longitude
        ));
        const radius = siteDetails.geofence_radius || 100;
        errorMessage += `\n\nDistance: ${distance}m / ${radius}m allowed\nYour location: ${gpsCoords.latitude.toFixed(6)}, ${gpsCoords.longitude.toFixed(6)}`;
      }
      
      Alert.alert('Out of Geofence / सीमा से बाहर', errorMessage);
      return;
    }

    if (!selfieUri) {
      Alert.alert('Selfie Required / सेल्फी आवश्यक', 'Please take a verification selfie first. / कृपया पहले सत्यापन के लिए सेल्फी लें।');
      return;
    }

    try {
      setSubmitting(true);
      const todayStr = new Date().toISOString().split('T')[0];

      if (user.role === 'workforce_personnel' || user.workforce_personnel_id) {
        if (!isCheckedIn) {
          // Check-in
          const checkInTime = new Date().toISOString();
          const { data, error } = await supabase
            .from('workforce_attendance')
            .insert({
              personnel_id: personnelId,
              site_id: siteId,
              attendance_date: todayStr,
              check_in_time: checkInTime,
              check_in_selfie: selfieUri,
              check_in_latitude: gpsCoords?.latitude || null,
              check_in_longitude: gpsCoords?.longitude || null,
              status: 'present',
              is_manual_entry: false
            })
            .select()
            .single();

          if (error) throw error;
          setAttendanceRecord(data);
          setIsCheckedIn(true);
          Alert.alert('Success / सफलता', 'Checked in successfully. / चेक इन सफलतापूर्वक पूरा हुआ।');
        } else {
          // Check-out
          const checkOutTime = new Date().toISOString();
          const { data, error } = await supabase
            .from('workforce_attendance')
            .update({
              check_out_time: checkOutTime,
              check_out_selfie: selfieUri,
            })
            .eq('id', attendanceRecord.id)
            .select()
            .single();

          if (error) throw error;
          setAttendanceRecord(data);
          Alert.alert('Success / सफलता', 'Checked out successfully. / चेक आउट सफलतापूर्वक पूरा हुआ।');
        }
      } else {
        // Legacy guard check-in/out
        if (!isCheckedIn) {
          const res = await attendanceService.checkIn({
            guard_id: personnelId,
            site_id: siteId,
            selfie_url: selfieUri,
            latitude: gpsCoords?.latitude || 0,
            longitude: gpsCoords?.longitude || 0,
          } as any);
          setAttendanceRecord(res);
          setIsCheckedIn(true);
          Alert.alert('Success / सफलता', 'Checked in successfully. / चेक इन सफलतापूर्वक पूरा हुआ।');
        } else {
          const res = await attendanceService.checkOut(attendanceRecord.id, {
            guard_id: personnelId,
            latitude: gpsCoords?.latitude || 0,
            longitude: gpsCoords?.longitude || 0,
            selfie_url: selfieUri,
          } as any);
          setAttendanceRecord(res);
          Alert.alert('Success / सफलता', 'Checked out successfully. / चेक आउट सफलतापूर्वक पूरा हुआ।');
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error / त्रुटि', err?.message || 'Failed to update attendance status. / हाजिरी की स्थिति अपडेट करने में विफल।');
    } finally {
      setSubmitting(false);
    }
  };

  const isInside = !attendanceRequired || (gpsCoords && siteDetails && calculateHaversineDistance(
    gpsCoords.latitude,
    gpsCoords.longitude,
    siteDetails.latitude,
    siteDetails.longitude
  ) <= Number(siteDetails.geofence_radius));

  const navItems = [
    { key: 'home', icon: 'home' as const, label: 'Home' },
    { key: 'attendance', icon: 'calendar-today' as const, label: 'Attendance' },
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
    } else if (key === 'profile') {
      navigation.navigate('GuardProfile');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ═══ TopAppBar aligned with mockup ═══ */}
      <View style={[s.topBar, { height: 60 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            
            <View style={s.logoContainer}>
              <Image source={{ uri: EAGLE_LOGO }} style={s.logoImage} />
            </View>
          </View>

          <View style={s.topBarCenter}>
            <Text style={s.topBarTitle}>Punch Attendance</Text>
            <Text style={s.topBarSubtitle}>हाजिरी पंच</Text>
          </View>

          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications" size={26} color={Colors.primary} />
              <View style={s.notifBadgeRedDot} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ─── Map Section ─── */}
        <View style={s.mapContainer}>
          {siteDetails ? (
            <MapView
              ref={mapRef}
              style={s.map}
              initialRegion={{
                latitude: siteDetails.latitude,
                longitude: siteDetails.longitude,
                latitudeDelta: 0.004,
                longitudeDelta: 0.004,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Circle
                center={{ latitude: siteDetails.latitude, longitude: siteDetails.longitude }}
                radius={siteDetails.geofence_radius}
                strokeWidth={2}
                strokeColor={Colors.primary}
                fillColor="rgba(0, 39, 82, 0.05)"
              />

              <Marker
                coordinate={{ latitude: siteDetails.latitude, longitude: siteDetails.longitude }}
                title={siteDetails.site_name}
              />

              {gpsCoords && (
                <Marker
                  coordinate={{ latitude: gpsCoords.latitude, longitude: gpsCoords.longitude }}
                  title="Your Location"
                >
                  <View style={s.userDotContainer}>
                    <View style={s.pulseRing} />
                    <View style={s.userDot} />
                  </View>
                </Marker>
              )}
            </MapView>
          ) : (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}

          {/* Location Loading/Error Indicator */}
          {locationLoading && (
            <View style={s.gpsBadgeContainer}>
              <View style={s.gpsBadge}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <View style={s.gpsBadgeTextContainer}>
                  <Text style={[s.gpsBadgeText, { color: Colors.primary }]}>Fetching GPS...</Text>
                  <Text style={[s.gpsBadgeTextHindi, { color: Colors.primary }]}>GPS प्राप्त हो रहा है...</Text>
                </View>
              </View>
            </View>
          )}
          {locationError && !locationLoading && (
            <View style={s.gpsBadgeContainer}>
              <View style={s.gpsBadge}>
                <View style={[s.statusIndicatorDot, { backgroundColor: Colors.secondary }]} />
                <View style={s.gpsBadgeTextContainer}>
                  <Text style={[s.gpsBadgeText, { color: Colors.secondary }]}>GPS Error</Text>
                  <Text style={[s.gpsBadgeTextHindi, { color: Colors.secondary }]}>{locationError}</Text>
                </View>
              </View>
            </View>
          )}
          {!locationLoading && !locationError && gpsCoords && (
            <View style={s.gpsBadgeContainer}>
              <View style={s.gpsBadge}>
                <View style={[s.statusIndicatorDot, { backgroundColor: isInside ? Colors.successGreen : Colors.secondary }]} />
                <View style={s.gpsBadgeTextContainer}>
                  <Text style={[s.gpsBadgeText, { color: isInside ? Colors.successGreen : Colors.secondary }]}>
                    {isInside ? 'Inside Geofence ✅' : 'Outside Geofence ❌'}
                  </Text>
                  <Text style={[s.gpsBadgeTextHindi, { color: isInside ? Colors.successGreen : Colors.secondary }]}>
                    {isInside ? 'सीमा के अंदर ✅' : 'सीमा के बाहर ❌'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ─── Metadata Card (Floating over map edge) ─── */}
        <View style={s.metaCard}>
          <View style={s.metaHalf}>
            <View style={s.metaIconContainer}>
              <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={s.metaValue}>{dateStrEn}</Text>
              <Text style={s.metaSubValue}>{dayNameEn} / {hindiDay}</Text>
            </View>
          </View>
          
          <View style={s.metaDivider} />
          
          <View style={s.metaHalf}>
            <View style={[s.metaIconContainer, { backgroundColor: Colors.secondaryFixed }]}>
              <MaterialIcons name="light-mode" size={20} color={Colors.secondary} />
            </View>
            <View>
              <Text style={s.metaValue}>
                {user?.shift_type === 'night' ? 'Night Shift' : 'Day Shift'}
              </Text>
              <Text style={s.metaSubValue}>
                {user?.shift_type === 'night' ? 'नाइट शिफ्ट 🌙' : 'डे शिफ्ट ☀️'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Identity Verification Section ─── */}
        <View style={s.verificationCard}>
          <View style={s.verificationHeader}>
            <View>
              <Text style={s.verificationTitle}>Identity Verification</Text>
              <Text style={s.verificationSubTitle}>पहचान सत्यापन</Text>
            </View>
            <View style={s.requiredBadge}>
              <Text style={s.requiredBadgeText}>REQUIRED</Text>
            </View>
          </View>
          
          <View style={s.cameraPreviewContainer}>
            <View style={s.cameraPreviewFrame}>
              {selfieUri ? (
                <Image source={{ uri: selfieUri }} style={s.capturedSelfie} />
              ) : (
                <View style={s.placeholderIconFrame}>
                  <Text style={s.placeholderText}>Identity Preview</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.85} 
              style={s.cameraCaptureBtn} 
              onPress={handleTakeSelfie}
            >
              <MaterialIcons name="photo-camera" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={s.previewInfoRow}>
            <View style={{ flex: 1, alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.selfieRequiredText}>Live Selfie Required / लाइव सेल्फी आवश्यक</Text>
              <Text style={s.selfieInstructText}>
                Please ensure your face is clearly visible in well-lit conditions. / कृपया सुनिश्चित करें कि आपका चेहरा अच्छी रोशनी में स्पष्ट रूप से दिखाई दे रहा है।
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.verificationDetailsRow}>
            <View style={s.detailCol}>
              <View style={s.detailIconWrapper}>
                <MaterialIcons name="schedule" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={s.detailValue}>08:00 AM - 08:00 PM</Text>
                <Text style={s.detailLabel}>Shift Timing</Text>
              </View>
            </View>

            <View style={s.timerCol}>
              <Text style={s.timerValue}>{formatDuration(secondsWorked)}</Text>
              <Text style={s.detailLabel}>Working Duration</Text>
            </View>
          </View>
        </View>

        {/* ─── Action Button ─── */}
        <View style={s.actionSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              s.checkInBtn,
              (!isInside || !selfieUri) && s.checkInBtnDisabled,
            ]}
            onPress={handleCheckInAction}
            disabled={submitting || !isInside || !selfieUri}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={s.checkInBtnText}>
                {isCheckedIn ? 'CHECK OUT / चेक आउट' : 'CHECK IN / चेक इन'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={s.noteContainer}>
            <MaterialIcons name="gpp-maybe" size={14} color={Colors.onSurfaceVariant} style={{ marginTop: 2 }} />
            <Text style={s.actionNote}>
              Action will be logged with GPS coordinates / कार्रवाई GPS निर्देशांक के साथ लॉग की जाएगी
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ BottomNavBar ═══ */}
      <View style={s.bottomNav}>
      {navItems.map((item) => {
        const isActive = item.key === 'attendance';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  topBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1.2,
  },
  backBtn: {
    padding: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  logoTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 16,
    fontFamily: 'Manrope',
  },
  logoSubtitle: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topBarCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1.5,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  topBarSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  topBarIconBtn: {
    padding: 6,
    position: 'relative',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: 320,
    position: 'relative',
    backgroundColor: Colors.surfaceContainer,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  gpsBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsBadgeTextContainer: {
    flexDirection: 'column',
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  gpsBadgeTextHindi: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 0.5,
  },
  userDotContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    position: 'absolute',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  metaCard: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1a3d6d',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    zIndex: 10,
  },
  metaHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  metaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(214, 227, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  metaSubValue: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  metaDivider: {
    height: 32,
    width: 1,
    backgroundColor: 'rgba(195, 198, 208, 0.5)',
    marginHorizontal: 12,
  },
  verificationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#1a3d6d',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  verificationSubTitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  requiredBadge: {
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  cameraPreviewContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  cameraPreviewFrame: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 4,
    borderColor: Colors.primaryFixed,
    overflow: 'hidden',
    backgroundColor: '#f4f3f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedSelfie: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderIconFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 227, 255, 0.2)',
    width: '100%',
  },
  placeholderText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cameraCaptureBtn: {
    position: 'absolute',
    bottom: 12,
    right: SCREEN_WIDTH / 2 - 96 + 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  previewInfoRow: {
    marginTop: 8,
  },
  selfieRequiredText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  selfieInstructText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(195, 198, 208, 0.3)',
    marginVertical: 16,
  },
  verificationDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1.2,
  },
  detailIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  timerCol: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  checkInBtn: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  checkInBtnDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  noteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  actionNote: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
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
