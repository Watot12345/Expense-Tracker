import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Utensils,
  Car,
  Receipt,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  CreditCard,
  Trash2,
  Edit3,
} from 'lucide-react-native';
import { Expense } from '@/types/expense';
import { CATEGORY_META, formatCurrency } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface TransactionRowProps {
  expense: Expense;
  currency?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  expense,
  currency = 'USD',
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const categoryName = expense.categories?.name || 'Other';
  const meta = CATEGORY_META[categoryName] || CATEGORY_META.Other;

  // Render Category Icon
  const renderCategoryIcon = () => {
    const iconProps = { size: 18, color: meta.color };
    switch (categoryName) {
      case 'Food':
        return <Utensils {...iconProps} />;
      case 'Transport':
        return <Car {...iconProps} />;
      case 'Bills':
        return <Receipt {...iconProps} />;
      case 'Shopping':
        return <ShoppingBag {...iconProps} />;
      case 'Entertainment':
        return <Gamepad2 {...iconProps} />;
      case 'Health':
        return <HeartPulse {...iconProps} />;
      default:
        return <CreditCard {...iconProps} />;
    }
  };

  const formattedDate = expense.expense_date || expense.created_at
    ? new Date(expense.expense_date || expense.created_at!).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <View
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.7)',
      }}
      className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl border"
    >
      {/* Category Avatar & Info */}
      <View className="flex-row items-center flex-1 mr-2">
        <View
          style={{ backgroundColor: meta.bg }}
          className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
        >
          {renderCategoryIcon()}
        </View>

        <View className="flex-1">
          <Text style={{ color: colors.text }} className="text-sm font-bold tracking-tight">
            {categoryName}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.muted }} className="text-xs mt-0.5">
            {expense.description ? `${expense.description} · ` : ''}
            {formattedDate}
          </Text>
        </View>
      </View>

      {/* Amount & Actions */}
      <View className="flex-row items-center space-x-2">
        <Text className="text-sm font-extrabold text-rose-500 mr-2">
          -{formatCurrency(expense.amount, currency)}
        </Text>

        {onEdit ? (
          <Pressable
            onPress={() => onEdit(expense)}
            className="p-1.5 rounded-lg active:bg-slate-700/30"
            hitSlop={6}
          >
            <Edit3 size={14} color={colors.muted} />
          </Pressable>
        ) : null}

        {onDelete ? (
          <Pressable
            onPress={() => onDelete(expense.id)}
            className="p-1.5 rounded-lg active:bg-red-500/20"
            hitSlop={6}
          >
            <Trash2 size={14} color="#EF4444" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
