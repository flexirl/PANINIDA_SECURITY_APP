import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface LogoutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ visible, onCancel, onConfirm }: LogoutModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <TouchableOpacity 
        style={styles.logoutModalBackdrop} 
        activeOpacity={1} 
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} style={styles.logoutModalContent}>
          <View style={styles.logoutIconContainer}>
            <MaterialIcons name="logout" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.logoutModalTitle}>Logging Out?</Text>
          <Text style={styles.logoutModalSubtitle}>
            You will need to sign in again to access your dashboard.
          </Text>
          
          <View style={styles.logoutModalActions}>
            <TouchableOpacity 
              style={styles.logoutModalCancelBtn}
              onPress={onCancel}
            >
              <Text style={styles.logoutModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.logoutModalDivider} />
            <TouchableOpacity 
              style={styles.logoutModalConfirmBtn}
              onPress={onConfirm}
            >
              <Text style={styles.logoutModalConfirmTxt}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 31, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLow || '#F4F3F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutModalSubtitle: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  logoutModalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  logoutModalCancelTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  logoutModalDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.outlineVariant,
  },
  logoutModalConfirmBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  logoutModalConfirmTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B02021',
  },
});
