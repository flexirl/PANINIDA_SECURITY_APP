import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as siteService from '../api/siteService';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../api/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 32 - 32; // Screen edge padding + card internal padding

interface AddSiteScreenProps {
  navigation: any;
}

export default function AddSiteScreen({ navigation }: AddSiteScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { coords: deviceCoords, loading: locationLoading, getCurrentLocation } = useLocation();

  // ─── State Variables ────────────────────────────────
  const [siteName, setSiteName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(100); // meters
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [siteSupervisorName, setSiteSupervisorName] = useState('');
  const [siteSupervisorPhone, setSiteSupervisorPhone] = useState('');
  const [latitude, setLatitude] = useState(19.0760); // Default to Mumbai
  const [longitude, setLongitude] = useState(72.8777);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Map & Custom Location Search States
  const mapRef = useRef<MapView>(null);
  const [activeLocationTab, setActiveLocationTab] = useState<'search' | 'gps' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Manual coordinates inputs
  const [manualLat, setManualLat] = useState('19.0760');
  const [manualLng, setManualLng] = useState('72.8777');

  // Day shift times
  const [dayStart, setDayStart] = useState('08:00 AM');
  const [dayEnd, setDayEnd] = useState('08:00 PM');
  // Night shift times
  const [nightStart, setNightStart] = useState('08:00 PM');
  const [nightEnd, setNightEnd] = useState('08:00 AM');

  // Interactive picker state
  const [activePicker, setActivePicker] = useState<{
    type: 'dayStart' | 'dayEnd' | 'nightStart' | 'nightEnd';
    label: string;
  } | null>(null);

  // Form Submission Anim States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveBtnWidth = useRef(new Animated.Value(1)).current;
  const saveBtnColor = useRef(new Animated.Value(0)).current;

  // Sync manual coordinate text with state coordinates
  useEffect(() => {
    setManualLat(latitude.toFixed(6));
    setManualLng(longitude.toFixed(6));
  }, [latitude, longitude]);

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
        
        setLatitude(lat);
        setLongitude(lng);
        setAddress(formattedAddress);
        
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
        setAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleApplyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Latitude must be -90 to 90, Longitude must be -180 to 180.');
      return;
    }
    setLatitude(lat);
    setLongitude(lng);
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
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
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

  const handlePhotoUpload = () => {
    Alert.alert('Upload Photo', 'Select a site photo source:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: () => {
          // Simulate camera upload
          setProfilePhoto('https://lh3.googleusercontent.com/aida-public/AB6AXuAqU7hrF83xo0MKSY8cSndC4EG0SplBIWY-aKMK5mj8PiOP_NwIxwxbfIfO2RMjEaasEp0s0RBFjxkI3zT5APVsQvGOs0VAAhydvn9TAMk6KZt9VXtJia-kuf1_akmJ3LocxBvVAMkaad975dUK5olchaZc8R09i9Xf0_70XDhIkXWXJyKDiFB2d4Kh1y9Dy6KraKNHWjswn1t_qH7j5dOeFtIDnqW2cZ-5D7rUxno7fL9LnM4E2M9CyiV6eu3nSEKh5PDGW_i2Dk0');
        }
      },
      {
        text: 'Gallery',
        onPress: () => {
          // Simulate gallery upload
          setProfilePhoto('https://lh3.googleusercontent.com/aida-public/AB6AXuAqU7hrF83xo0MKSY8cSndC4EG0SplBIWY-aKMK5mj8PiOP_NwIxwxbfIfO2RMjEaasEp0s0RBFjxkI3zT5APVsQvGOs0VAAhydvn9TAMk6KZt9VXtJia-kuf1_akmJ3LocxBvVAMkaad975dUK5olchaZc8R09i9Xf0_70XDhIkXWXJyKDiFB2d4Kh1y9Dy6KraKNHWjswn1t_qH7j5dOeFtIDnqW2cZ-5D7rUxno7fL9LnM4E2M9CyiV6eu3nSEKh5PDGW_i2Dk0');
        }
      }
    ]);
  };

  // ─── Custom Slider Gestures ─────────────────────────
  const minVal = 50;
  const maxVal = 1000;
  const range = maxVal - minVal;

  const getThumbPosition = () => {
    const percent = (radius - minVal) / range;
    return percent * SLIDER_WIDTH;
  };

  const updateRadiusFromX = (x: number) => {
    let percent = x / SLIDER_WIDTH;
    percent = Math.max(0, Math.min(1, percent));
    const rawVal = minVal + percent * range;
    const steppedVal = Math.round(rawVal / 50) * 50;
    setRadius(Math.max(minVal, Math.min(maxVal, steppedVal)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const touchX = evt.nativeEvent.locationX;
        updateRadiusFromX(touchX);
      },
      onPanResponderMove: (evt, gestureState) => {
        const touchX = evt.nativeEvent.locationX + gestureState.dx;
        updateRadiusFromX(touchX);
      },
    })
  ).current;

  // ─── Time Picker Bottom Sheet Helper ────────────────
  const openTimePicker = (
    type: 'dayStart' | 'dayEnd' | 'nightStart' | 'nightEnd',
    label: string
  ) => {
    setActivePicker({ type, label });
  };

  const selectTime = (time: string) => {
    if (!activePicker) return;
    if (activePicker.type === 'dayStart') setDayStart(time);
    else if (activePicker.type === 'dayEnd') setDayEnd(time);
    else if (activePicker.type === 'nightStart') setNightStart(time);
    else if (activePicker.type === 'nightEnd') setNightEnd(time);
    setActivePicker(null);
  };

  const TIME_OPTIONS = [
    '06:00 AM',
    '07:00 AM',
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
  ];

  // ─── Auto-assign client phone to site ─────────────
  const assignClientPhoneToSite = async (phone: string, siteId: string, name?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');

    // 1. Check if a user with this phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('phone', cleanPhone)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update role to client_user if not already
      if (existingUser.role !== 'client_user') {
        await supabase
          .from('users')
          .update({ role: 'client_user' })
          .eq('id', existingUser.id);
      }
    } else {
      // Create new user record with client_user role
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          phone: cleanPhone,
          role: 'client_user',
          name: name || `Client ${cleanPhone.slice(-4)}`,
          is_active: true,
        })
        .select('id')
        .single();

      if (userError || !newUser) {
        throw new Error(userError?.message || 'Failed to create client user record');
      }
      userId = newUser.id;
    }

    // 2. Check if client_users record already exists for this user+site
    const { data: existingClientUser } = await supabase
      .from('client_users')
      .select('id')
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .maybeSingle();

    if (!existingClientUser) {
      // 3. Create client_users record linking user → site
      const { error: clientError } = await supabase
        .from('client_users')
        .insert({
          user_id: userId,
          site_id: siteId,
          client_role: 'society_president',
          is_active: true,
        });

      if (clientError) {
        throw new Error(clientError.message || 'Failed to link client to site');
      }
    }

    // 4. Also add to role_assignments table for admin visibility
    const { data: existingAssignment } = await supabase
      .from('role_assignments')
      .select('id')
      .eq('phone', cleanPhone)
      .eq('assigned_role', 'client_user')
      .eq('is_active', true)
      .maybeSingle();

    if (!existingAssignment) {
      await supabase
        .from('role_assignments')
        .insert({
          phone: cleanPhone,
          assigned_role: 'client_user',
          label: name || `Client ${cleanPhone.slice(-4)}`,
          is_active: true,
        });
    }
  };

  // ─── Form Submission Logic ─────────────────────────
  const handleSave = async () => {
    if (!siteName.trim()) {
      Alert.alert('Required Field', 'Please enter a Site Name.');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Required Field', 'Please enter a Client Name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter a Site Address.');
      return;
    }
    if (clientPhone.length > 0 && clientPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Client phone must be a valid 10-digit number.');
      return;
    }

    setIsSaving(true);

    // Shrink button for haptic effect
    Animated.timing(saveBtnWidth, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();

    try {
      const sitePayload = {
        site_name: siteName,
        client_name: clientName,
        address: address,
        latitude: latitude,
        longitude: longitude,
        geofence_radius: radius,
        day_shift_start: dayStart,
        day_shift_end: dayEnd,
        night_shift_start: nightStart,
        night_shift_end: nightEnd,
        contact_person: contactName.trim() || clientName.trim() || 'N/A',
        contact_phone: contactPhone ? `+91${contactPhone}` : (clientPhone.length === 10 ? `+91${clientPhone}` : 'N/A'),
        site_supervisor_name: siteSupervisorName.trim(),
        site_supervisor_phone: siteSupervisorPhone ? `+91${siteSupervisorPhone}` : '',
      };

      const createdSite = await siteService.createSite(sitePayload);

      // Auto-assign client phone as client_user for this site
      if (clientPhone.length === 10 && createdSite?.id) {
        try {
          await assignClientPhoneToSite(clientPhone, createdSite.id, clientName);
          console.log('[AddSite] Client phone auto-assigned to site:', clientPhone);
        } catch (clientErr: any) {
          console.warn('[AddSite] Client auto-assignment failed (non-fatal):', clientErr?.message);
          // Non-fatal: site was created, just warn about client assignment failure
          Alert.alert(
            'Site Created',
            `Site saved successfully, but client phone assignment failed: ${clientErr?.message || 'Unknown error'}. You can assign the client manually from Settings → Role Management.`
          );
        }
      }

      setSaveSuccess(true);
      Animated.parallel([
        Animated.timing(saveBtnWidth, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(saveBtnColor, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();

      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        navigation.goBack();
      }, 1000);

    } catch (err: any) {
      setIsSaving(false);
      Animated.timing(saveBtnWidth, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Alert.alert('Save Failed', err.message || 'Unable to register site. Please verify coordinates and try again.');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Add New Site</Text>
        </View>
        <View style={s.topBarRight}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
            style={s.logoImage}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Card Container */}
          <View style={s.formCard}>
            
            {/* Site Profile Photo Uploader */}
            <View style={s.photoSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={s.photoUploaderBox}
                onPress={handlePhotoUpload}
              >
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={s.uploadedImage} />
                ) : (
                  <View style={s.photoUploaderPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={36} color={Colors.outline} />
                    <Text style={s.photoUploadText}>Upload Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={s.photoLabel}>Site Profile Photo</Text>
            </View>

            {/* General Fields */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Site Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Mumbai Logistics Hub"
                placeholderTextColor={Colors.outline}
                value={siteName}
                onChangeText={setSiteName}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Client Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Zenith Enterprises"
                placeholderTextColor={Colors.outline}
                value={clientName}
                onChangeText={setClientName}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Client Phone <Text style={{ fontSize: 10, color: Colors.outline, fontWeight: '400' }}>(auto-assigned as Client Portal user)</Text></Text>
              <View style={s.phoneInputWrapper}>
                <Text style={s.phonePrefix}>+91</Text>
                <TextInput
                  style={s.phoneInput}
                  placeholder="Client's 10-digit number"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  value={clientPhone}
                  onChangeText={(text) => setClientPhone(text.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                />
              </View>
              {clientPhone.length > 0 && clientPhone.length < 10 && (
                <Text style={{ fontSize: 11, color: Colors.error, marginTop: 4 }}>Enter complete 10-digit number</Text>
              )}
              {clientPhone.length === 10 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                  <MaterialIcons name="check-circle" size={14} color={Colors.successGreen} />
                  <Text style={{ fontSize: 11, color: Colors.successGreen, fontWeight: '600' }}>This number will get Client Portal access for this site</Text>
                </View>
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Site Address</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Enter full postal address"
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
                textAlignVertical="top"
              />
            </View>

            {/* ═══ Location Options Section ═══ */}
            <View style={s.locationSection}>
              <Text style={s.locationSectionHeader}>LOCATION SELECTION MODE</Text>

              {/* Map Preview Block — rendered FIRST, above the search panels */}
              <View style={s.mapSection}>
                <View style={s.mapSectionHeader}>
                  <Text style={s.label}>Map Location Preview</Text>
                  <Text style={s.mapCoordsText}>
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </Text>
                </View>
                <View style={s.mapContainer}>
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={s.mapView}
                    initialRegion={{
                      latitude: latitude,
                      longitude: longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={true}
                    rotateEnabled={true}
                  >
                    <Circle
                      center={{ latitude, longitude }}
                      radius={radius}
                      strokeColor="rgba(0, 39, 82, 0.4)"
                      fillColor="rgba(0, 39, 82, 0.08)"
                      strokeWidth={1}
                    />
                    <Marker
                      coordinate={{ latitude, longitude }}
                      draggable
                      onDragEnd={(e) => {
                        const newCoords = e.nativeEvent.coordinate;
                        setLatitude(newCoords.latitude);
                        setLongitude(newCoords.longitude);
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
                <View style={s.tabContainer}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('search')}
                    style={[s.tabButton, activeLocationTab === 'search' && s.activeTabButton]}
                  >
                    <MaterialIcons name="search" size={16} color={activeLocationTab === 'search' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabText, activeLocationTab === 'search' && s.activeTabText]}>Search</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('gps')}
                    style={[s.tabButton, activeLocationTab === 'gps' && s.activeTabButton]}
                  >
                    <MaterialIcons name="my-location" size={16} color={activeLocationTab === 'gps' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabText, activeLocationTab === 'gps' && s.activeTabText]}>GPS Lock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveLocationTab('manual')}
                    style={[s.tabButton, activeLocationTab === 'manual' && s.activeTabButton]}
                  >
                    <MaterialIcons name="edit-location-alt" size={16} color={activeLocationTab === 'manual' ? '#ffffff' : Colors.onSurfaceVariant} />
                    <Text style={[s.tabText, activeLocationTab === 'manual' && s.activeTabText]}>Manual</Text>
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

                  {/* Inline Autocomplete Results — rendered below map, fully visible */}
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
                      <View>
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
                    <View style={[s.inputGroup, { flex: 1 }]}>
                      <Text style={s.coordsLabelInput}>Latitude</Text>
                      <TextInput
                        style={s.coordsInput}
                        placeholder="19.0760"
                        placeholderTextColor={Colors.outline}
                        keyboardType="numeric"
                        value={manualLat}
                        onChangeText={setManualLat}
                        onBlur={handleApplyManualCoords}
                      />
                    </View>
                    <View style={[s.inputGroup, { flex: 1 }]}>
                      <Text style={s.coordsLabelInput}>Longitude</Text>
                      <TextInput
                        style={s.coordsInput}
                        placeholder="72.8777"
                        placeholderTextColor={Colors.outline}
                        keyboardType="numeric"
                        value={manualLng}
                        onChangeText={setManualLng}
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

            {/* Geofence Radius Slider */}
            <View style={s.geofenceContainer}>
              <View style={s.geofenceHeader}>
                <Text style={s.label}>Geofence Radius</Text>
                <Text style={s.radiusBadgeVal}>{radius}m</Text>
              </View>

              {/* Slider Track Container */}
              <View style={s.sliderTrackContainer} {...panResponder.panHandlers}>
                <View style={s.sliderBackgroundTrack} />
                <View style={[s.sliderActiveTrack, { width: getThumbPosition() }]} />
                <View style={[s.sliderThumb, { left: getThumbPosition() - 10 }]} />
              </View>

              <View style={s.sliderLabels}>
                <Text style={s.sliderLabel}>50m</Text>
                <Text style={s.sliderLabel}>500m</Text>
                <Text style={s.sliderLabel}>1km</Text>
              </View>
            </View>

            <View style={s.divider} />

            {/* Contact Information Section */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Contact Person Name</Text>
              <TextInput
                style={s.input}
                placeholder="Full name of site supervisor"
                placeholderTextColor={Colors.outline}
                value={contactName}
                onChangeText={setContactName}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Contact Phone</Text>
              <View style={s.phoneInputWrapper}>
                <Text style={s.phonePrefix}>+91</Text>
                <TextInput
                  style={s.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  maxLength={10}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Site Supervisor Name</Text>
              <TextInput
                style={s.input}
                placeholder="Full name of site supervisor"
                placeholderTextColor={Colors.outline}
                value={siteSupervisorName}
                onChangeText={setSiteSupervisorName}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Site Supervisor Phone</Text>
              <View style={s.phoneInputWrapper}>
                <Text style={s.phonePrefix}>+91</Text>
                <TextInput
                  style={s.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  value={siteSupervisorPhone}
                  onChangeText={setSiteSupervisorPhone}
                  maxLength={10}
                />
              </View>
            </View>

            <View style={s.divider} />

            {/* Shift Configuration Section */}
            <Text style={s.shiftSectionHeader}>Shift Timings</Text>

            <View style={s.shiftsGrid}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Day Shift Start</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.timePickerButton}
                  onPress={() => openTimePicker('dayStart', 'Day Shift Start')}
                >
                  <Text style={s.timeText}>{dayStart}</Text>
                  <MaterialIcons name="schedule" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Day Shift End</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.timePickerButton}
                  onPress={() => openTimePicker('dayEnd', 'Day Shift End')}
                >
                  <Text style={s.timeText}>{dayEnd}</Text>
                  <MaterialIcons name="schedule" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.shiftsGrid}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Night Shift Start</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.timePickerButton}
                  onPress={() => openTimePicker('nightStart', 'Night Shift Start')}
                >
                  <Text style={s.timeText}>{nightStart}</Text>
                  <MaterialIcons name="schedule" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Night Shift End</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.timePickerButton}
                  onPress={() => openTimePicker('nightEnd', 'Night Shift End')}
                >
                  <Text style={s.timeText}>{nightEnd}</Text>
                  <MaterialIcons name="schedule" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Site Button */}
            <Animated.View style={[s.saveBtnWrap, { transform: [{ scale: saveBtnWidth }] }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={isSaving}
                style={[
                  s.saveButton,
                  saveSuccess && s.saveButtonSuccess,
                  isSaving && s.saveButtonDisabled
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : saveSuccess ? (
                  <>
                    <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                    <Text style={s.saveButtonText}>Site Saved</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="save" size={24} color="#FFFFFF" />
                    <Text style={s.saveButtonText}>Save Site</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

          </View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Time Picker Modal Sheet */}
      {activePicker && (
        <View style={s.bottomSheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setActivePicker(null)}
          />
          <View style={s.bottomSheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{activePicker.label}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setActivePicker(null)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.sheetScroll} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={s.sheetItem}
                  onPress={() => selectTime(time)}
                >
                  <Text style={s.sheetItemText}>{time}</Text>
                  <MaterialIcons name="schedule" size={18} color={Colors.outline} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  // Header Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 175,
    height: 44,
    resizeMode: 'contain',
  },

  // Main Card Container
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: 'rgba(26, 61, 109, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    gap: 16,
  },

  // Photo Uploader Box
  photoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoUploaderBox: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoUploaderPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoUploadText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // Inputs generic
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: 'transparent',
  },
  textArea: {
    height: 96,
  },

  // Map zone
  mapContainer: {
    height: 192,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
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
  mapCollapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderStyle: 'dashed',
  },
  mapCollapsedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  mapCollapsedCoords: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 1,
  },
  mapCollapsedHint: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.outline,
    fontStyle: 'italic',
  },

  // Unified Location Options Style Block
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
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 26,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 24,
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeTabText: {
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
  },

  // Geofence Radius
  geofenceContainer: {
    marginTop: 8,
    gap: 8,
  },
  geofenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusBadgeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  sliderTrackContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderBackgroundTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
    width: '100%',
  },
  sliderActiveTrack: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    position: 'absolute',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
  },

  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 8,
  },

  // Contact prefixes
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.onSurface,
  },

  // Shifts timings
  shiftSectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
  },
  shiftsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  timeText: {
    fontSize: 14,
    color: Colors.onSurface,
  },

  // Save Site button
  saveBtnWrap: {
    marginTop: 16,
    width: '100%',
  },
  saveButton: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonSuccess: {
    backgroundColor: '#16A34A',
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Time Picker Modal Sheet
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetScroll: {
    padding: 16,
  },
  sheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer,
  },
  sheetItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
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
});
