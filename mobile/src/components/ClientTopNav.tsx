import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';

interface ClientTopNavProps {
  showBack?: boolean;
}

export default function ClientTopNav({ showBack = false }: ClientTopNavProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.header, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <View style={styles.headerInner}>
        <View style={styles.logoContainer}>
          {showBack && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <Image
            alt="Pan India Security Official Eagle Logo"
            style={styles.logoImage}
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw',
            }}
          />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="notifications-none" size={24} color="#43474f" />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.2)',
    justifyContent: 'center',
    zIndex: 50,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f3f7',
    marginRight: 12,
  },
  logoImage: {
    width: 160,
    height: 40,
    resizeMode: 'contain',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f3f7',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
