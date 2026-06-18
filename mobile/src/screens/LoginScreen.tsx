import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const s = useScaledStyles(styles);
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePhoneChange = (text: string) => {
    // Allow only digits
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
      if (error) setError('');
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Trigger centralized sign in service
      await signIn(phone);

      setIsLoading(false);
      navigation.navigate('OtpVerification', { phone });
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={s.container}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

      {/* Background decoration */}
      <View style={s.bgCircleTopRight} />
      <View style={s.bgCircleBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.keyboardView}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoSection}>
            <View style={s.logoWrapper}>
              <Image
                source={{ uri: LOGO_URL }}
                style={s.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Form Container */}
          <View style={s.formContainer}>
            {/* Heading */}
            <View style={s.headingGroup}>
              <Text style={s.title}>Welcome / स्वागत है</Text>
              <Text style={s.subtitle}>
                Enter your registered phone number to continue
              </Text>
            </View>

            {/* Phone Input */}
            <View style={s.inputGroup}>
              <Text style={s.label}>PHONE NUMBER / फोन नंबर</Text>
              <View style={[s.inputRow, error ? s.inputRowError : null]}>
                {/* Prefix */}
                <View style={s.prefix}>
                  <MaterialIcons name="call" size={20} color={Colors.primary} />
                  <Text style={s.prefixText}>+91</Text>
                </View>
                {/* Input */}
                <TextInput
                  style={s.phoneInput}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="10-digit number"
                  placeholderTextColor={Colors.outline}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
            </View>

            {/* Send OTP Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[s.sendButton, isLoading && s.sendButtonDisabled]}
                onPress={handleSendOtp}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.onSecondary} />
                    <Text style={s.sendButtonText}>Verifying...</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.sendButtonText}>Send OTP</Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={22}
                      color={Colors.onSecondary}
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.footerCard}>
              <Text style={s.footerText}>Don't have an account?</Text>
              <Text style={s.footerLink}>Contact admin for access</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  bgCircleTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.04,
  },
  bgCircleBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.stackLg,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.stackLg,
    marginTop: 32,
  },
  logoWrapper: {
    width: 180,
    height: 180,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
  },
  headingGroup: {
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.stackLg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.stackSm,
    marginBottom: Spacing.stackLg,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: Spacing.buttonHeight,
    backgroundColor: Colors.surfaceContainer,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
    gap: 8,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  phoneInput: {
    flex: 1,
    height: Spacing.buttonHeight,
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.onSurface,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: Spacing.buttonHeight,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.85,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSecondary,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: Spacing.stackLg,
  },
  footerCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(195,198,208,0.3)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
});
