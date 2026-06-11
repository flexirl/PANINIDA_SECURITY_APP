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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as siteService from '../api/siteService';
import * as inspectionService from '../api/inspectionService';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const mapStyle: any[] = [];

// ─── Types ──────────────────────────────────────────
interface SiteDetailProps {
  navigation: any;
  route?: any;
}

interface GuardItem {
  id: string; // guard_id
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

interface InspectionItem {
  id: string;
  date: string;
  inspectorName: string;
  status: 'ALL CLEAR' | 'INCIDENT REPORTED';
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
  const [assignedGuards, setAssignedGuards] = useState<GuardItem[]>([]);
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'Profile' | 'Guards' | 'Inspections' | 'Settings'>('Profile');

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
      const [details, guardAssignments, inspectionRecords] = await Promise.all([
        siteService.getSiteDetail(siteId).catch(err => {
          console.warn('getSiteDetail failed, falling back to params', err);
          return null;
        }),
        siteService.getAssignments({ site_id: siteId }).catch(err => {
          console.warn('getAssignments failed', err);
          return [];
        }),
        inspectionService.getInspections({ site_id: siteId }).catch(err => {
          console.warn('getInspections failed', err);
          return [];
        }),
      ]);

      if (details) {
        setSiteDetails(details);
      }

      // Map assigned guards
      // Fetch employee_ids and categories from workforce_personnel for all assigned guards
      const guardIds = guardAssignments.map((a: any) => a.guard_id).filter(Boolean);
      let employeeIdMap: { [id: string]: string } = {};
      let categoryMap: { [id: string]: { name: string; prefix_code: string } } = {};
      if (guardIds.length > 0) {
        const { data: wpData } = await supabase
          .from('workforce_personnel')
          .select('id, employee_id, category:workforce_categories(name, prefix_code)')
          .in('id', guardIds);
        if (wpData) {
          wpData.forEach((wp: any) => {
            if (wp.employee_id) employeeIdMap[wp.id] = wp.employee_id;
            if (wp.category) {
              categoryMap[wp.id] = {
                name: (wp.category as any).name || '',
                prefix_code: (wp.category as any).prefix_code || '',
              };
            }
          });
        }
      }

      const mappedGuards: GuardItem[] = guardAssignments.map((assignment: any) => {
        const guardName = assignment.guards?.name || 'Unknown Guard';
        const nameParts = guardName.trim().split(' ');
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
        const catInfo = categoryMap[assignment.guard_id];

        return {
          id: assignment.guard_id,
          assignmentId: assignment.id,
          name: guardName,
          shift: assignment.shift_type.toUpperCase() as 'DAY' | 'NIGHT',
          status: assignment.is_active ? 'On-Duty' : 'Off-Duty',
          avatar: assignment.guards?.photo_url || undefined,
          initials,
          initialsColor,
          badge: employeeIdMap[assignment.guard_id] || assignment.guard_id,
          categoryPrefix: catInfo?.prefix_code || '',
          categoryName: catInfo?.name || '',
        };
      });
      setAssignedGuards(mappedGuards);

      // Query today's attendance records to compute present/absent stats
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: attData } = await supabase
        .from('workforce_attendance')
        .select('personnel_id, status')
        .eq('site_id', siteId)
        .eq('attendance_date', todayStr);

      const presentCount = attData ? attData.filter(a => a.status === 'present' || a.status === 'present_verified').length : 0;
      const absentCount = Math.max(0, mappedGuards.length - presentCount);
      setAttendanceStats({ present: presentCount, absent: absentCount });

      // Map inspections
      const mappedInspections: InspectionItem[] = inspectionRecords.map((record) => {
        let dateStr = 'N/A';
        if (record.created_at) {
          try {
            const dateObj = new Date(record.created_at);
            dateStr = dateObj.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }) + ' • ' + dateObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
          } catch (e) {
            dateStr = 'Just Now';
          }
        }

