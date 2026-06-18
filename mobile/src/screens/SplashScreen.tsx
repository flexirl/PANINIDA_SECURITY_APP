import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc';

interface SplashScreenProps {
  navigation: any;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const s = useScaledStyles(styles);
  const { user, loading } = useAuth();
  const [isAnimationDone, setIsAnimationDone] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Loader dots animation
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation (delayed 300ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Footer animation (delayed 600ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(footerTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Dots pulsing animation
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.stagger(200, [
            Animated.sequence([
              Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(dot1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(dot2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(dot3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]),
          ]),
        ])
      ).start();
    };
    animateDots();

    // Normal animation timer — signals animation is done after 3s
    const timer = setTimeout(() => {
      setIsAnimationDone(true);
    }, 3000);

    // Hard safety fallback — if auth loading hangs (AsyncStorage bug on Android Expo Go),
    // force navigate to Login after 10 seconds no matter what.
    const safetyTimer = setTimeout(() => {
      console.warn('[SplashScreen] Safety timeout triggered — forcing navigation to Login');
      navigation.replace('Login');
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  // Monitor loading status and animation completion to determine route
  useEffect(() => {
    if (isAnimationDone && !loading) {
      if (user) {
        if (user.role === 'admin' || user.role === 'manager') {
          navigation.replace('AdminDashboard');
        } else if (user.role === 'operations_manager') {
          navigation.replace('OperationsDashboard');
        } else if (user.role === 'supervisor') {
          navigation.replace('SupervisorDashboard');
        } else if (user.role === 'client_user') {
          navigation.replace('ClientPortalHome');
        } else if (user.role === 'workforce_personnel') {
          navigation.replace('PersonnelDashboard');
        } else if (user.role === 'guard') {
          navigation.replace('PersonnelDashboard');
        } else {
          navigation.replace('AdminDashboard');
        }
      } else {
        navigation.replace('Login');
      }
    }
  }, [isAnimationDone, loading, user, navigation]);

  return (
    <View style={s.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[Colors.primaryContainer, '#0f2d52', Colors.primaryContainer]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Atmospheric glow effects */}
      <View style={[s.glowCircle, s.glowTopLeft]} />
      <View style={[s.glowCircle, s.glowBottomRight]} />

      {/* Top spacer */}
      <View style={{ height: 40 }} />

      {/* Center Content */}
      <View style={s.centerContent}>
        {/* Logo */}
        <Animated.View
          style={[
            s.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={s.logoRing}>
            <Image source={{ uri: LOGO_URL }} style={s.logo} resizeMode="contain" />
          </View>
        </Animated.View>

        {/* Identity Text */}
        <Animated.View
          style={[
            s.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={s.title}>Pan India Security</Text>
          <View style={s.subtitleGroup}>
            <Text style={s.tagline}>ANYTIME ANYWHERE</Text>
            <View style={s.divider} />
            <Text style={s.subtitle}>Workforce Management System</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View
        style={[
          s.footer,
          {
            opacity: footerOpacity,
            transform: [{ translateY: footerTranslateY }],
          },
        ]}
      >
        {/* Loading dots */}
        <View style={s.dotsContainer}>
          <Animated.View style={[s.dot, { opacity: dot1 }]} />
          <Animated.View style={[s.dot, { opacity: dot2 }]} />
          <Animated.View style={[s.dot, { opacity: dot3 }]} />
        </View>

        {/* Attribution */}
        <Text style={s.footerLabel}>SECURE OPERATIONS TERMINAL</Text>
        <Text style={s.footerText}>
          Powered by <Text style={s.footerBold}>FLEXIRL</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.stackLg,
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
  },
  glowTopLeft: {
    top: -height * 0.1,
    left: -width * 0.1,
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: Colors.onPrimaryContainer,
  },
  glowBottomRight: {
    bottom: -height * 0.1,
    right: -width * 0.1,
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: Colors.onPrimaryContainer,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  logoContainer: {
    marginBottom: Spacing.stackLg,
  },
  logoRing: {
    padding: 24,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(138,169,223,0.1)',
  },
  logo: {
    width: 180,
    height: 180,
  },
  textContainer: {
    alignItems: 'center',
    gap: Spacing.stackSm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.onPrimary,
    letterSpacing: -0.5,
  },
  subtitleGroup: {
    alignItems: 'center',
    gap: 4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onPrimaryContainer,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: Colors.secondary,
    borderRadius: 9999,
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(227,226,231,0.8)',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.stackMd,
    marginBottom: Spacing.stackLg,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.onPrimary,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(227,226,231,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerText: {
    fontSize: 14,
    color: Colors.onPrimaryContainer,
    opacity: 0.9,
  },
  footerBold: {
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
