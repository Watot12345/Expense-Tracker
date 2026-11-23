import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Sparkles, Plus, X, WifiOff, CheckCircle2, Camera, Repeat } from 'lucide-react-native';
import {
  parseExpense,
  parseTransactionsWithAI,
  CATEGORY_META,
  formatCurrency,
} from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface QuickAddBarProps {
  onAdd: (expense: { amount: number; category: string; description: string }) => Promise<boolean>;
  onOpenScanner?: () => void;
  onOpenModal?: () => void;
  currency?: string;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onAdd,
  onOpenScanner,
  onOpenModal,
  currency = 'USD',
}) => {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusTag, setStatusTag] = useState<{ text: string; isDegraded: boolean } | null>(null);
  const { colors, isDark } = useTheme();

  const preview = useMemo(() => {
    return parseExpense(text);
  }, [text]);

  const handleSubmit = async () => {
    if (!text.trim() || !preview?.amount || preview.amount <= 0) {
      onOpenModal?.();
      return;
    }

    setSubmitting(true);
    setStatusTag(null);

    try {
      const isMultiLineOrSms = text.includes('\n') || text.length > 60;
      if (!isMultiLineOrSms && preview.amount > 0) {
        const added = await onAdd({
          amount: preview.amount,
          category: preview.category,
          description: preview.description,
        });
        if (added) {
          setText('');
          setStatusTag({ text: `Added ${formatCurrency(preview.amount, currency)}`, isDegraded: false });
        }
        return;
      }

      const result = await parseTransactionsWithAI(text);
      if (result.isDegraded) {
        setStatusTag({ text: 'Added via Smart Local Parser', isDegraded: false });
      } else {
        setStatusTag({ text: 'Gemini AI Parsed', isDegraded: false });
      }

      if (result.transactions.length > 0) {
        let allAdded = true;
        for (const item of result.transactions) {
          if (item.amount > 0) {
            const added = await onAdd({
              amount: item.amount,
              category: item.category,
              description: item.description || item.merchant,
            });
            if (!added) allAdded = false;
          }
        }
        if (allAdded) {
          setText('');
        }
      } else if (preview && preview.amount && preview.amount > 0) {
        await onAdd({
          amount: preview.amount,
          category: preview.category,
          description: preview.description,
        });
        setText('');
      }
    } catch {
      if (preview && preview.amount && preview.amount > 0) {
        await onAdd({
          amount: preview.amount,
          category: preview.category,
          description: preview.description,
        });
        setText('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const categoryMeta = preview?.category
    ? CATEGORY_META[preview.category] || CATEGORY_META.Other
    : null;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderColor: focused ? '#6366F1' : colors.border,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.sparkleBox}>
          <Sparkles size={15} color={isDark ? '#A5B4FC' : '#6366F1'} />
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Quick add (e.g. 'Coffee 5.50') or tap +..."
          placeholderTextColor={colors.muted}
          style={[styles.textInput, { color: colors.text }]}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {text ? (
          <Pressable onPress={() => setText('')} style={styles.clearBtn}>
            <X size={15} color={colors.muted} />
          </Pressable>
        ) : null}

        {onOpenScanner ? (
          <Pressable
            onPress={onOpenScanner}
            style={styles.scanBtn}
            accessibilityLabel="Open receipt scanner"
          >
            <Camera size={15} color={isDark ? '#A5B4FC' : '#6366F1'} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.addBtn}
          accessibilityLabel="Add expense"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      {/* Live AI Detection Preview Badge */}
      {preview && preview.amount !== null ? (
        <View style={styles.previewRow}>
          <View
            style={[
              styles.previewBadge,
              { backgroundColor: categoryMeta?.bg || 'rgba(99, 102, 241, 0.15)' },
            ]}
          >
            <Text style={[styles.previewCatText, { color: categoryMeta?.color || '#6366F1' }]}>
              {preview.category}
            </Text>
            <Text style={styles.previewDot}>·</Text>
            <Text style={styles.previewAmountText}>
              {formatCurrency(preview.amount, currency)}
            </Text>
          </View>
          {preview.is_recurring ? (
            <View style={styles.subBadge}>
              <Repeat size={10} color="#C084FC" />
              <Text style={styles.subBadgeText}>SUBSCRIPTION</Text>
            </View>
          ) : null}
          {preview.description ? (
            <Text numberOfLines={1} style={[styles.previewDesc, { color: colors.muted }]}>
              "{preview.description}"
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* AI / Offline Status Feedback Tag */}
      {statusTag ? (
        <View style={styles.statusRow}>
          {statusTag.isDegraded ? (
            <WifiOff size={12} color="#F59E0B" />
          ) : (
            <CheckCircle2 size={12} color="#10B981" />
          )}
          <Text
            style={[
              styles.statusText,
              { color: statusTag.isDegraded ? '#F59E0B' : '#10B981' },
            ]}
          >
            {statusTag.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sparkleBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  scanBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  previewCatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 5,
  },
  previewAmountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FB7185',
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  subBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C084FC',
    marginLeft: 4,
  },
  previewDesc: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
});
