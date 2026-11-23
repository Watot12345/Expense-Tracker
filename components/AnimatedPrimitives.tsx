import React, { useEffect } from 'react';
import { Pressable, PressableProps, View, ViewStyle, StyleProp } from 'react-native';
import { styled } from 'nativewind';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

const StyledPressable = styled(Pressable);
const StyledView = styled(View);

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  scaleTo?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tactile spring-physics button wrapped with NativeWind `styled()` so `className`
 * always compiles properly on Web, iOS, and Android.
 */
const BaseAnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!disabled && !reducedMotion) {
      scale.value = withSpring(scaleTo, { damping: 18, stiffness: 360, mass: 0.6 });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!reducedMotion) {
      scale.value = withSpring(1, { damping: 14, stiffness: 300, mass: 0.7 });
    }
    onPressOut?.(e);
  };

  return (
    <StyledPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
      {...rest}
    >
      <Animated.View style={[animatedStyle, { flexDirection: 'inherit' as any, alignItems: 'center', justifyContent: 'center', width: '100%' }]}>
        {children}
      </Animated.View>
    </StyledPressable>
  );
};

export const AnimatedPressable = styled(BaseAnimatedPressable);

interface FadeInCardProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const BaseFadeInCard: React.FC<FadeInCardProps> = ({
  children,
  delay,
  index = 0,
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const computedDelay = delay !== undefined ? delay : Math.min(index * 50, 300);

  if (reducedMotion) {
    return <StyledView style={style}>{children}</StyledView>;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(computedDelay).duration(350).springify().damping(18).stiffness(160)}
      style={style}
    >
      {children}
    </Animated.View>
  );
};

export const FadeInCard = styled(BaseFadeInCard);

interface AnimatedProgressBarProps {
  progress: number; // 0 to 100
  color: string;
  trackColor?: string;
  height?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  color,
  trackColor = 'rgba(148, 163, 184, 0.2)',
  height = 8,
}) => {
  const clamped = Math.max(0, Math.min(100, progress));
  const widthPct = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      widthPct.value = clamped;
    } else {
      widthPct.value = withTiming(clamped, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clamped, reducedMotion, widthPct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: height / 2,
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
};
