import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';

const OTP_LENGTH = 6;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OtpScreenProps {
  navigation: any;
  route: any;
}

// Animated confetti particle component
function ConfettiParticle({ delay, startX, startY, color }: { delay: number; startX: number; startY: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetX = (Math.random() - 0.5) * 200;
    const targetY = (Math.random() - 0.5) * 200;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
        Animated.timing(translateY, { toValue: targetY, duration: 1000, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: targetX, duration: 1000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${Math.random() > 0.5 ? '' : '-'}${180 + Math.random() * 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: spin }],
      }}
    />
  );
}

export default function OtpScreen({ navigation, route }: OtpScreenProps) {
  const s = useScaledStyles(styles);
  const { verifyOtpCode, signIn } = useAuth();
  const phone = route?.params?.phone || '9876500000';
  const maskedPhone = phone.slice(0, 5) + 'XXXXX';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Success animation values
  const successOverlayOpacity = useRef(new Animated.Value(0)).current;
  const successCircleScale = useRef(new Animated.Value(0)).current;
  const successCheckScale = useRef(new Animated.Value(0)).current;
  const successTextOpacity = useRef(new Animated.Value(0)).current;
  const successTextTranslateY = useRef(new Animated.Value(20)).current;
  const successRingScale = useRef(new Animated.Value(0.5)).current;
  const successRingOpacity = useRef(new Animated.Value(0)).current;
  const successPulse = useRef(new Animated.Value(1)).current;

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const s = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `0:${s}`;
  };

  const handleOtpChange = (text: string, index: number) => {
    // Allow only digits
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
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

  const playSuccessAnimation = (userProfile: any) => {
    Keyboard.dismiss();
    setShowSuccess(true);

    // Staggered entrance animations
    Animated.sequence([
      // 1. Fade in the overlay backdrop
      Animated.timing(successOverlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 2. Scale in the circle + ring pulse
      Animated.parallel([
        Animated.spring(successCircleScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(successRingOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
            Animated.timing(successRingScale, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(successRingOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.timing(successRingScale, { toValue: 1.8, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]),
    ]).start(() => {
      // 3. Pop in the checkmark
      Animated.spring(successCheckScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // 4. Pulse the circle gently
      Animated.loop(
        Animated.sequence([
          Animated.timing(successPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(successPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // 5. Slide in the text
      Animated.parallel([
        Animated.timing(successTextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(successTextTranslateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();

      // 6. Auto-navigate after showing success
      setTimeout(() => {
        // Role-based routing
        if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
          navigation.replace('AdminDashboard');
        } else if (userProfile?.role === 'operations_manager') {
          navigation.replace('OperationsDashboard');
        } else if (userProfile?.role === 'supervisor') {
          navigation.replace('SupervisorDashboard');
        } else if (userProfile?.role === 'client_user') {
          navigation.replace('ClientPortalHome');
        } else if (userProfile?.role === 'inspector') {
          navigation.replace('InspectorDashboard');
        } else if (userProfile?.role === 'workforce_personnel' || userProfile?.role === 'guard') {
          navigation.replace('PersonnelDashboard');
        } else {
          navigation.replace('AdminDashboard');
        }
      }, 2500);
    });
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== OTP_LENGTH) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP via centralized auth service hook
      const profile = await verifyOtpCode(phone, otpValue);
      setIsLoading(false);
      playSuccessAnimation(profile);
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Failed to verify OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimeLeft(30);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();

    try {
      await signIn(phone);
      Alert.alert('OTP Resent', `A new OTP has been sent to +91 ${maskedPhone}`);
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Could not resend OTP. Please try again.');
      setCanResend(true);
      setTimeLeft(0);
    }
  };

  const handleChangeNumber = () => {
    navigation.goBack();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Confetti colors
  const confettiColors = [
    Colors.successGreen,
    '#FFD700',
    Colors.primary,
    Colors.secondaryContainer,
    '#4ECDC4',
    '#A78BFA',
    '#F97316',
    '#06B6D4',
  ];

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    delay: Math.random() * 400 + 200,
    startX: SCREEN_WIDTH / 2 - 4,
    startY: SCREEN_HEIGHT / 2 - 60,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: Colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={s.innerContainer}>
            <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

            <View style={s.content}>
          {/* Shield Icon */}
          <View style={s.iconContainer}>
            <View style={s.iconCircle}>
              <MaterialIcons name="verified-user" size={44} color={Colors.primary} />
            </View>
          </View>

          {/* Titles */}
          <View style={s.titleSection}>
            <Text style={s.title}>Verify OTP</Text>
            <Text style={s.titleHindi}>ओटीपी सत्यापित करें</Text>
            <View style={s.phoneRow}>
              <Text style={s.phoneText}>OTP sent to +91 {maskedPhone}</Text>
              <TouchableOpacity onPress={handleChangeNumber}>
                <Text style={s.changeButton}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* OTP Input Fields */}
          <View style={s.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  s.otpInput,
                  digit ? s.otpInputFilled : null,
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                placeholder="•"
                placeholderTextColor={Colors.outlineVariant}
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Verify Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
            <TouchableOpacity
              style={[s.verifyButton, isLoading && s.verifyButtonLoading]}
              onPress={handleVerify}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading || showSuccess}
              activeOpacity={0.9}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.onSecondary} />
              ) : (
                <>
                  <Text style={s.verifyButtonText}>Verify</Text>
                  <MaterialIcons name="verified" size={20} color={Colors.onSecondary} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Resend Section */}
          <View style={s.resendSection}>
            <View style={s.timerRow}>
              <MaterialIcons name="timer" size={18} color={Colors.onSurfaceVariant} />
              <Text style={s.timerText}>
                Resend OTP in{' '}
                <Text style={s.timerBold}>{formatTime(timeLeft)}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={handleResend} disabled={!canResend}>
              <Text
                style={[
                  s.resendButton,
                  canResend ? s.resendButtonActive : s.resendButtonDisabled,
                ]}
              >
                Resend OTP Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>

          </View>
        </TouchableWithoutFeedback>

        {/* ============ SUCCESS OVERLAY ============ */}
        {showSuccess && (
          <Animated.View
            style={[
              s.successOverlay,
              { opacity: successOverlayOpacity },
            ]}
          >
            {/* Confetti particles */}
            {confettiParticles.map((p) => (
              <ConfettiParticle
                key={p.id}
                delay={p.delay}
                startX={p.startX}
                startY={p.startY}
                color={p.color}
              />
            ))}

            {/* Expanding ring */}
            <Animated.View
              style={[
                s.successRing,
                {
                  opacity: successRingOpacity,
                  transform: [{ scale: successRingScale }],
                },
              ]}
            />

            {/* Circle with checkmark */}
            <Animated.View
              style={[
                s.successCircle,
                {
                  transform: [
                    { scale: Animated.multiply(successCircleScale, successPulse) },
                  ],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [{ scale: successCheckScale }],
                }}
              >
                <MaterialIcons name="check" size={56} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>

            {/* Text */}
            <Animated.View
              style={[
                s.successTextContainer,
                {
                  opacity: successTextOpacity,
                  transform: [{ translateY: successTextTranslateY }],
                },
              ]}
            >
              <Text style={s.successTitle}>OTP Verified!</Text>
              <Text style={s.successTitleHindi}>ओटीपी सत्यापित!</Text>
              <Text style={s.successSubtitle}>
                Authentication successful. Redirecting...
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 40,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.stackLg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26,61,109,0.08)',
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.stackLg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  titleHindi: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(0,39,82,0.8)',
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginBottom: Spacing.stackLg,
  },
  otpInput: {
    flex: 1,
    height: 56,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    color: Colors.onSurface,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: Spacing.buttonHeight,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: Spacing.stackMd,
  },
  verifyButtonLoading: {
    opacity: 0.85,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSecondary,
  },
  resendSection: {
    alignItems: 'center',
    gap: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  timerBold: {
    fontWeight: '600',
    color: Colors.primary,
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginTop: 4,
  },
  resendButtonActive: {
    color: Colors.primary,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  resendButtonDisabled: {
    color: Colors.outline,
    opacity: 0.6,
  },

  // ===== Success Overlay Styles =====
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250,249,253,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  successRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.successGreen,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.successGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  successTextContainer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 4,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
  },
  successTitleHindi: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(0,39,82,0.7)',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
});
