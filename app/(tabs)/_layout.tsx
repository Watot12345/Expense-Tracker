import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Home, PieChart, Target, User, Repeat, type LucideIcon } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface TabIconProps {
  focused: boolean;
  color: string;
  Icon: LucideIcon;
}

const AnimatedTabIcon: React.FC<TabIconProps> = ({ focused, color, Icon }) => {
  const scale = useSharedValue(focused ? 1.12 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.value = focused ? 1.05 : 1;
      translateY.value = 0;
    } else {
      scale.value = withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 260 });
      translateY.value = withSpring(focused ? -2 : 0, { damping: 14, stiffness: 260 });
    }
  }, [focused, reducedMotion, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activePill} /> : null}
      <Animated.View style={animStyle}>
        <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 1.9} />
      </Animated.View>
    </View>
  );
};

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 22 : 14,
          left: 16,
          right: 16,
          height: 66,
          borderRadius: 24,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} Icon={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} Icon={PieChart} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Subs',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} Icon={Repeat} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} Icon={Target} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} color={color} Icon={User} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
  },
  activePill: {
    position: 'absolute',
    width: 42,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
  },
});
