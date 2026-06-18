import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VisitorLogView from '../components/VisitorLogView';
import { useAuth } from '../hooks/useAuth';
import { getVisitorLogsForSite, checkoutVisitor } from '../api/visitorLogService';
import { VisitorLog } from '../types/workforce';

export default function GuardVisitorLogScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const siteId = user?.current_assignment?.site_id;
        if (siteId) {
          const fetchedLogs = await getVisitorLogsForSite(siteId);
          setLogs(fetchedLogs);
        }
      } catch (err) {
        console.error('Error fetching visitor logs for guard:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchLogs();
    });
    
    fetchLogs();
    return unsubscribe;
  }, [navigation, user]);

  const handleCheckout = async (logId: string) => {
    try {
      await checkoutVisitor(logId);
      // Refresh logs
      const siteId = user?.current_assignment?.site_id;
      if (siteId) {
        const fetchedLogs = await getVisitorLogsForSite(siteId);
        setLogs(fetchedLogs);
      }
    } catch (err) {
      console.error('Error checking out visitor:', err);
    }
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
    } else if (key === 'profile') {
      navigation.navigate('GuardProfile');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      
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
            <Text style={s.topBarTitle}>Visitor Log</Text>
            <Text style={s.topBarSubtitle}>आगंतुक लॉग</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={{ flex: 1, marginTop: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <VisitorLogView 
            logs={logs}
            showAddButton={true} 
            onAddVisitor={() => navigation.navigate('AddVisitor')} 
            onCheckoutVisitor={handleCheckout}
            fabBottomOffset={Math.max(insets.bottom, 16) + 88}
          />
        )}
      </View>

      {/* Bottom Nav */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = false;
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,39,82,0.05)',
  },
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
  },
  topBarTitle: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 18,
  },
  topBarSubtitle: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontSize: 12,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  navItemActive: {
    backgroundColor: Colors.primary,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    color: Colors.onSurfaceVariant,
  },
  navLabelActive: {
    color: '#ffffff',
  },
});
