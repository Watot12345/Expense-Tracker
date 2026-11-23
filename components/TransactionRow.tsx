import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
  index?: number;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  expense,
  currency = 'USD',
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const categoryName = expense.categories?.name || 'Other';
  const meta = CATEGORY_META[categoryName] || CATEGORY_META.Other;

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

  const formattedDate =
    expense.expense_date || expense.created_at
      ? new Date(expense.expense_date || expense.created_at!).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '';

  const primaryTitle = expense.description?.trim() ? expense.description : categoryName;

  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Left: Category Icon & Details */}
      <View style={styles.leftSection}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: meta.bg,
              borderColor: `${meta.color}30`,
            },
          ]}
        >
          {renderCategoryIcon()}
        </View>

        <View style={styles.textWrap}>
          <Text numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
            {primaryTitle}
          </Text>
          <View style={styles.subRow}>
            <View style={[styles.catBadge, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[styles.catBadgeText, { color: meta.color }]}>
                {categoryName}
              </Text>
            </View>
            {formattedDate ? (
              <Text style={[styles.dateText, { color: colors.muted }]}>
                {formattedDate}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Right: Amount & Edit/Delete */}
      <View style={styles.rightSection}>
        <Text style={styles.amountText}>
          -{formatCurrency(expense.amount, currency)}
        </Text>

        {onEdit ? (
          <Pressable
            onPress={() => onEdit(expense)}
            style={styles.actionBtn}
            hitSlop={6}
            accessibilityLabel="Edit expense"
          >
            <Edit3 size={14} color={colors.muted} />
          </Pressable>
        ) : null}

        {onDelete ? (
          <Pressable
            onPress={() => onDelete(expense.id)}
            style={styles.deleteBtn}
            hitSlop={6}
            accessibilityLabel="Delete expense"
          >
            <Trash2 size={14} color="#F43F5E" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F43F5E',
    marginRight: 8,
    fontVariant: ['tabular-nums'],
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginRight: 4,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
  },
});