        return {
          id: record.id,
          date: dateStr,
          inspectorName: record.inspector?.name || 'Area Officer',
          status: record.incident_reported ? 'INCIDENT REPORTED' : 'ALL CLEAR',
        };
      });
      setInspections(mappedInspections);

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

  const handleAssignGuard = () => {
    navigation.navigate('AssignGuard', {
      siteId: siteId,
      siteName: siteDetails?.site_name || fallbackSiteName,
      address: siteDetails?.address || fallbackAddress,
    });
  };

  const handleGuardPress = (guardId: string) => {
    navigation.navigate('GuardDetail', { guardId });
  };

  const handleUnassignGuard = (assignmentId: string, guardName: string) => {
    Alert.alert(
      'Remove Assignment',
      `Are you sure you want to unassign ${guardName} from this site?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await siteService.unassignGuard(assignmentId);
              Alert.alert('Success', 'Guard unassigned successfully.');
              loadSiteData();
            } catch (err: any) {
              console.error('Error unassigning guard:', err);
              Alert.alert('Error', err.message || 'Failed to unassign guard.');
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
    let totalPersonnel = assignedGuards.length;
    let securityCount = 0;
    let hkCount = 0;
    let supervisorCount = 0;

    assignedGuards.forEach((g) => {
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
            <Text style={s.guardsSectionTitle}>Assigned Security Personnel</Text>
            <View style={s.activeGuardsBadge}>
              <Text style={s.activeGuardsBadgeText}>
                {assignedGuards.length} Total
              </Text>
            </View>
          </View>

          <View style={s.guardsList}>
            {assignedGuards.length === 0 ? (
              <View style={s.emptyGuardsList}>
                <MaterialIcons name="group-off" size={32} color={Colors.outline} />
                <Text style={s.emptyGuardsText}>
                  No security guards assigned to this site yet.
                </Text>
              </View>
            ) : (
              assignedGuards.map((guard) => (
                <View key={guard.id} style={s.guardCardInteractive}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleGuardPress(guard.id)}
                    style={s.guardCardInteractiveLeft}
                  >
                    {guard.avatar ? (
                      <Image source={{ uri: guard.avatar }} style={s.guardAvatar} />
                    ) : (
                      <View style={[s.guardAvatarFallback, { backgroundColor: guard.initialsColor }]}>
                        <Text style={s.guardAvatarFallbackText}>{guard.initials}</Text>
                      </View>
                    )}
                    <View style={s.guardInfo}>
                      <Text style={s.guardName}>{guard.name}</Text>
                      <Text style={s.guardBadgeId}>Badge: {guard.badge || '#N/A'}</Text>
                      <View style={s.guardMetaRow}>
                        <Text style={s.guardMetaLabel}>Shift: {guard.shift}</Text>
                        <Text style={s.guardMetaDivider}>•</Text>
                        <Text style={[
                          s.guardMetaStatus,
                          { color: guard.status === 'On-Duty' ? Colors.successGreen : Colors.outline }
                        ]}>
                          {guard.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {guard.assignmentId && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleUnassignGuard(guard.assignmentId!, guard.name)}
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
            onPress={handleAssignGuard}
            style={s.assignGuardBtn}
          >
            <MaterialIcons name="person-add" size={20} color={Colors.primary} />
            <Text style={s.assignGuardBtnText}>Assign Guard</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderInspectionsTab = () => {
    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={s.sectionContainer}>
          <Text style={s.tabSectionTitle}>Perimeter Inspections</Text>
          <View style={s.inspectionsCard}>
            {inspections.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialIcons name="fact-check" size={36} color={Colors.outline} />
                <Text style={{ marginTop: 8, color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' }}>
                  No inspection logs compiled for this perimeter.
                </Text>
              </View>
            ) : (
              inspections.map((inspection, idx) => {
                const isClear = inspection.status === 'ALL CLEAR';
                return (
                  <TouchableOpacity
                    key={inspection.id}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('InspectionDetail', { reportId: inspection.id })}
                    style={[
                      s.inspectionRow,
                      idx > 0 && s.inspectionRowBorder
                    ]}
                  >
                    <View style={s.inspectionLeft}>
                      <Text style={s.inspectionDate}>{inspection.date}</Text>
                      <Text style={s.inspectorName}>{inspection.inspectorName}</Text>
                    </View>
                    <View style={[
                      s.inspectionStatusBadge,
                      isClear ? s.inspectionStatusBadgeClear : s.inspectionStatusBadgeError
                    ]}>
                      <Text style={[
                        s.inspectionStatusText,
                        isClear ? s.inspectionStatusTextClear : s.inspectionStatusTextError
                      ]}>
                        {inspection.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
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
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.outline, fontWeight: '600', fontSize: 14 }}>
          Accessing geo-fencing logs...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#002752" />

      {/* ═══ Top App Bar ═══ */}
      <View style={[s.topNavbar, { paddingTop: insets.top }]}>
        {/* Brand Header */}
        <View style={s.brandHeader}>
          <View style={s.brandLogoWrap}>
            <Image
              alt="PIS Logo"
              style={s.brandLogo}
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw' }}
            />
            <Text style={s.brandText}>PIS</Text>
          </View>
          <TouchableOpacity style={s.notificationBtn} activeOpacity={0.7}>
            <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Title Bar */}
        <View style={s.titleBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backButtonNavbar}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.titleBarText}>Site Detail</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContainer}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Hero Section */}
        <View style={s.heroSection}>
          <Text style={s.heroSiteName}>{siteName}</Text>
          <View style={s.heroLocationContainer}>
            <MaterialIcons name="location-on" size={16} color="#FFFFFF" style={s.heroLocationIcon} />
            <Text style={s.heroAddressText}>
              {siteAddress}
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabSwitcherContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabSwitcherScroll}
          >
            {(['Profile', 'Guards', 'Inspections', 'Settings'] as const).map((tab) => {
              const isActive = activeTab === tab;
              let displayName: string = tab;
              if (tab === 'Profile') displayName = 'Overview Metrics';
              else if (tab === 'Guards') displayName = 'Workforce Roster';

              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[s.tabSwitcherButton, isActive && s.tabSwitcherButtonActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabSwitcherButtonText, isActive && s.tabSwitcherButtonTextActive]}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab contents */}
        {activeTab === 'Profile' && renderProfileTab()}
        {activeTab === 'Guards' && renderGuardsTab()}
        {activeTab === 'Inspections' && renderInspectionsTab()}
        {activeTab === 'Settings' && renderSettingsTab()}

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleAssignGuard}
        style={[s.fab, { bottom: 24 + insets.bottom }]}
      >
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
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
});
