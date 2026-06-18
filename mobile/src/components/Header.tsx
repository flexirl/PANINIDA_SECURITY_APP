import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
}

export default function Header({ title, onBack, rightComponent }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.inner}>
        <View style={s.leftSection}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={s.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#111C2C" />
            </TouchableOpacity>
          )}
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        </View>
        {rightComponent && (
          <View style={s.rightSection}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111C2C',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
