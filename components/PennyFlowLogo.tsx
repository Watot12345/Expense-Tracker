import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface PennyFlowLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  subtitle?: string;
}

export const PennyFlowLogo: React.FC<PennyFlowLogoProps> = ({
  size = 44,
  showWordmark = false,
  wordmarkSize = 'md',
  animated = true,
  subtitle,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const floatY = useSharedValue(0);

  useEffect(() => {
    if (!animated || reducedMotion) {
      floatY.value = 0;
      return;
    }

    floatY.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [animated, reducedMotion, floatY]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const titleFontSize = wordmarkSize === 'lg' ? 28 : wordmarkSize === 'sm' ? 17 : 21;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.emblemShadow, { width: size, height: size }, iconAnimatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Defs>
            {/* Solid Obsidian Squircle Background */}
            <SvgLinearGradient id="pfBgGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#1E293B" />
              <Stop offset="100%" stopColor="#0F172A" />
            </SvgLinearGradient>

            {/* Crisp Accent Border */}
            <SvgLinearGradient id="pfRimGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#6366F1" />
              <Stop offset="100%" stopColor="#10B981" />
            </SvgLinearGradient>

            {/* Gold Coin Gradient */}
            <SvgLinearGradient id="pfCoinGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FDE68A" />
              <Stop offset="55%" stopColor="#F59E0B" />
              <Stop offset="100%" stopColor="#D97706" />
            </SvgLinearGradient>

            {/* Flowing 'P' Ribbon Gradient */}
            <SvgLinearGradient id="pfFlowGrad" x1="0.1" y1="0" x2="0.9" y2="1">
              <Stop offset="0%" stopColor="#818CF8" />
              <Stop offset="50%" stopColor="#38BDF8" />
              <Stop offset="100%" stopColor="#10B981" />
            </SvgLinearGradient>
          </Defs>

          {/* Outer Squircle */}
          <Rect
            x="4"
            y="4"
            width="112"
            height="112"
            rx="30"
            fill="url(#pfBgGrad)"
            stroke="url(#pfRimGrad)"
            strokeWidth="3"
          />

          {/* Stylized Gold Coin Accent */}
          <G>
            <Circle
              cx="47"
              cy="60"
              r="21"
              fill="url(#pfCoinGrad)"
            />
            <Path
              d="M47 50 C49.5 55.5 52 58 52 62 C52 65.5 49.8 68 47 68 C44.2 68 42 65.5 42 62 C42 58 44.5 55.5 47 50 Z"
              fill="#FEF3C7"
            />
          </G>

          {/* Sculpted Flowing 'P' Ribbon */}
          <Path
            d="M44 89 C46 74 52 67 66 64 C80 61 88 53 88 42 C88 31 79 24 67 24 C55 24 48 31 48 41 C48 45 50 48 53 49"
            fill="none"
            stroke="url(#pfFlowGrad)"
            strokeWidth="12.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {showWordmark && (
        <View style={styles.wordmarkContainer}>
          <View style={styles.wordmarkRow}>
            <Text
              style={[
                styles.wordmarkPrimary,
                { color: colors.text, fontSize: titleFontSize },
              ]}
            >
              Penny
            </Text>
            <Text
              style={[
                styles.wordmarkAccent,
                { fontSize: titleFontSize },
              ]}
            >
              Flow
            </Text>
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  wordmarkContainer: {
    marginLeft: 10,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmarkPrimary: {
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  wordmarkAccent: {
    fontWeight: '900',
    letterSpacing: -0.7,
    color: '#10B981',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
