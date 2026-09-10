import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Target, Plus, Trash2, CheckCircle2 } from 'lucide-react-native';
import { Goal } from '@/types/expense';
import { formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface GoalCardProps {
  goal: Goal;
  currency?: string;
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
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
      }}
      className="p-5 mb-4 rounded-3xl border shadow-sm"
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-2.5 flex-1">
          <View className="w-10 h-10 rounded-2xl bg-indigo-500/20 items-center justify-center">
            <Text className="text-lg">{goal.icon || '🎯'}</Text>
          </View>
          <View className="flex-1 ml-2">
            <Text style={{ color: colors.text }} className="text-base font-bold tracking-tight">
              {goal.title}
            </Text>
            {goal.target_date ? (
              <Text style={{ color: colors.muted }} className="text-xs">
                Target: {new Date(goal.target_date).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable onPress={() => onDelete(goal.id)} className="p-2" hitSlop={8}>
          <Trash2 size={16} color={colors.muted} />
        </Pressable>
      </View>

      {/* Progress Numbers */}
      <View className="flex-row justify-between items-baseline mb-2">
        <View className="flex-row items-baseline space-x-1">
          <Text style={{ color: colors.text }} className="text-2xl font-black">
            {formatCurrency(goal.current, currency)}
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs">
            / {formatCurrency(goal.target, currency)}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: isFinished ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
          }}
          className="px-2.5 py-1 rounded-full flex-row items-center space-x-1"
        >
          {isFinished ? <CheckCircle2 size={12} color="#10B981" /> : null}
          <Text
            style={{ color: isFinished ? '#10B981' : '#6366F1' }}
            className="text-xs font-bold"
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="w-full h-2.5 rounded-full bg-slate-700/30 overflow-hidden mb-4">
        <View
          style={{
            width: `${percentage}%`,
            backgroundColor: isFinished ? '#10B981' : '#6366F1',
          }}
          className="h-full rounded-full"
        />
      </View>

      {/* Quick Fund Buttons */}
      {!isFinished ? (
        <View className="flex-row items-center space-x-2 pt-1 border-t border-slate-700/20">
          <Text style={{ color: colors.muted }} className="text-xs font-medium mr-1">
            Quick Add:
          </Text>
          {[10, 25, 50].map((amt) => (
            <Pressable
              key={amt}
              onPress={() => handleFund(amt)}
              style={{
                backgroundColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(203, 213, 225, 0.8)',
              }}
              className="flex-1 py-2 rounded-xl border items-center justify-center active:scale-95"
            >
              <Text style={{ color: colors.text }} className="text-xs font-bold">
                +{formatCurrency(amt, currency)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center">
          <Text className="text-xs font-bold text-emerald-400">🎉 Goal Achieved!</Text>
        </View>
      )}
    </View>
  );
};
