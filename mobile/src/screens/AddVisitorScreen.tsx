import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, StatusBar, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { logVisitor } from '../api/visitorLogService';

export default function AddVisitorScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState<'Delivery' | 'Guest' | 'Maintenance' | 'Cab'>('Delivery');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const purposes: { id: 'Delivery' | 'Guest' | 'Maintenance' | 'Cab', label: string }[] = [
    { id: 'Delivery', label: 'Delivery' },
    { id: 'Guest', label: 'Guest / अतिथि' },
    { id: 'Maintenance', label: 'Maintenance' },
    { id: 'Cab', label: 'Cab / टैक्सी' }
  ];

  const handleSubmit = async () => {
    if (!name || !phone || !destination) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }
    
    const siteId = user?.current_assignment?.site_id;
    if (!siteId) {
      Alert.alert('Error', 'No active site assignment found.');
      return;
    }

    setLoading(true);
    try {
      await logVisitor({
        site_id: siteId,
        guard_id: user.id,
        visitor_name: name.trim(),
        visitor_phone: phone.trim(),
        flat_number: destination.trim(),
        purpose: purpose,
      });

      Alert.alert('Success', 'Visitor logged successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log visitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Nav */}
      <View style={[s.topBar, { height: 60 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }}
              style={s.logoImage}
            />
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={s.headerSection}>
          <Text style={s.pageTitle}>Log New Visitor</Text>
          <Text style={s.pageSubtitle}>नया आगंतुक दर्ज करें</Text>
        </View>

        <View style={s.formCard}>
          <View style={s.purposeSection}>
            <View style={s.purposeHeader}>
              <Text style={s.label}>PURPOSE OF VISIT / आगमन का कारण</Text>
              <Text style={s.requiredText}>* Required</Text>
            </View>
            <View style={s.chipsContainer}>
              {purposes.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.chip, purpose === p.id && s.chipActive]}
                  onPress={() => setPurpose(p.id)}
                >
                  <Text style={[s.chipText, purpose === p.id && s.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>VISITOR NAME / पूरा नाम</Text>
            <View style={s.inputContainer}>
              <MaterialIcons name="person-outline" size={20} color={Colors.outline} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Enter Full Name"
                placeholderTextColor={Colors.outline}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>PHONE NUMBER / फोन नंबर</Text>
            <View style={s.inputContainer}>
              <MaterialIcons name="phone-iphone" size={20} color={Colors.outline} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="+91 00000 00000"
                placeholderTextColor={Colors.outline}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>FLAT / UNIT NUMBER / फ्लैट/यूनिट संख्या</Text>
            <View style={s.inputContainer}>
              <MaterialIcons name="domain" size={20} color={Colors.outline} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="e.g. A-402"
                placeholderTextColor={Colors.outline}
                value={destination}
                onChangeText={setDestination}
              />
            </View>
          </View>

          <TouchableOpacity style={s.submitButton} onPress={handleSubmit} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={s.submitButtonText}>CHECK IN / चेक इन</Text>
                <MaterialIcons name="login" size={24} color="#ffffff" style={s.submitIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.helpInfoBox}>
          <MaterialIcons name="info-outline" size={24} color="#738fc0" style={s.helpIcon} />
          <Text style={s.helpInfoText}>
            Enter the visitor's details accurately to create a new entry. Accurate logs ensure better site security.{'\n'}
            <Text style={s.helpInfoTextBold}>नया आगंतुक दर्ज करने के लिए विवरण सही ढंग से भरें। सही लॉग साइट की बेहतर सुरक्षा सुनिश्चित करते हैं।</Text>
          </Text>
        </View>

        {/* Bottom padding for navigation bar space */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Decorative Blur Elements */}
      <View style={s.decorativeBlur1} pointerEvents="none" />
      <View style={s.decorativeBlur2} pointerEvents="none" />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  topBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
  },
  logoImage: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingTop: 24,
  },
  headerSection: {
    marginBottom: 24,
  },
  pageTitle: {
    ...Typography.h2,
    color: '#00132d',
    fontFamily: 'Manrope',
    fontWeight: '700',
    marginBottom: 4,
  },
  pageSubtitle: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    fontSize: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.5)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  purposeSection: {
    marginBottom: 24,
  },
  purposeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B02021',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: '#00132d',
    borderColor: '#00132d',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginTop: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.onSurface,
    height: '100%',
    fontFamily: 'Inter',
  },
  submitButton: {
    backgroundColor: '#B02021',
    borderRadius: 12,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Manrope',
  },
  submitIcon: {
    marginLeft: 12,
  },
  helpInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(171, 199, 252, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 199, 252, 0.2)',
    padding: 16,
    alignItems: 'flex-start',
  },
  helpIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  helpInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#294773',
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  helpInfoTextBold: {
    fontWeight: '700',
  },
  decorativeBlur1: {
    position: 'absolute',
    top: 80,
    right: 0,
    width: 256,
    height: 256,
    backgroundColor: 'rgba(0, 19, 45, 0.05)',
    borderRadius: 128,
  },
  decorativeBlur2: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    width: 320,
    height: 320,
    backgroundColor: 'rgba(176, 32, 33, 0.05)',
    borderRadius: 160,
  },
});
