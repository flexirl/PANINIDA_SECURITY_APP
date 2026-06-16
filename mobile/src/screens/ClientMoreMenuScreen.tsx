import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClientTopNav from '../components/ClientTopNav';
import ClientBottomNav from '../components/ClientBottomNav';
import { useAuth } from '../hooks/useAuth';

export default function ClientMoreMenuScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signOutUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to logout');
    }
  };

  const menuItems = [
    {
      title: 'Visitor Log',
      icon: 'recent-actors',
      color: '#f59e0b',
      bg: '#fffbeb',
      onPress: () => navigation.navigate('ClientVisitorLog'),
    },
    {
      title: 'Performance',
      icon: 'insights',
      color: '#4338ca',
      bg: '#e0e7ff',
      onPress: () => navigation.navigate('ClientPerformance'),
    },
    {
      title: 'Site Complaint',
      icon: 'report-problem',
      color: '#B02021',
      bg: '#fef2f2',
      onPress: () => navigation.navigate('ClientComplaintList'),
    },
    {
      title: 'Emergency Contacts',
      icon: 'emergency',
      color: '#10b981',
      bg: '#ecfdf5',
      onPress: () => navigation.navigate('ClientEmergencyContacts'),
    },
    {
      title: 'Logout',
      icon: 'logout',
      color: '#43474f',
      bg: '#f4f3f7',
      onPress: handleLogout,
    },
  ];

  return (
    <View style={styles.container}>
      <ClientTopNav />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>More Options</Text>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#c3c6d0" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ClientBottomNav activeTab="more" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00132d',
    marginBottom: 8,
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#00132d',
  },
});
