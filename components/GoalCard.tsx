import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Target,
  Trash2,
  CheckCircle2,
  Palmtree,
  Smartphone,
  Car,
  Home,
  Plane,
  Laptop,
  GraduationCap,
  Gem,
  Gamepad2,
  Bike,
} from 'lucide-react-native';
import { Goal } from '@/types/expense';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';
import { AnimatedProgressBar } from '@/components/AnimatedPrimitives';

export function renderGoalIcon(iconName: string | undefined, color: string, size: number = 20) {
  switch (iconName) {
    case 'Palmtree':
      return <Palmtree size={size} color={color} />;
    case 'Smartphone':
      return <Smartphone size={size} color={color} />;
    case 'Car':
      return <Car size={size} color={color} />;
    case 'Home':
      return <Home size={size} color={color} />;
    case 'Plane':
      return <Plane size={size} color={color} />;
    case 'Laptop':
      return <Laptop size={size} color={color} />;
    case 'GraduationCap':
      return <GraduationCap size={size} color={color} />;
    case 'Gem':
      return <Gem size={size} color={color} />;
    case 'Gamepad2':
      return <Gamepad2 size={size} color={color} />;
    case 'Bike':
      return <Bike size={size} color={color} />;
    default:
      return <Target size={size} color={color} />;
  }
}

interface GoalCardProps {
  goal: Goal;
  currency?: string;
  index?: number;
  onAddFunds: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  onCompleted?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currency = 'USD',
  onAddFunds,
  onDelete,
  onCompleted,
}) => {
  const { colors, isDark } = useTheme();
  const percentage = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100));
  const isFinished = percentage >= 100;

  const handleFund = (amount: number) => {
    onAddFunds(goal.id, amount);
    if (goal.current + amount >= goal.target && onCompleted) {
      onCompleted();
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isFinished ? 'rgba(16, 185, 129, 0.4)' : colors.border,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.leftRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isFinished
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(99, 102, 241, 0.14)',
              },
            ]}
          >
            {renderGoalIcon(goal.icon, isFinished ? '#10B981' : '#6366F1', 20)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titleText, { color: colors.text }]}>
              {goal.title}
            </Text>
            {goal.target_date ? (
              <Text style={[styles.dateText, { color: colors.muted }]}>
                Target: {new Date(goal.target_date).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => onDelete(goal.id)}
          style={styles.deleteBtn}
          hitSlop={8}
          accessibilityLabel="Delete goal"
        >
          <Trash2 size={15} color={colors.muted} />
        </Pressable>
      </View>

      {/* Progress Numbers */}
      <View style={styles.numbersRow}>
        <View style={styles.baselineRow}>
          <Text style={[styles.currentText, { color: colors.text }]}>
            {formatCurrency(goal.current, currency)}
          </Text>
          <Text style={[styles.targetText, { color: colors.muted }]}>
            / {formatCurrency(goal.target, currency)}
          </Text>
        </View>
        <View
          style={[
            styles.pctBadge,
            {
              backgroundColor: isFinished
                ? 'rgba(16, 185, 129, 0.18)'
                : 'rgba(99, 102, 241, 0.15)',
            },
          ]}
        >
          {isFinished ? (
            <CheckCircle2 size={12} color="#10B981" style={{ marginRight: 4 }} />
          ) : null}
          <Text
            style={[
              styles.pctText,
              { color: isFinished ? '#10B981' : '#6366F1' },
            ]}
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 14 }}>
        <AnimatedProgressBar
          progress={percentage}
          color={isFinished ? '#10B981' : '#6366F1'}
          trackColor={isDark ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0'}
          height={10}
        />
      </View>

      {/* Quick Fund Buttons */}
      {!isFinished ? (
        <View style={styles.fundRow}>
          <Text style={[styles.fundLabel, { color: colors.muted }]}>Quick Add:</Text>
          {[10, 25, 50].map((amt) => (
            <Pressable
              key={amt}
              onPress={() => handleFund(amt)}
              style={[
                styles.fundBtn,
                {
                  backgroundColor: isDark ? '#162033' : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.fundBtnText, { color: colors.text }]}>
                +{formatCurrency(amt, currency)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.achievedBanner}>
          <CheckCircle2 size={14} color="#10B981" />
          <Text style={styles.achievedText}>Goal Achieved</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentText: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  targetText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  fundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    gap: 8,
  },
  fundLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  fundBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  achievedBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: 6,
  },
});
