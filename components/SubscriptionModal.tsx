import React, { useState } from 'react';
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
import { X, Repeat, Check } from 'lucide-react-native';
import { Subscription } from '@/types/expense';
import { useTheme } from '@/hooks/useTheme';

const PRESETS = [
  { name: 'Netflix', amount: '15.99', category: 'Entertainment', color: '#E50914' },
  { name: 'Spotify', amount: '10.99', category: 'Entertainment', color: '#1DB954' },
  { name: 'Apple iCloud', amount: '2.99', category: 'Bills', color: '#007AFF' },
  { name: 'YouTube Premium', amount: '13.99', category: 'Entertainment', color: '#FF0000' },
  { name: 'ChatGPT Plus', amount: '20.00', category: 'Bills', color: '#10A37F' },
  { name: 'Gym / Fitness', amount: '35.00', category: 'Health', color: '#F97316' },
  { name: 'Amazon Prime', amount: '14.99', category: 'Shopping', color: '#FF9900' },
  { name: 'Internet / WiFi', amount: '50.00', category: 'Bills', color: '#6366F1' },
];

interface SubscriptionModalProps {
  visible: boolean;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (sub: Omit<Subscription, 'id' | 'created_at'>) => Promise<void>;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  currencySymbol = '$',
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [category, setCategory] = useState('Entertainment');
  const [color, setColor] = useState('#6366F1');

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setAmount(preset.amount);
    setCategory(preset.category);
    setColor(preset.color);
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!name.trim() || isNaN(num) || num <= 0) return;

    // Default next billing date: 1 month from now
    const nextDate = new Date();
    if (cycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else if (cycle === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else nextDate.setMonth(nextDate.getMonth() + 1);

    await onSave({
      name: name.trim(),
      amount: num,
      billing_cycle: cycle,
      category,
      color,
      status: 'active',
      next_billing_date: nextDate.toISOString(),
    });

    setName('');
    setAmount('');
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
                <Repeat size={16} color="#6366F1" />
              </View>
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                Add Subscription
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-2 rounded-full bg-slate-800/20">
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Popular Services
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-1">
                {PRESETS.map((p) => {
                  const isSelected = name === p.name;
                  return (
                    <Pressable
                      key={p.name}
                      onPress={() => handleSelectPreset(p)}
                      style={{
                        backgroundColor: isSelected ? p.color : isDark ? '#1E293B' : '#F1F5F9',
                      }}
                      className="px-3 py-1.5 rounded-xl mr-2 flex-row items-center active:scale-95"
                    >
                      <Text
                        style={{ color: isSelected ? '#FFFFFF' : colors.text }}
                        className="text-xs font-bold"
                      >
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Name Input */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Service Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Netflix, Gym, Adobe..."
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="py-3 px-4 rounded-2xl border text-sm font-medium"
              />
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Cost ({currencySymbol})
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

            {/* Billing Cycle Picker */}
            <View className="mb-6">
              <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2 uppercase tracking-wider">
                Billing Cycle
              </Text>
              <View className="flex-row space-x-2">
                {(['monthly', 'yearly', 'weekly'] as const).map((c) => {
                  const isSelected = cycle === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCycle(c)}
                      style={{
                        backgroundColor: isSelected ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9',
                      }}
                      className="flex-1 py-2.5 rounded-xl items-center justify-center mr-1 active:scale-95"
                    >
                      <Text
                        style={{ color: isSelected ? '#FFFFFF' : colors.text }}
                        className="text-xs font-bold capitalize"
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg mb-4"
            >
              <Text className="text-white font-bold text-base">Save Subscription</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
