import React, { useState, useMemo } from 'react';
import { View, TextInput, Text, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles, Plus, X, WifiOff, CheckCircle2, Camera } from 'lucide-react-native';
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
  currency?: string;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ onAdd, onOpenScanner, currency = 'USD' }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusTag, setStatusTag] = useState<{ text: string; isDegraded: boolean } | null>(null);
  const { colors, isDark } = useTheme();

  const preview = useMemo(() => {
    return parseExpense(text);
  }, [text]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setStatusTag(null);

    try {
      const result = await parseTransactionsWithAI(text);
      if (result.isDegraded) {
        setStatusTag({ text: 'Offline Mode (Local parse)', isDegraded: true });
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

  const categoryMeta = preview?.category ? CATEGORY_META[preview.category] || CATEGORY_META.Other : null;

  return (
    <View className="mb-5">
      {/* Input container */}
      <View
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.9)',
        }}
        className="flex-row items-center rounded-2xl border px-3.5 py-1.5 shadow-sm"
      >
        <Sparkles size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type or paste GCash/SMS (e.g. 'Paid ₱549 to Netflix')..."
          placeholderTextColor={colors.muted}
          style={{ color: colors.text }}
          className="flex-1 ml-2.5 py-2 text-sm font-medium"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {text ? (
          <Pressable onPress={() => setText('')} className="p-1 mr-1 active:opacity-70">
            <X size={16} color={colors.muted} />
          </Pressable>
        ) : null}

        {onOpenScanner && (
          <Pressable
            onPress={onOpenScanner}
            className="p-2 mr-1.5 rounded-xl bg-indigo-500/10 active:opacity-70 border border-indigo-500/20"
          >
            <Camera size={16} color={isDark ? '#818CF8' : '#6366F1'} />
          </Pressable>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!preview?.amount || submitting}
          style={{
            backgroundColor: preview?.amount ? '#6366F1' : isDark ? '#334155' : '#E2E8F0',
          }}
          className="p-2 rounded-xl active:opacity-80"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Plus size={16} color={preview?.amount ? '#FFFFFF' : isDark ? '#64748B' : '#94A3B8'} />
          )}
        </Pressable>
      </View>

      {/* Live AI Detection Preview Badge */}
      {preview && preview.amount !== null ? (
        <View className="flex-row items-center mt-2 px-1 space-x-2">
          <View
            style={{ backgroundColor: categoryMeta?.bg || 'rgba(99, 102, 241, 0.15)' }}
            className="flex-row items-center px-2.5 py-1 rounded-full border border-indigo-500/20"
          >
            <Text style={{ color: categoryMeta?.color || '#6366F1' }} className="text-xs font-bold">
              {preview.category}
            </Text>
            <Text className="text-xs text-slate-400 mx-1.5">·</Text>
            <Text className="text-xs font-bold text-rose-400">
              {formatCurrency(preview.amount, currency)}
            </Text>
          </View>
          {preview.is_recurring && (
            <View className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
              <Text className="text-[10px] font-black text-purple-400 uppercase">
                🔁 Subscription
              </Text>
            </View>
          )}
          {preview.description ? (
            <Text numberOfLines={1} className="text-xs text-slate-400 flex-1 font-medium italic">
              "{preview.description}"
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* AI / Offline Status Feedback Tag */}
      {statusTag ? (
        <View className="flex-row items-center mt-1.5 px-2">
          {statusTag.isDegraded ? (
            <WifiOff size={12} color="#F59E0B" />
          ) : (
            <CheckCircle2 size={12} color="#10B981" />
          )}
          <Text
            style={{ color: statusTag.isDegraded ? '#F59E0B' : '#10B981' }}
            className="text-[11px] font-semibold ml-1.5"
          >
            {statusTag.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
