import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import Skeleton from '../components/Skeleton';
import * as siteService from '../api/siteService';
import * as siteAssignmentService from '../api/siteAssignmentService';
import * as workforceAttendanceService from '../api/workforceAttendanceService';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const mapStyle: any[] = [];

// ─── Types ──────────────────────────────────────────
interface SiteDetailProps {
  navigation: any;
  route?: any;
}

interface PersonnelItem {
  id: string; // personnel_id
  assignmentId?: string; // assignment record UUID
  name: string;
  shift: 'DAY' | 'NIGHT';
  status: 'On-Duty' | 'Off-Duty';
  avatar?: string;
  initials: string;
  initialsColor: string;
  badge?: string;
  categoryPrefix?: string;
  categoryName?: string;
}

interface AttendanceRecord {
  personnelId: string;
  personnelName: string;
  categoryName: string;
  status: 'present' | 'absent' | 'not_marked';
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
}

export default function SiteDetailScreen({ navigation, route }: SiteDetailProps) {
  const s = useScaledStyles(styles);
  const siteId = route?.params?.siteId;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  // Local state for live data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [siteDetails, setSiteDetails] = useState<siteService.SiteProfile | null>(null);
  const [assignedPersonnel, setAssignedPersonnel] = useState<PersonnelItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, notMarked: 0 });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'Profile' | 'Guards' | 'Inspections' | 'Settings'>('Profile');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Edit settings form state
  const [editAddress, setEditAddress] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editGeofenceRadius, setEditGeofenceRadius] = useState('');
  const [editDayStart, setEditDayStart] = useState('');
  const [editDayEnd, setEditDayEnd] = useState('');
  const [editNightStart, setEditNightStart] = useState('');
  const [editNightEnd, setEditNightEnd] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Google Maps Search and GPS Lock States
  const { coords: deviceCoords, loading: locationLoading, getCurrentLocation } = useLocation();
  const [activeLocationTab, setActiveLocationTab] = useState<'search' | 'gps' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Debounce search query to avoid overloading API
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const delayDebounceFn = setTimeout(() => {
        fetchSearchSuggestions(searchQuery);
      }, 400);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setPredictions([]);
    }
  }, [searchQuery]);

  // Google Maps API Methods
  const fetchSearchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setPredictions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete:', error);
      setPredictions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPrediction = async (prediction: any) => {
    setSearchQuery(prediction.description);
    setPredictions([]);
    setSearchLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        const formattedAddress = data.result.formatted_address || prediction.description;
        
        setEditLatitude(lat.toString());
        setEditLongitude(lng.toString());
        setEditAddress(formattedAddress);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        }
      } else {
        Alert.alert('Location Details Error', 'Could not fetch coordinates for this location.');
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      Alert.alert('Network Error', 'Failed to retrieve location coordinates.');
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        setEditAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleApplyManualCoords = () => {
    const lat = parseFloat(editLatitude);
    const lng = parseFloat(editLongitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Latitude must be -90 to 90, Longitude must be -180 to 180.');
      return;
    }
    fetchAddressFromCoords(lat, lng);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
    Alert.alert('Coordinates Updated', `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
  };

  const handleRecalibrateGPS = async () => {
    const coords = await getCurrentLocation();
    if (coords) {
      setEditLatitude(coords.latitude.toString());
      setEditLongitude(coords.longitude.toString());
      fetchAddressFromCoords(coords.latitude, coords.longitude);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
      Alert.alert('GPS Calibrated', `Coordinates captured: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    } else {
      Alert.alert('GPS Failure', 'Could not access device location. Please check location permissions.');
    }
  };

  // Fallbacks if navigation params were passed, to prevent white screen flash
  const fallbackSiteName = route?.params?.siteName || 'Fortune Towers';
  const fallbackClientName = route?.params?.clientName || 'Reliance Industries Portfolio';
  const fallbackAddress = route?.params?.address || 'Plot C-22, G Block, BKC, Mumbai 400051';
  const fallbackContact = route?.params?.contactName || 'Rajesh Khanna';
  const fallbackPhone = route?.params?.contactPhone || 'N/A';
  const fallbackStatus = route?.params?.status || 'active';

  // Pulsating geofence animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // Slide-in animations for contents
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const loadSiteData = async () => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch site details and assignments from new site_assignments table
      const [details, siteAssignments] = await Promise.all([
        siteService.getSiteDetail(siteId).catch(err => {
          console.warn('getSiteDetail failed, falling back to params', err);
          return null;
        }),
        siteAssignmentService.getAssignmentsForSite(siteId).catch(err => {
          console.warn('getAssignmentsForSite failed', err);
          return [];
        }),
      ]);

      if (details) {
        setSiteDetails(details);
      }

      // Map assigned personnel — personnel data comes directly from the join
      const mappedPersonnel: PersonnelItem[] = siteAssignments.map((assignment: any) => {
        const person = assignment.personnel;
        const personnelName = person?.name || 'Unknown';
        const nameParts = personnelName.trim().split(' ');
        const initials = nameParts.length > 1
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

        const initialsColors = [
          Colors.primaryContainer,
          Colors.secondaryContainer,
          '#2E7D32',
          '#1565C0',
          '#C62828',
          '#6A1B9A',
        ];
        const charSum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
        const initialsColor = initialsColors[charSum % initialsColors.length];

        return {
          id: person?.id || assignment.personnel_id,
          assignmentId: assignment.id,
          name: personnelName,
          shift: (assignment.shift_type || 'day').toUpperCase() as 'DAY' | 'NIGHT',
          status: assignment.is_active ? 'On-Duty' : 'Off-Duty',
          avatar: person?.photo_url || undefined,
          initials,
          initialsColor,
          badge: person?.employee_id || '',
          categoryPrefix: person?.category?.prefix_code || '',
          categoryName: person?.category?.name || '',
        };
      });
      setAssignedPersonnel(mappedPersonnel);

      // Query today's attendance records for this site
      const todayStr = new Date().toISOString().split('T')[0];
      let attRecords: AttendanceRecord[] = [];
      try {
        const attData = await workforceAttendanceService.getAttendanceForSite(siteId, todayStr);
        const attendanceMap = new Map<string, any>();
        (attData || []).forEach(a => {
          attendanceMap.set(a.personnel_id, a);
        });

        // Build per-person attendance records
        let presentCount = 0;
        let absentCount = 0;
        let notMarkedCount = 0;

        attRecords = mappedPersonnel.map(p => {
          const att = attendanceMap.get(p.id);
          if (att) {
            const isPresent = att.status === 'present' || att.status === 'present_verified';
            if (isPresent) {
              presentCount++;
            } else if (att.status === 'absent') {
              absentCount++;
            } else {
              presentCount++; // other statuses like 'corrected' count as present
            }
            return {
              personnelId: p.id,
              personnelName: p.name,
              categoryName: p.categoryName || '',
              status: isPresent ? 'present' as const : 'absent' as const,
              checkInTime: att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined,
              checkOutTime: att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined,
              hoursWorked: att.hours_worked || undefined,
            };
          } else {
            notMarkedCount++;
            return {
              personnelId: p.id,
              personnelName: p.name,
              categoryName: p.categoryName || '',
              status: 'not_marked' as const,
            };
          }
        });

        setAttendanceStats({ present: presentCount, absent: absentCount, notMarked: notMarkedCount });
      } catch (attErr) {
        console.warn('Error loading attendance data:', attErr);
        // If attendance fails, mark all as not_marked
        attRecords = mappedPersonnel.map(p => ({
          personnelId: p.id,
          personnelName: p.name,
          categoryName: p.categoryName || '',
          status: 'not_marked' as const,
        }));
        setAttendanceStats({ present: 0, absent: 0, notMarked: mappedPersonnel.length });
      }
      setAttendanceRecords(attRecords);

    } catch (err) {
      console.error('Error loading site detail metrics:', err);
      Alert.alert('Load Error', 'Unable to retrieve complete perimeter profile. Swipe down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSiteData();

    // Pulse animation loop
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Screen content slide in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [siteId]);

  // Sync settings state when details are loaded/updated
  useEffect(() => {
    if (siteDetails) {
      setEditAddress(siteDetails.address || '');
      setEditContactPerson(siteDetails.contact_person || '');
      setEditContactPhone(siteDetails.contact_phone || '');
      setEditLatitude(siteDetails.latitude?.toString() || '');
      setEditLongitude(siteDetails.longitude?.toString() || '');
      setEditGeofenceRadius(siteDetails.geofence_radius?.toString() || '100');
      setEditDayStart(siteDetails.day_shift_start || '08:00 AM');
      setEditDayEnd(siteDetails.day_shift_end || '08:00 PM');
      setEditNightStart(siteDetails.night_shift_start || '08:00 PM');
      setEditNightEnd(siteDetails.night_shift_end || '08:00 AM');
      setEditIsActive(siteDetails.is_active);
    }
  }, [siteDetails]);

  // Pan map when coordinates change
  useEffect(() => {
    if (siteDetails?.latitude && siteDetails?.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: siteDetails.latitude,
        longitude: siteDetails.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  }, [siteDetails?.latitude, siteDetails?.longitude]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSiteData();
  }, []);

  const handleAssignPersonnel = () => {
    navigation.navigate('AssignGuard', {
      siteId: siteId,
      siteName: siteDetails?.site_name || fallbackSiteName,
      address: siteDetails?.address || fallbackAddress,
    });
  };

  const handlePersonnelPress = (personnelId: string) => {
    navigation.navigate('GuardDetail', { guardId: personnelId });
  };

  const handleUnassignPersonnel = (assignmentId: string, personnelName: string) => {
    Alert.alert(
      'Remove Assignment',
      `Are you sure you want to unassign ${personnelName} from this site?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await siteAssignmentService.deactivateAssignment(assignmentId);
              Alert.alert('Success', 'Personnel unassigned successfully.');
              loadSiteData();
            } catch (err: any) {
              console.error('Error unassigning personnel:', err);
              Alert.alert('Error', err.message || 'Failed to unassign personnel.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!siteId) return;

    const lat = parseFloat(editLatitude);
    const lng = parseFloat(editLongitude);
    const radius = parseFloat(editGeofenceRadius);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers.');
      return;
    }
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Validation Error', 'Geofence Radius must be a positive number.');
      return;
    }

    try {
      setSavingSettings(true);
      const updated = await siteService.updateSite(siteId, {
        address: editAddress,
        contact_person: editContactPerson,
        contact_phone: editContactPhone,
        latitude: lat,
        longitude: lng,
        geofence_radius: radius,
        day_shift_start: editDayStart,
        day_shift_end: editDayEnd,
        night_shift_start: editNightStart,
        night_shift_end: editNightEnd,
        is_active: editIsActive,
      });

      setSiteDetails(updated);
      Alert.alert('Success', 'Site configuration updated successfully!');
      setShowSettingsModal(false);
      setActiveTab('Profile');
    } catch (err: any) {
      console.error('Error saving site settings:', err);
      Alert.alert('Error', err.message || 'Failed to update site configuration.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Derive final values from live or navigation params
  const siteName = siteDetails?.site_name || fallbackSiteName;
  const clientName = siteDetails?.client_name || fallbackClientName;
  const siteStatus = siteDetails ? (siteDetails.is_active ? 'active' : 'inactive') : fallbackStatus;
  const siteAddress = siteDetails?.address || fallbackAddress;
  const siteContact = siteDetails?.contact_person || fallbackContact;
  const sitePhone = siteDetails?.contact_phone || fallbackPhone;
  const geofenceRadius = siteDetails?.geofence_radius || 100;

  // Format shift timings
  const dayShift = siteDetails ? `${siteDetails.day_shift_start || '08:00 AM'} - ${siteDetails.day_shift_end || '08:00 PM'}` : '08:00 AM - 08:00 PM';
  const nightShift = siteDetails ? `${siteDetails.night_shift_start || '08:00 PM'} - ${siteDetails.night_shift_end || '08:00 AM'}` : '08:00 PM - 08:00 AM';

  const renderProfileTab = () => {
    let totalPersonnel = assignedPersonnel.length;
    let securityCount = 0;
    let hkCount = 0;
    let supervisorCount = 0;

    assignedPersonnel.forEach((g) => {
      const prefix = (g.categoryPrefix || '').toUpperCase();
      const name = (g.categoryName || '').toLowerCase();
      if (['HK', 'SWP', 'GRD'].includes(prefix) || name.includes('housekeeping') || name.includes('sweeper') || name.includes('gardener')) {
        hkCount++;
      } else if (['SUP'].includes(prefix) || name.includes('supervisor')) {
        supervisorCount++;
      } else {
        securityCount++;
      }
    });

    const formattedCount = (num: number) => num.toString().padStart(2, '0');

    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Metrics Grid */}
        <View style={s.metricsGrid}>
          {/* Total Personnel Card */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <View style={s.metricIconWrapper}>
                <MaterialIcons name="groups" size={20} color={Colors.primary} />
              </View>
              <Text style={s.metricLabel}>Personnel</Text>
            </View>
            <Text style={s.metricValue}>{formattedCount(totalPersonnel)}</Text>
            <View style={s.metricFooter}>
              <View style={s.activeIndicatorDot} />
              <Text style={s.metricFooterText}>Active assignments</Text>
            </View>
          </View>

          {/* Security Card */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <View style={s.metricIconWrapper}>
                <MaterialIcons name="security" size={20} color={Colors.primary} />
              </View>
              <Text style={s.metricLabel}>Security</Text>
            </View>
            <Text style={s.metricValue}>{formattedCount(securityCount)}</Text>
            <View style={s.metricFooter}>
              <Text style={s.metricFooterTextPlain}>Guards & officers</Text>
            </View>
          </View>

          {/* Housekeeping Card */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <View style={s.metricIconWrapper}>
                <MaterialIcons name="cleaning-services" size={20} color={Colors.primary} />
              </View>
              <Text style={s.metricLabel}>HK Services</Text>
            </View>
            <Text style={[s.metricValue, hkCount === 0 && s.metricValueZero]}>{formattedCount(hkCount)}</Text>
            <View style={s.metricFooter}>
              <Text style={s.metricFooterTextPlain}>HK & sweepers</Text>
            </View>
          </View>

          {/* Supervisors Card */}
          <View style={s.metricCard}>
            <View style={s.metricHeader}>
              <View style={s.metricIconWrapper}>
                <MaterialIcons name="badge" size={20} color={Colors.primary} />
              </View>
              <Text style={s.metricLabel}>Supervisors</Text>
            </View>
            <Text style={[s.metricValue, supervisorCount === 0 && s.metricValueZero]}>{formattedCount(supervisorCount)}</Text>
            <View style={s.metricFooter}>
              <Text style={s.metricFooterTextPlain}>SUP codes</Text>
            </View>
          </View>
        </View>

        {/* Status Indicators List */}
        <View style={s.statusIndicatorsSection}>
          {/* Attendance Verified */}
          <View style={[s.statusBar, s.statusBarVerified]}>
            <View style={s.statusBarLeft}>
              <MaterialIcons name="check-circle" size={24} color="#1E7E34" />
              <View style={s.statusBarTextGroup}>
                <Text style={[s.statusBarTitle, s.statusBarTitleVerified]}>Attendance Verified</Text>
                <Text style={[s.statusBarSubtitle, s.statusBarSubtitleVerified]}>Site-wide daily check completed</Text>
              </View>
            </View>
            <Text style={[s.statusBarValue, s.statusBarValueVerified]}>{formattedCount(attendanceStats.present)}</Text>
          </View>

          {/* Personnel Absent */}
          <View style={[s.statusBar, s.statusBarAbsent]}>
            <View style={s.statusBarLeft}>
              <MaterialIcons name="cancel" size={24} color="#D32F2F" />
              <View style={s.statusBarTextGroup}>
                <Text style={[s.statusBarTitle, s.statusBarTitleAbsent]}>Personnel Absent</Text>
                <Text style={[s.statusBarSubtitle, s.statusBarSubtitleAbsent]}>Required categories missing</Text>
              </View>
            </View>
            <Text style={[s.statusBarValue, s.statusBarValueAbsent]}>{formattedCount(attendanceStats.absent)}</Text>
          </View>

          {/* Vacant Positions */}
          <View style={[s.statusBar, s.statusBarVacant]}>
            <View style={s.statusBarLeft}>
              <MaterialIcons name="work-history" size={24} color="#757575" />
              <View style={s.statusBarTextGroup}>
                <Text style={[s.statusBarTitle, s.statusBarTitleVacant]}>Vacant Positions</Text>
                <Text style={[s.statusBarSubtitle, s.statusBarSubtitleVacant]}>Not configured vs strength target</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderGuardsTab = () => {
    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={s.guardsSection}>
          <View style={s.guardsHeader}>
            <Text style={s.guardsSectionTitle}>Assigned Personnel</Text>
            <View style={s.activeGuardsBadge}>
              <Text style={s.activeGuardsBadgeText}>
                {assignedPersonnel.length} Total
              </Text>
            </View>
          </View>

          <View style={s.guardsList}>
            {assignedPersonnel.length === 0 ? (
              <View style={s.emptyGuardsList}>
                <MaterialIcons name="group-off" size={32} color={Colors.outline} />
                <Text style={s.emptyGuardsText}>
                  No personnel assigned to this site yet.
                </Text>
              </View>
            ) : (
              assignedPersonnel.map((person) => (
                <View key={person.id} style={s.guardCardInteractive}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handlePersonnelPress(person.id)}
                    style={s.guardCardInteractiveLeft}
                  >
                    {person.avatar ? (
                      <Image source={{ uri: person.avatar }} style={s.guardAvatar} />
                    ) : (
                      <View style={[s.guardAvatarFallback, { backgroundColor: person.initialsColor }]}>
                        <Text style={s.guardAvatarFallbackText}>{person.initials}</Text>
                      </View>
                    )}
                    <View style={s.guardInfo}>
                      <Text style={s.guardName}>{person.name}</Text>
                      <Text style={s.guardBadgeId}>{person.categoryName || 'Personnel'} • {person.badge || '#N/A'}</Text>
                      <View style={s.guardMetaRow}>
                        <Text style={s.guardMetaLabel}>Shift: {person.shift}</Text>
                        <Text style={s.guardMetaDivider}>•</Text>
                        <Text style={[
                          s.guardMetaStatus,
                          { color: person.status === 'On-Duty' ? Colors.successGreen : Colors.outline }
                        ]}>
                          {person.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {person.assignmentId && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleUnassignPersonnel(person.assignmentId!, person.name)}
                      style={s.unassignBtn}
                    >
                      <MaterialIcons name="person-remove" size={20} color={Colors.secondary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAssignPersonnel}
            style={s.assignGuardBtn}
          >
            <MaterialIcons name="person-add" size={20} color={Colors.primary} />
            <Text style={s.assignGuardBtnText}>Assign Personnel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderSettingsTab = () => {
    const parsedLat = parseFloat(editLatitude) || 19.0760;
    const parsedLng = parseFloat(editLongitude) || 72.8777;
    const parsedRadius = parseFloat(editGeofenceRadius) || 100;

    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={s.sectionCard}>
          <View style={s.sectionCardHeader}>
            <MaterialIcons name="settings" size={20} color={Colors.primary} />
            <Text style={s.sectionCardTitle}>Site Configuration</Text>
          </View>
          
          <View style={s.settingsForm}>
            {/* Status Row */}
            <View style={s.settingsSwitchRow}>
              <Text style={s.settingsSwitchLabel}>Site Status (Active)</Text>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                trackColor={{ false: Colors.outlineVariant, true: Colors.primaryFixed }}
                thumbColor={editIsActive ? Colors.primary : '#f4f3f4'}
              />
            </View>

            {/* Address */}
            <View style={s.formField}>
              <Text style={s.formLabel}>Address</Text>
              <TextInput
                style={[s.formInput, { minHeight: 60 }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Enter site address"
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* ═══ Location Options Section ═══ */}
            <View style={s.locationSection}>
              <Text style={s.locationSectionHeader}>LOCATION SELECTION MODE</Text>

              {/* Map Preview Block — rendered FIRST, above the search panels */}
              <View style={s.mapSection}>
                <View style={s.mapSectionHeader}>
                  <Text style={s.formLabel}>Map Location Preview</Text>
                  <Text style={s.mapCoordsText}>
                    {parsedLat.toFixed(5)}, {parsedLng.toFixed(5)}
                  </Text>
                </View>
                <View style={s.mapContainerSettings}>
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={s.mapViewSettings}
                    initialRegion={{
                      latitude: parsedLat,
                      longitude: parsedLng,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={true}
                    rotateEnabled={true}
                  >
                    <Circle
                      center={{ latitude: parsedLat, longitude: parsedLng }}
                      radius={parsedRadius}
                      strokeColor="rgba(0, 39, 82, 0.4)"
                      fillColor="rgba(0, 39, 82, 0.08)"
                      strokeWidth={1}
                    />
                    <Marker
                      coordinate={{ latitude: parsedLat, longitude: parsedLng }}
                      draggable
                      onDragEnd={(e) => {
                        const newCoords = e.nativeEvent.coordinate;
                        setEditLatitude(newCoords.latitude.toString());
                        setEditLongitude(newCoords.longitude.toString());
                        fetchAddressFromCoords(newCoords.latitude, newCoords.longitude);
                      }}
                    >
                      <View style={s.customMarker}>
                        <MaterialIcons name="location-on" size={36} color={Colors.primary} />
                      </View>
                    </Marker>
                  </MapView>
                  
                  <View style={s.simulatedMapBadge}>
                    <Text style={s.simulatedMapBadgeText}>DRAG MARKER TO FINE-TUNE</Text>
                  </View>
                </View>
              </View>

              {/* Premium Segmented Control */}
              <View style={s.segmentedOuter}>
                <View style={s.tabContainerLocation}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('search')}
                    style={[s.tabButtonLocation, activeLocationTab === 'search' && s.activeTabButtonLocation]}
                  >
                    <MaterialIcons name="search" size={16} color={activeLocationTab === 'search' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabTextLocation, activeLocationTab === 'search' && s.activeTabTextLocation]}>Search</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('gps')}
                    style={[s.tabButtonLocation, activeLocationTab === 'gps' && s.activeTabButtonLocation]}
                  >
                    <MaterialIcons name="my-location" size={16} color={activeLocationTab === 'gps' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabTextLocation, activeLocationTab === 'gps' && s.activeTabTextLocation]}>GPS Lock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('manual')}
                    style={[s.tabButtonLocation, activeLocationTab === 'manual' && s.activeTabButtonLocation]}
                  >
                    <MaterialIcons name="edit-location-alt" size={16} color={activeLocationTab === 'manual' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabTextLocation, activeLocationTab === 'manual' && s.activeTabTextLocation]}>Manual</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mode Specific Panels — all rendered BELOW the map */}
              {activeLocationTab === 'search' && (
                <View style={s.searchContainer}>
                  <Text style={s.searchLabel}>Search Google Maps</Text>
                  <View style={s.searchBarWrapper}>
                    <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Type a location or landmark..."
                      placeholderTextColor={Colors.outline}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSearchQuery('');
                          setPredictions([]);
                        }}
                        style={s.clearSearchBtn}
                      >
                        <MaterialIcons name="close" size={20} color={Colors.outline} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Search Loading Indicator */}
                  {searchLoading && predictions.length === 0 && (
                    <View style={s.searchLoadingRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={s.searchLoadingText}>Searching...</Text>
                    </View>
                  )}

                  {/* Autocomplete Results */}
                  {predictions.length > 0 && (
                    <View style={s.predictionsList}>
                      {predictions.map((item: any, index: number) => (
                        <TouchableOpacity
                          key={item.place_id}
                          style={[
                            s.predictionItem,
                            index === predictions.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          activeOpacity={0.6}
                          onPress={() => handleSelectPrediction(item)}
                        >
                          <View style={s.predictionIconWrap}>
                            <MaterialIcons name="location-on" size={18} color={Colors.primary} />
                          </View>
                          <View style={s.predictionTextContainer}>
                            <Text style={s.predictionPrimaryText} numberOfLines={1}>
                              {item.structured_formatting?.main_text || item.description}
                            </Text>
                            <Text style={s.predictionSecondaryText} numberOfLines={1}>
                              {item.structured_formatting?.secondary_text || ''}
                            </Text>
                          </View>
                          <MaterialIcons name="north-west" size={14} color={Colors.outline} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {activeLocationTab === 'gps' && (
                <View style={s.gpsContainer}>
                  <View style={s.gpsCard}>
                    <View style={s.gpsCardLeft}>
                      <MaterialIcons name="gps-fixed" size={24} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.gpsCardTitle}>Device GPS Calibration</Text>
                        <Text style={s.gpsCardSubtitle}>Lock in precise high-accuracy coordinates.</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleRecalibrateGPS}
                      style={s.gpsActionBtn}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
                          <Text style={s.gpsActionBtnText}>Locate</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeLocationTab === 'manual' && (
                <View style={s.manualContainer}>
                  <View style={s.coordsGrid}>
                    <View style={[s.formField, { flex: 1, marginBottom: 0 }]}>
                      <Text style={s.coordsLabelInput}>Latitude</Text>
                      <TextInput
                        style={s.coordsInput}
                        placeholder="19.0760"
                        placeholderTextColor={Colors.outline}
                        keyboardType="numeric"
                        value={editLatitude}
                        onChangeText={setEditLatitude}
                        onBlur={handleApplyManualCoords}
                      />
                    </View>
                    <View style={[s.formField, { flex: 1, marginBottom: 0 }]}>
                      <Text style={s.coordsLabelInput}>Longitude</Text>
                      <TextInput
                        style={s.coordsInput}
                        placeholder="72.8777"
                        placeholderTextColor={Colors.outline}
                        keyboardType="numeric"
                        value={editLongitude}
                        onChangeText={setEditLongitude}
                        onBlur={handleApplyManualCoords}
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleApplyManualCoords}
                      style={s.applyCoordsBtn}
                    >
                      <Text style={s.applyCoordsBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Geofence Radius */}
            <View style={s.formField}>
              <Text style={s.formLabel}>Geofence Radius (meters)</Text>
              <TextInput
                style={s.formInput}
                value={editGeofenceRadius}
                onChangeText={setEditGeofenceRadius}
                keyboardType="numeric"
                placeholder="e.g. 100"
                placeholderTextColor={Colors.outline}
              />
            </View>

            {/* Contact Details */}
            <View style={s.formField}>
              <Text style={s.formLabel}>Contact Person</Text>
              <TextInput
                style={s.formInput}
                value={editContactPerson}
                onChangeText={setEditContactPerson}
                placeholder="Contact representative name"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Contact Phone</Text>
              <TextInput
                style={s.formInput}
                value={editContactPhone}
                onChangeText={setEditContactPhone}
                keyboardType="phone-pad"
                placeholder="Contact number"
                placeholderTextColor={Colors.outline}
              />
            </View>

            {/* Shift Times */}
            <Text style={s.formSubheader}>Shift Configurations</Text>
            
            <View style={s.formGrid}>
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>Day Start</Text>
                <TextInput
                  style={s.formInput}
                  value={editDayStart}
                  onChangeText={setEditDayStart}
                  placeholder="08:00 AM"
                  placeholderTextColor={Colors.outline}
                />
              </View>
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>Day End</Text>
                <TextInput
                  style={s.formInput}
                  value={editDayEnd}
                  onChangeText={setEditDayEnd}
                  placeholder="08:00 PM"
                  placeholderTextColor={Colors.outline}
                />
              </View>
            </View>

            <View style={s.formGrid}>
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>Night Start</Text>
                <TextInput
                  style={s.formInput}
                  value={editNightStart}
                  onChangeText={setEditNightStart}
                  placeholder="08:00 PM"
                  placeholderTextColor={Colors.outline}
                />
              </View>
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>Night End</Text>
                <TextInput
                  style={s.formInput}
                  value={editNightEnd}
                  onChangeText={setEditNightEnd}
                  placeholder="08:00 AM"
                  placeholderTextColor={Colors.outline}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveSettings}
              disabled={savingSettings}
              style={s.saveSettingsBtn}
            >
              {savingSettings ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#FFFFFF" />
                  <Text style={s.saveSettingsBtnText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#002752" />

        {/* Top Navbar Skeleton */}
        <View style={[s.topNavbarSingle, { paddingTop: insets.top }]}>
          <View style={s.titleBarSingle}>
            <View style={[s.backButtonNavbar, { opacity: 0.5 }]}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width="60%" height={20} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
            <View style={[s.moreButtonNavbar, { opacity: 0.5 }]}>
              <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContainer}>
          {/* Hero Section Skeleton */}
          <View style={s.heroSectionContainer}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#e2e8f0' }]} />
            <View style={s.heroOverlayContainer}>
              <View style={s.geofenceBox}>
                <Skeleton circle width={48} height={48} />
              </View>
            </View>
          </View>

          {/* Overlapping Card Skeleton */}
          <View style={[s.siteInfoCardContainer, { marginTop: -40 }]}>
            <View style={s.siteInfoCard}>
              <Skeleton width="50%" height={22} style={{ marginBottom: 10 }} />
              <Skeleton width="30%" height={14} style={{ marginBottom: 15 }} />
              <View style={s.divider} />
              <View style={{ gap: 12 }}>
                <Skeleton width="80%" height={16} />
                <Skeleton width="60%" height={16} />
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={16} />
              </View>
            </View>
          </View>

          {/* Shift Timings Skeleton */}
          <View style={s.sectionHeaderContainer}>
            <Skeleton width="40%" height={20} />
          </View>
          <View style={s.shiftCardsContainer}>
            <View style={s.shiftCard}>
              <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={18} />
            </View>
            <View style={s.shiftCard}>
              <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={18} />
            </View>
          </View>

          {/* Guards Section Skeleton */}
          <View style={s.sectionHeaderWithAction}>
            <Skeleton width="45%" height={20} />
            <Skeleton width="30%" height={28} borderRadius={8} />
          </View>
          <View style={s.guardsListContainer}>
            <View style={s.guardCardItem}>
              <Skeleton circle width={40} height={40} />
              <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="30%" height={12} />
              </View>
            </View>
            <View style={s.guardCardItem}>
              <Skeleton circle width={40} height={40} />
              <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="25%" height={12} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#002752" />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topNavbarSingle, { paddingTop: insets.top }]}>
        <View style={s.titleBarSingle}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backButtonNavbar}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.titleBarTextSingle} numberOfLines={1}>
            {siteName}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowMenu(!showMenu)}
            style={s.moreButtonNavbar}
          >
            <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Options Menu */}
      {showMenu && (
        <View style={s.menuDropdown}>
          <TouchableOpacity
            style={s.menuDropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowMenu(false);
              setShowMetricsModal(true);
            }}
          >
            <MaterialIcons name="bar-chart" size={20} color={Colors.primary} />
            <Text style={s.menuDropdownItemText}>Detailed Metrics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={s.menuDropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              setShowMenu(false);
              setShowSettingsModal(true);
            }}
          >
            <MaterialIcons name="settings" size={20} color={Colors.primary} />
            <Text style={s.menuDropdownItemText}>Configure Site</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContainer, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Hero Section */}
        <View style={s.heroSectionContainer}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr-Xr9gbDx_jNDzBLjQvxPmKBcpj-fENsNzdp3K_rI0YyCGM-W_YUzS4Jz35WQvai9au2fj7KHL_QGZHyYuViv7OEK_y7hjp3aXUb4_YocjhVtxuITRsZVI-S5tVPhXhFaLIwWIaWknciHW_eYVXMmvTUykMsE87CTH9A2uVJGVE7esQpUMoTwSlmjMi0tcCoCwRgGhTBu8l4uNPbsAhcrUr2car_llnzo4MJ86RdQ_sWaEOXNZM6bt-hwD5XfiwK1KGL6T-UpNds' }}
            style={s.heroImage}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.15)' }]} />
          
          <View style={s.heroOverlayContainer}>
            <Animated.View style={[s.geofenceBox, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]}>
              <MaterialIcons name="location-on" size={40} color={Colors.secondary} />
            </Animated.View>
          </View>

          <View style={s.heroGeofenceBadge}>
            <MaterialIcons name="gps-fixed" size={14} color={Colors.primary} />
            <Text style={s.heroGeofenceBadgeText}>GEOFENCE: {geofenceRadius}M RADIUS</Text>
          </View>
        </View>

        {/* Site Info Card */}
        <View style={s.siteInfoCardContainer}>
          <View style={s.siteInfoCard}>
            <View style={s.siteInfoCardHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.siteInfoName}>{siteName}</Text>
                <View style={s.clientRow}>
                  <MaterialIcons name="work" size={14} color={Colors.primary} />
                  <Text style={s.clientText} numberOfLines={1}>{clientName.toUpperCase()}</Text>
                </View>
              </View>
              <View style={[s.statusBadge, siteStatus === 'active' ? s.statusBadgeActive : s.statusBadgeInactive]}>
                <Text style={[s.statusBadgeText, siteStatus === 'active' ? s.statusBadgeTextActive : s.statusBadgeTextInactive]}>
                  {siteStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.siteInfoGrid}>
              <View style={s.infoDetailRow}>
                <MaterialIcons name="location-on" size={20} color={Colors.primary} />
                <Text style={s.infoDetailText}>{siteAddress}</Text>
              </View>
              
              <View style={s.infoDetailRow}>
                <MaterialIcons name="my-location" size={20} color={Colors.primary} />
                <Text style={s.infoDetailText}>{geofenceRadius}m Geofence Active</Text>
              </View>

              <View style={s.infoDetailRow}>
                <MaterialIcons name="person" size={20} color={Colors.primary} />
                <Text style={s.infoDetailText}>{siteContact || 'Rajesh Sharma'}</Text>
              </View>

              <View style={s.infoDetailRow}>
                <MaterialIcons name="phone" size={20} color={Colors.primary} />
                <Text style={[s.infoDetailText, { color: Colors.primary, fontWeight: '600' }]}>{sitePhone || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shift Timings */}
        <View style={s.sectionHeaderContainer}>
          <Text style={s.sectionTitleText}>Shift Timings</Text>
        </View>

        <View style={s.shiftCardsContainer}>
          <View style={s.shiftCard}>
            <View style={s.shiftCardHeader}>
              <MaterialIcons name="light-mode" size={20} color={Colors.primary} />
              <Text style={s.shiftCardLabel}>DAY SHIFT</Text>
            </View>
            <Text style={s.shiftCardValue}>{dayShift}</Text>
          </View>

          <View style={s.shiftCard}>
            <View style={s.shiftCardHeader}>
              <MaterialIcons name="dark-mode" size={20} color={Colors.primary} />
              <Text style={s.shiftCardLabel}>NIGHT SHIFT</Text>
            </View>
            <Text style={s.shiftCardValue}>{nightShift}</Text>
          </View>
        </View>

        {/* Assigned Personnel */}
        <View style={s.sectionHeaderWithAction}>
          <Text style={s.sectionTitleText}>Assigned Personnel ({assignedPersonnel.length})</Text>
          <TouchableOpacity
            style={s.sectionActionBtn}
            onPress={handleAssignPersonnel}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={14} color="#ffffff" />
            <Text style={s.sectionActionBtnText}>Assign Personnel</Text>
          </TouchableOpacity>
        </View>

        <View style={s.guardsListContainer}>
          {assignedPersonnel.length === 0 ? (
            <View style={s.emptyGuardsContainer}>
              <MaterialIcons name="group-off" size={32} color={Colors.outline} />
              <Text style={s.emptyGuardsTextMini}>No personnel assigned to this site yet.</Text>
            </View>
          ) : (
            assignedPersonnel.map((person) => (
              <View key={person.id} style={s.guardCardItem}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePersonnelPress(person.id)}
                  style={s.guardCardItemLeft}
                >
                  {person.avatar ? (
                    <Image source={{ uri: person.avatar }} style={s.guardAvatarImage} />
                  ) : (
                    <View style={[s.guardAvatarFallbackMini, { backgroundColor: person.initialsColor }]}>
                      <Text style={s.guardAvatarFallbackTextMini}>{person.initials}</Text>
                    </View>
                  )}
                  <View style={s.guardInfoContainer}>
                    <Text style={s.guardNameText}>{person.name}</Text>
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600', marginBottom: 2 }}>
                      {person.categoryName || 'Personnel'}
                    </Text>
                    <View style={s.guardMetaRowMini}>
                      <View style={[s.shiftBadgeMini, person.shift === 'DAY' ? s.shiftBadgeMiniDay : s.shiftBadgeMiniNight]}>
                        <Text style={[s.shiftBadgeMiniText, person.shift === 'DAY' ? s.shiftBadgeMiniTextDay : s.shiftBadgeMiniTextNight]}>
                          {person.shift}
                        </Text>
                      </View>
                      <View style={s.guardStatusDotRow}>
                        <View style={[s.statusDotMini, { backgroundColor: person.status === 'On-Duty' ? Colors.successGreen : Colors.outline }]} />
                        <Text style={s.guardStatusText}>{person.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={s.guardActionsRow}>
                  {person.assignmentId && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleUnassignPersonnel(person.assignmentId!, person.name)}
                      style={s.removeGuardBtn}
                    >
                      <MaterialIcons name="close" size={16} color={Colors.secondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handlePersonnelPress(person.id)}
                    style={s.chevronBtn}
                  >
                    <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Attendance Details */}
        <View style={s.sectionHeaderContainer}>
          <Text style={s.sectionTitleText}>Attendance Details</Text>
        </View>

        {/* Attendance Summary Cards */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#dcfce7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialIcons name="check-circle" size={16} color="#16a34a" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#15803d', textTransform: 'uppercase' }}>Present</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#166534' }}>{attendanceStats.present.toString().padStart(2, '0')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fee2e2' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialIcons name="cancel" size={16} color="#dc2626" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#b91c1c', textTransform: 'uppercase' }}>Absent</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#991b1b' }}>{attendanceStats.absent.toString().padStart(2, '0')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fefce8', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fef9c3' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialIcons name="schedule" size={16} color="#ca8a04" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#a16207', textTransform: 'uppercase' }}>Pending</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#854d0e' }}>{attendanceStats.notMarked.toString().padStart(2, '0')}</Text>
          </View>
        </View>

        {/* Individual Attendance Records */}
        <View style={s.inspectionsListContainer}>
          <View style={s.inspectionsCardContainer}>
            {attendanceRecords.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialIcons name="event-busy" size={36} color={Colors.outline} />
                <Text style={{ marginTop: 8, color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>
                  No personnel assigned — attendance data unavailable.
                </Text>
              </View>
            ) : (
              attendanceRecords.map((record, idx) => {
                const statusColor = record.status === 'present' ? '#16a34a' : record.status === 'absent' ? '#dc2626' : '#ca8a04';
                const statusBgColor = record.status === 'present' ? '#f0fdf4' : record.status === 'absent' ? '#fef2f2' : '#fefce8';
                const statusLabel = record.status === 'present' ? 'PRESENT' : record.status === 'absent' ? 'ABSENT' : 'NOT MARKED';
                return (
                  <View
                    key={record.personnelId}
                    style={[
                      s.inspectionRowItem,
                      idx > 0 && s.inspectionRowItemBorder
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.inspectionRowInspector}>{record.personnelName}</Text>
                      <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>{record.categoryName || 'Personnel'}</Text>
                      {record.checkInTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MaterialIcons name="login" size={12} color={Colors.outline} />
                          <Text style={{ fontSize: 11, color: Colors.onSurfaceVariant }}>In: {record.checkInTime}</Text>
                          {record.checkOutTime && (
                            <>
                              <Text style={{ fontSize: 11, color: Colors.outlineVariant }}> • </Text>
                              <MaterialIcons name="logout" size={12} color={Colors.outline} />
                              <Text style={{ fontSize: 11, color: Colors.onSurfaceVariant }}>Out: {record.checkOutTime}</Text>
                            </>
                          )}
                          {record.hoursWorked !== undefined && (
                            <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600', marginLeft: 4 }}>
                              ({record.hoursWorked}h)
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={[
                      s.inspectionRowStatusBadge,
                      { backgroundColor: statusBgColor }
                    ]}>
                      <Text style={[
                        s.inspectionRowStatusText,
                        { color: statusColor }
                      ]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>

      {/* Edit Site Settings Fullscreen Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.surface }}>
          {/* Modal Header */}
          <View style={[s.topNavbarSingle, { paddingTop: insets.top }]}>
            <View style={s.titleBarSingle}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowSettingsModal(false)}
                style={s.backButtonNavbar}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={s.titleBarTextSingle} numberOfLines={1}>Configure Site</Text>
              <View style={{ width: 32 }} />
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            {renderSettingsTab()}
          </ScrollView>
        </View>
      </Modal>

      {/* Detailed Overview Metrics Modal */}
      <Modal
        visible={showMetricsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMetricsModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.metricsModalContainer}>
            <View style={s.metricsModalHeader}>
              <Text style={s.metricsModalTitle}>Perimeter Overview Metrics</Text>
              <TouchableOpacity onPress={() => setShowMetricsModal(false)} style={s.closeMetricsBtn}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {renderProfileTab()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Floating Nav Bar */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity
          style={s.navItem}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <MaterialIcons name="dashboard" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={s.navItem}
          onPress={() => navigation.navigate('WorkforcePersonnelList')}
        >
          <MaterialIcons name="people" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>Guards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navItem, s.navItemActive]}
          onPress={() => navigation.navigate('SiteList')}
        >
          <MaterialIcons name="location-on" size={24} color="#ffffff" />
          <Text style={[s.navLabel, s.navLabelActive]}>Sites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.navItem}
          onPress={() => navigation.navigate('MoreMenu')}
        >
          <MaterialIcons name="menu" size={24} color={Colors.onSurfaceVariant} />
          <Text style={s.navLabel}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // TopNavbar
  topNavbar: {
    backgroundColor: '#002752',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 50,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 2,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  notificationBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButtonNavbar: {
    padding: 4,
    borderRadius: BorderRadius.full,
  },
  titleBarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Scroll Container
  scrollContainer: {
    paddingBottom: 24,
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#002752',
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroSiteName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  heroLocationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    opacity: 0.8,
    gap: 6,
  },
  heroLocationIcon: {
    marginTop: 3,
  },
  heroAddressText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    flex: 1,
  },

  // Tab Switcher
  tabSwitcherContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 6,
    marginHorizontal: 16,
    marginTop: -24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  tabSwitcherScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabSwitcherButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 4,
  },
  tabSwitcherButtonActive: {
    backgroundColor: '#002752',
  },
  tabSwitcherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabSwitcherButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 32,
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricIconWrapper: {
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
    borderRadius: 8,
    padding: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricValueZero: {
    color: '#94a3b8',
  },
  metricFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  activeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  metricFooterText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '500',
  },
  metricFooterTextPlain: {
    fontSize: 11,
    color: '#64748b',
  },

  // Status Indicators
  statusIndicatorsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusBarTextGroup: {
    flex: 1,
  },
  statusBarTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBarSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBarValue: {
    fontSize: 24,
    fontWeight: '800',
  },

  statusBarVerified: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  statusBarTitleVerified: {
    color: '#166534',
  },
  statusBarSubtitleVerified: {
    color: '#15803d',
  },
  statusBarValueVerified: {
    color: '#166534',
  },

  statusBarAbsent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  statusBarTitleAbsent: {
    color: '#991b1b',
  },
  statusBarSubtitleAbsent: {
    color: '#b91c1c',
  },
  statusBarValueAbsent: {
    color: '#991b1b',
  },

  statusBarVacant: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  statusBarTitleVacant: {
    color: '#64748b',
  },
  statusBarSubtitleVacant: {
    color: '#94a3b8',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B02D21',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 99,
  },

  // Map Section
  mapContainer: {
    height: 240,
    borderRadius: BorderRadius.xl,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.surfaceContainer,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  geofenceTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 6,
  },
  geofenceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Details Cards
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.2)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionCardBody: {
    gap: 12,
  },
  infoField: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Shift timings styles
  shiftList: {
    gap: 10,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shiftLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shiftName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  shiftTimeBadge: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  shiftTimeText: {
    fontSize: 11,
    color: Colors.onSurface,
    fontWeight: '600',
  },

  // Assigned Guards styles
  guardsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  guardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guardsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  activeGuardsBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeGuardsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  guardsList: {
    gap: 10,
    marginBottom: 12,
  },
  guardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: BorderRadius.xl,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  guardCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  guardAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  guardInfo: {
    gap: 1,
    flex: 1,
  },
  guardName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardBadgeId: {
    fontSize: 11,
    color: Colors.outline,
  },
  guardCardRight: {
    alignItems: 'flex-end',
  },
  guardShiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  shiftBadgeDay: {
    backgroundColor: '#FEF3C7',
  },
  shiftBadgeNight: {
    backgroundColor: '#E0E7FF',
  },
  guardShiftText: {
    fontSize: 10,
    fontWeight: '700',
  },
  shiftTextDay: {
    color: '#D97706',
  },
  shiftTextNight: {
    color: '#4F46E5',
  },
  assignGuardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    marginTop: 4,
  },
  assignGuardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Interactive Guard Card
  guardCardInteractive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: BorderRadius.xl,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  guardCardInteractiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  guardMetaLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  guardMetaDivider: {
    fontSize: 10,
    color: Colors.outlineVariant,
  },
  guardMetaStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  unassignBtn: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FEE2E2',
  },

  // Inspections List styles
  sectionContainer: {
    paddingHorizontal: 16,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  inspectionsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  inspectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  inspectionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  inspectionLeft: {
    gap: 2,
  },
  inspectionDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
  },
  inspectorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  inspectionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inspectionStatusBadgeClear: {
    backgroundColor: '#E6F4EA',
  },
  inspectionStatusBadgeError: {
    backgroundColor: Colors.errorContainer,
  },
  inspectionStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inspectionStatusTextClear: {
    color: '#1E7E34',
  },
  inspectionStatusTextError: {
    color: Colors.onErrorContainer,
  },

  // Settings form styles
  settingsForm: {
    gap: 16,
  },
  settingsSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.2)',
  },
  settingsSwitchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  formField: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  formSubheader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 10,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.2)',
    paddingBottom: 4,
  },
  saveSettingsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  saveSettingsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty states
  emptyGuardsList: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  emptyGuardsText: {
    fontSize: 13,
    color: Colors.outline,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Floating bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerLowest,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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

  // ─── Interactive Map & Search for Settings tab ───
  mapContainerSettings: {
    height: 200,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainer,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  mapViewSettings: {
    width: '100%',
    height: '100%',
  },
  simulatedMapBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  simulatedMapBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  locationSection: {
    gap: 14,
    marginTop: 8,
  },
  locationSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  segmentedOuter: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 28,
    padding: 3,
  },
  tabContainerLocation: {
    flexDirection: 'row',
    borderRadius: 26,
    overflow: 'hidden',
  },
  tabButtonLocation: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 24,
  },
  activeTabButtonLocation: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tabTextLocation: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeTabTextLocation: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchContainer: {
    gap: 8,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
  },
  clearSearchBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchLoadingText: {
    fontSize: 12,
    color: Colors.outline,
    fontWeight: '500',
  },
  predictionsList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
  },
  predictionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 39, 82, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  predictionSecondaryText: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2,
  },
  gpsContainer: {
    gap: 8,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  gpsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gpsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  gpsCardSubtitle: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 1,
  },
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    minWidth: 80,
  },
  gpsActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  manualContainer: {
    gap: 8,
  },
  applyCoordsBtn: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    height: 42,
    marginTop: 22,
  },
  applyCoordsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  mapSection: {
    gap: 6,
    zIndex: 1,
  },
  mapSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapCoordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  coordsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  coordsLabelInput: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(17, 28, 44, 0.7)',
  },
  coordsInput: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: 'transparent',
    flex: 1,
  },
  // Single navbar styles
  topNavbarSingle: {
    backgroundColor: '#002752',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 50,
  },
  titleBarSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  titleBarTextSingle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  moreButtonNavbar: {
    padding: 4,
    borderRadius: BorderRadius.full,
  },

  // Options Menu dropdown
  menuDropdown: {
    position: 'absolute',
    top: 56, // below title bar
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
    paddingVertical: 4,
    minWidth: 160,
  },
  menuDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  menuDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1f',
  },

  // Hero Section styles
  heroSectionContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  geofenceBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(176, 45, 33, 0.4)',
    backgroundColor: 'rgba(176, 45, 33, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGeofenceBadge: {
    position: 'absolute',
    bottom: 48, // offset to avoid overlapping the card which is at -mt-10 (40px)
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  heroGeofenceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Site Info Card styles
  siteInfoCardContainer: {
    paddingHorizontal: 16,
    marginTop: -40,
    zIndex: 10,
  },
  siteInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    padding: 20,
    shadowColor: 'rgba(26, 61, 109, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  siteInfoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  siteInfoName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 28,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  clientText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#E6F4EA',
  },
  statusBadgeInactive: {
    backgroundColor: '#FCE8E6',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: '#1E7E34',
  },
  statusBadgeTextInactive: {
    color: '#C5221F',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainer,
    marginVertical: 16,
  },
  siteInfoGrid: {
    gap: 12,
  },
  infoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoDetailText: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },

  // Shift Timings section styles
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  shiftCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  shiftCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    padding: 16,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  shiftCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  shiftCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },

  // Assigned Guards styles
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  guardsListContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  guardCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: 16,
    padding: 12,
  },
  guardCardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guardAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  guardAvatarFallbackMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardAvatarFallbackTextMini: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  guardInfoContainer: {
    flex: 1,
    gap: 2,
  },
  guardNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardMetaRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shiftBadgeMiniDay: {
    backgroundColor: 'rgba(0, 39, 82, 0.08)',
  },
  shiftBadgeMiniNight: {
    backgroundColor: 'rgba(26, 61, 109, 0.08)',
  },
  shiftBadgeMiniText: {
    fontSize: 9,
    fontWeight: '700',
  },
  shiftBadgeMiniTextDay: {
    color: Colors.primary,
  },
  shiftBadgeMiniTextNight: {
    color: Colors.primaryContainer,
  },
  guardStatusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  guardStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  guardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeGuardBtn: {
    padding: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FEE2E2',
  },
  chevronBtn: {
    padding: 4,
  },
  emptyGuardsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  emptyGuardsTextMini: {
    fontSize: 13,
    color: Colors.outline,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Recent Inspections section styles
  inspectionsListContainer: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  inspectionsCardContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  inspectionRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  inspectionRowItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  inspectionRowLeft: {
    gap: 2,
  },
  inspectionRowDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
  },
  inspectionRowInspector: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  inspectionRowStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inspectionRowStatusBadgeClear: {
    backgroundColor: '#E6F4EA',
  },
  inspectionRowStatusBadgeError: {
    backgroundColor: Colors.errorContainer,
  },
  inspectionRowStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inspectionRowStatusTextClear: {
    color: '#1E7E34',
  },
  inspectionRowStatusTextError: {
    color: Colors.onErrorContainer,
  },

  // Modals styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  metricsModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: 16,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  metricsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  metricsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  closeMetricsBtn: {
    padding: 4,
  },
});
