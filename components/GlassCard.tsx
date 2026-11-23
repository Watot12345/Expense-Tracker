import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
  style?: any;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  style,
  ...rest
}) => {
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: isDark ? '#000000' : '#0F172A',
          shadowOpacity: isDark ? 0.25 : 0.05,
        },
        style,
      ]}
      className={`rounded-3xl border overflow-hidden ${className}`}
      {...rest}
    >
      <View className="p-5">{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
});
