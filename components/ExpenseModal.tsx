import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Receipt } from 'lucide-react-native';
import { Category, Expense } from '@/types/expense';
import { CATEGORY_META } from '@/lib/pennyAI';
import { useTheme } from '@/hooks/useTheme';

interface ExpenseModalProps {
  visible: boolean;
  categories: Category[];
  initialData?: Expense | null;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    category_id: string | number;
    description: string;
    expense_date?: string;
  }) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  visible,
  categories,
  initialData,
  currencySymbol = '$',
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>('');

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDescription(initialData.description || '');
      setSelectedCategoryId(initialData.category_id || categories[0]?.id || '');
    } else {
      setAmount('');
      setDescription('');
      setSelectedCategoryId(categories[0]?.id || '');
    }
  }, [initialData, categories, visible]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    await onSave({
      amount: num,
      category_id: selectedCategoryId,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60"
      >
        <View
          style={{
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
          }}
          className="p-6 rounded-t-[36px] border-t max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center space-x-2">
              <View className="w-8 h-8 rounded-xl bg-indigo-500/20 items-center justify-center mr-2">
                <Receipt size={16} color="#6366F1" />
              </View>
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                {initialData ? 'Edit Expense' : 'New Expense'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-2 rounded-full bg-slate-800/20">
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Amount ({currencySymbol})
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="py-3 px-4 rounded-2xl border text-xl font-bold"
              />
            </View>

            {/* Category Selector Chips */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const meta = CATEGORY_META[cat.name] || CATEGORY_META.Other;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={{
                        backgroundColor: isSelected
                          ? '#6366F1'
                          : isDark
                          ? 'rgba(30, 41, 59, 0.6)'
                          : '#F1F5F9',
                        borderColor: isSelected
                          ? '#6366F1'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#E2E8F0',
                      }}
                      className="px-3.5 py-2 rounded-xl border flex-row items-center active:scale-95"
                    >
                      <Text
                        style={{ color: isSelected ? '#FFFFFF' : colors.text }}
                        className="text-xs font-bold"
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description Input */}
            <View className="mb-6">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Lunch with team, monthly internet..."
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="py-3 px-4 rounded-2xl border text-sm font-medium"
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg mb-4"
            >
              <Text className="text-white font-bold text-base">
                {initialData ? 'Save Changes' : 'Add Expense'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
