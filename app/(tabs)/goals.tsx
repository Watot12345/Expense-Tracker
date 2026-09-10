import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, Plus, X } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSupabase } from '@/hooks/useSupabase';
import { useTheme } from '@/hooks/useTheme';
import { GoalCard } from '@/components/GoalCard';

const EMOJI_OPTIONS = ['🏖️', '📱', '🚗', '🏠', '✈️', '💻', '🎓', '💍', '🎮', '🚲'];

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const { goals, profile, saveGoal, deleteGoal, addFundsToGoal } = useSupabase();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<any>(null);

  const currency = profile?.currency || 'USD';

  const handleCreateGoal = async () => {
    const targetNum = parseFloat(target);
    const currentNum = parseFloat(current) || 0;
    if (!title.trim() || isNaN(targetNum) || targetNum <= 0) {
      Alert.alert('Invalid Goal', 'Please provide a valid goal name and target amount.');
      return;
    }

    await saveGoal({
      title: title.trim(),
      target: targetNum,
      current: currentNum,
      icon: selectedEmoji,
    });

    setTitle('');
    setTarget('');
    setCurrent('');
    setSelectedEmoji('🎯');
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this savings goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  const handleCelebration = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {/* Confetti Cannon Container */}
      {showConfetti ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} pointerEvents="none">
          <ConfettiCannon count={120} origin={{ x: 180, y: 0 }} fadeOut autoStart ref={confettiRef} />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mt-2 mb-5">
          <View>
            <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight">
              Savings Goals 🎯
            </Text>
            <Text style={{ color: colors.muted }} className="text-xs font-medium mt-0.5">
              Turn your dreams into achievable milestones
            </Text>
          </View>

          <Pressable
            onPress={() => setModalVisible(true)}
            className="w-10 h-10 rounded-2xl bg-indigo-600 items-center justify-center shadow-md active:scale-95"
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Goals List */}
        {goals.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-indigo-500/20 items-center justify-center mb-3">
              <Target size={32} color="#6366F1" />
            </View>
            <Text style={{ color: colors.text }} className="text-base font-bold">
              No Goals Yet
            </Text>
            <Text style={{ color: colors.muted }} className="text-xs text-center max-w-[240px] mt-1 mb-5">
              Set a savings target for a vacation, gadget, or rainy day fund!
            </Text>
            <Pressable
              onPress={() => setModalVisible(true)}
              className="py-3 px-5 rounded-2xl bg-indigo-600 active:bg-indigo-700"
            >
              <Text className="text-white text-xs font-bold">Create First Goal</Text>
            </Pressable>
          </View>
        ) : (
          goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              onAddFunds={addFundsToGoal}
              onDelete={handleDelete}
              onCompleted={handleCelebration}
            />
          ))
        )}
      </ScrollView>

      {/* New Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View
            style={{
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            }}
            className="p-6 rounded-t-[36px] border-t max-h-[85%]"
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                New Savings Goal
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                  Goal Name
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Vacation, New Phone, Car..."
                  placeholderTextColor={colors.muted}
                  style={{
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  }}
                  className="py-3 px-4 rounded-2xl border text-sm font-medium"
                />
              </View>

              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                  Target Amount ({currency})
                </Text>
                <TextInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder="1000.00"
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

              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                  Already Saved (optional)
                </Text>
                <TextInput
                  value={current}
                  onChangeText={setCurrent}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                  style={{
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  }}
                  className="py-3 px-4 rounded-2xl border text-sm font-medium"
                />
              </View>

              {/* Emoji Icons */}
              <View className="mb-6">
                <Text style={{ color: colors.muted }} className="text-xs font-semibold mb-2">
                  Select Icon
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setSelectedEmoji(emoji)}
                      style={{
                        backgroundColor: selectedEmoji === emoji ? '#6366F1' : isDark ? '#1E293B' : '#F1F5F9',
                      }}
                      className="w-11 h-11 rounded-2xl items-center justify-center active:scale-95"
                    >
                      <Text className="text-xl">{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleCreateGoal}
                className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg mb-4"
              >
                <Text className="text-white font-bold text-base">Save Goal</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
