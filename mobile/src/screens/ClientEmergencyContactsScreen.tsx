import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientSiteInfo } from '../api/clientPortalService';
import type { Site } from '../types/workforce';

export default function ClientEmergencyContactsScreen({ navigation }: any) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const siteInfo = await getClientSiteInfo();
        setSite(siteInfo);
      } catch (err) {
        console.error('Error fetching site info for contacts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, []);

  const handleCall = (phoneNumber: string) => {
    let url = '';
    if (Platform.OS === 'android') {
      url = `tel:${phoneNumber}`;
    } else {
      url = `telprompt:${phoneNumber}`;
    }
    Linking.openURL(url).catch(err => console.error('Error opening dialer', err));
  };

  return (
    <View style={s.container}>
      {/* Top App Bar */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            <TouchableOpacity 
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Emergency Contacts</Text>
          </View>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1HLG5KhizKyOieN2GsZKC6QgboIDbqzuSODn2sgQ7CcrjjF0wyDc7NgYddAQkdYT7l6g4ELmWqbmdOSn5mrtzpiRnrxe1YL4YA3LvgxhbHdj0S1-pn8wq9EvAgHUbJWivV3zibAAoqVHDmAdR_qZan3qhmY4g-85epkx1rsFIkmxVrHeD2LgjCRgz3yWYlRbL4P4yMXGtsax2_x3HiZkNxzu8y0hmgKrAUNVdkJXtGMe6UxnayGSDX1Q60HCkPJ35ZxjJ4m37g70' }} 
            style={s.headerLogo}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
        
        {/* Site Contacts Section */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleContainer}>
              <MaterialIcons name="apartment" size={24} color={Colors.primary} />
              <Text style={s.sectionTitle}>Site Contacts</Text>
            </View>
            <View style={s.onlineBadge}>
              <View style={s.pulseDot} />
              <Text style={s.onlineBadgeText}>ONLINE</Text>
            </View>
          </View>

          <View style={s.contactsList}>
            {/* Site Supervisor */}
            <View style={s.contactCard}>
              <View style={s.contactInfo}>
                <View style={s.contactIconWrapper}>
                  <MaterialIcons name="badge" size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text style={s.contactRole}>SITE SUPERVISOR</Text>
                  <Text style={s.contactName}>{site?.site_supervisor_name || 'Not Assigned'}</Text>
                  <Text style={s.contactPhone}>{site?.site_supervisor_phone || 'N/A'}</Text>
                </View>
              </View>
              {site?.site_supervisor_phone && (
                <TouchableOpacity style={s.callBtn} onPress={() => handleCall(site.site_supervisor_phone!)}>
                  <MaterialIcons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Admin */}
            <View style={s.contactCard}>
              <View style={s.contactInfo}>
                <View style={s.contactIconWrapper}>
                  <MaterialIcons name="admin-panel-settings" size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text style={s.contactRole}>SYSTEM ADMIN</Text>
                  <Text style={s.contactName}>Pan India Admin</Text>
                  <Text style={s.contactPhone}>+91 99999 00000</Text>
                </View>
              </View>
              <TouchableOpacity style={s.callBtn} onPress={() => handleCall('+919999900000')}>
                <MaterialIcons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>



        {/* Location Context Card */}
        <View style={s.section}>
          <View style={s.locationCard}>
            <View style={s.mapImageContainer}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida/AP1WRLslZyl6p-e-mNnanPsehJe5bcPjU583H805r2O2qQ6mRECShmH77ZwRxSFMgm-tvXcq2LaeGi2sNUfU9gavC39OFdbSpOpwLPzYkQVECLTfM7mJlsjfQeJuuoVi5ttwPkU3wVe1kPURAzYDGwtzUau237rgtAqQGqpG6iRPEHuxieQNaT5klL7aKtUs4OC2i_rVtwe52ozg8GWwJflcnv6AK-9AXJSvFVd5sLEhX69G6x823jsIkEpfP9w' }} 
                style={s.mapImage} 
              />
              <View style={s.mapOverlay} />
            </View>
            
            <View style={s.locationDetails}>
              <View>
                <View style={s.locationSubLabelRow}>
                  <MaterialIcons name="location-on" size={14} color={Colors.primary} />
                  <Text style={s.locationSubLabel}>CURRENT SITE LOCATION</Text>
                </View>
                <Text style={s.locationTitle}>{site?.site_name || 'Loading...'}</Text>
                <Text style={s.locationAddress}>{site?.address || 'Loading...'}</Text>
              </View>
              
              <View style={s.divider} />
              
              <View style={s.coordinatesRow}>
                <View style={s.coordinateBlock}>
                  <Text style={s.coordinateLabel}>LATITUDE</Text>
                  <Text style={s.coordinateValue}>{site?.latitude ? `${parseFloat(site.latitude.toString()).toFixed(4)}° N` : 'N/A'}</Text>
                </View>
                <View style={s.coordinateDivider} />
                <View style={s.coordinateBlock}>
                  <Text style={s.coordinateLabel}>LONGITUDE</Text>
                  <Text style={s.coordinateValue}>{site?.longitude ? `${parseFloat(site.longitude.toString()).toFixed(4)}° E` : 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>© 2024 PAN INDIA SECURITY | SITE OPS V2.4.0</Text>
          <View style={s.footerSubtextContainer}>
            <MaterialIcons name="lock" size={12} color="rgba(67, 71, 79, 0.6)" />
            <Text style={s.footerSubtext}>CONFIDENTIAL EXECUTIVE INTERFACE</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    zIndex: 50,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
    letterSpacing: -0.5,
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 1.5,
  },
  contactsList: {
    gap: 16,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactRole: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Manrope',
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '30%',
    minWidth: 100,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  serviceNumber: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Manrope',
  },
  serviceCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  serviceCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  utilityTicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 198, 208, 0.3)',
    gap: 24,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  utilityNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  mapImageContainer: {
    height: 160,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 39, 82, 0.15)',
  },
  locationDetails: {
    padding: 24,
  },
  locationSubLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  locationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    fontFamily: 'Manrope',
    marginBottom: 6,
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 20,
  },
  coordinatesRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  coordinateBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  coordinateDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  coordinateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 198, 208, 0.3)',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    opacity: 0.8,
    marginBottom: 8,
  },
  footerSubtextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(67, 71, 79, 0.6)',
    letterSpacing: 1.5,
  },
});
