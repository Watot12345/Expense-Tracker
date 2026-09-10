import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Infinity as InfinityIcon,
  Bot,
  Landmark,
  FileSpreadsheet,
  Flame,
} from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useTheme } from '@/hooks/useTheme';
import { PRICING_PLANS } from '@/lib/pennyBilling';

interface ProPaywallModalProps {
  visible: boolean;
  isPro: boolean;
  onClose: () => void;
  onUpgrade: (tier: 'monthly' | 'annual') => Promise<boolean>;
  onToggleDevPro?: () => Promise<boolean>;
}

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  visible,
  isPro,
  onClose,
  onUpgrade,
  onToggleDevPro,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<any>(null);

  const handleUpgradePress = async () => {
    setLoading(true);
    try {
      const success = await onUpgrade(selectedTier);
      if (success) {
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
          onClose();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevToggle = async () => {
    if (!onToggleDevPro) return;
    setLoading(true);
    try {
      const nextPro = await onToggleDevPro();
      if (nextPro) {
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
          onClose();
        }, 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  const plan = PRICING_PLANS[selectedTier];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/75">
        {showConfetti && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          >
            <ConfettiCannon
              count={120}
              origin={{ x: 180, y: 0 }}
              fadeOut
              autoStart
              ref={confettiRef}
            />
          </View>
        )}

        <View
          style={{
            backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
            maxHeight: '92%',
          }}
          className="rounded-t-[36px] border-t overflow-hidden"
        >
          {/* Header Banner */}
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6 pt-7 relative"
          >
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/30 items-center justify-center active:opacity-70"
            >
              <X size={18} color="#FFFFFF" />
            </Pressable>

            <View className="flex-row items-center space-x-2 mb-2">
              <View className="p-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40">
                <Crown size={20} color="#FBBF24" />
              </View>
              <View className="px-2.5 py-0.5 rounded-full bg-white/20">
                <Text className="text-[10px] font-black tracking-widest text-white uppercase">
                  PennyFlow Pro
                </Text>
              </View>
            </View>

            <Text className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Unlock Financial Clarity
            </Text>
            <Text className="text-xs text-indigo-100 font-medium mt-1 leading-relaxed">
              Supercharge your wealth with unlimited Gemini Vision receipt scanning, real-time bank sync, and AI coaching.
            </Text>
          </LinearGradient>

          <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
            {/* Plan Switcher */}
            <View className="flex-row space-x-3 mb-6">
              {/* Annual Card */}
              <Pressable
                onPress={() => setSelectedTier('annual')}
                style={{
                  borderColor: selectedTier === 'annual' ? '#6366F1' : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  backgroundColor: selectedTier === 'annual'
                    ? isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'
                    : isDark ? '#111827' : '#F8FAFC',
                }}
                className="flex-1 p-3.5 rounded-2xl border-2 relative"
              >
                <View className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-emerald-500">
                  <Text className="text-[9px] font-black text-white uppercase tracking-wider">
                    Save 40%
                  </Text>
                </View>
                <Text
                  style={{ color: colors.text }}
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                >
                  Annual
                </Text>
                <View className="flex-row items-baseline">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    $4.99
                  </Text>
                  <Text style={{ color: colors.muted }} className="text-[11px] font-semibold ml-0.5">
                    /mo
                  </Text>
                </View>
                <Text style={{ color: colors.muted }} className="text-[10px] mt-0.5">
                  $59.99 billed yearly
                </Text>
              </Pressable>

              {/* Monthly Card */}
              <Pressable
                onPress={() => setSelectedTier('monthly')}
                style={{
                  borderColor: selectedTier === 'monthly' ? '#6366F1' : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  backgroundColor: selectedTier === 'monthly'
                    ? isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF'
                    : isDark ? '#111827' : '#F8FAFC',
                }}
                className="flex-1 p-3.5 rounded-2xl border-2"
              >
                <Text
                  style={{ color: colors.text }}
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                >
                  Monthly
                </Text>
                <View className="flex-row items-baseline">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    $6.99
                  </Text>
                  <Text style={{ color: colors.muted }} className="text-[11px] font-semibold ml-0.5">
                    /mo
                  </Text>
                </View>
                <Text style={{ color: colors.muted }} className="text-[10px] mt-0.5">
                  Billed monthly
                </Text>
              </Pressable>
            </View>

            {/* Feature Perks List */}
            <View className="space-y-3 mb-6">
              {[
                {
                  icon: Sparkles,
                  color: '#8B5CF6',
                  title: 'Unlimited Gemini Vision Scans',
                  desc: 'Instant camera receipt extraction with zero monthly caps',
                },
                {
                  icon: Bot,
                  color: '#6366F1',
                  title: 'Unlimited AI Financial Coach',
                  desc: 'Ask "Can I afford this?" anytime with server-audited limits',
                },
                {
                  icon: Landmark,
                  color: '#06B6D4',
                  title: 'Unlimited Bank & Spending App Sync',
                  desc: 'Connect Chase, Amex, Apple Card, Revolut with zero duplicates',
                },
                {
                  icon: Flame,
                  color: '#F97316',
                  title: 'Zombie Subscription Radar',
                  desc: '60-day unused subscription detector & 1-tap cancel emails',
                },
                {
                  icon: FileSpreadsheet,
                  color: '#10B981',
                  title: 'Accountant-Ready Tax & CSV Packs',
                  desc: 'One-click IRS Schedule C deduction categorization',
                },
              ].map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <View key={idx} className="flex-row items-start space-x-3">
                    <View
                      style={{ backgroundColor: `${feature.color}20` }}
                      className="w-8 h-8 rounded-xl items-center justify-center mt-0.5"
                    >
                      <IconComponent size={16} color={feature.color} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="text-xs font-bold">
                        {feature.title}
                      </Text>
                      <Text style={{ color: colors.muted }} className="text-[11px] leading-tight mt-0.5">
                        {feature.desc}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Upgrade CTA */}
            <Pressable
              onPress={handleUpgradePress}
              disabled={loading}
              className="py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center shadow-lg shadow-indigo-500/30 mb-3"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View className="flex-row items-center space-x-2">
                  <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text className="text-white font-black text-sm tracking-wide">
                    {isPro ? 'Switch / Renew Plan' : `Start 7-Day Free Trial ($${plan.price}/${plan.interval})`}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Trust & Guarantee */}
            <View className="flex-row items-center justify-center space-x-2 mb-4">
              <ShieldCheck size={14} color="#10B981" />
              <Text style={{ color: colors.muted }} className="text-[11px] font-medium">
                Cancel anytime in 1 tap • 256-bit bank encryption
              </Text>
            </View>

            {/* Developer Test Mode Button */}
            {onToggleDevPro && (
              <View className="mt-2 pt-4 border-t border-dashed border-slate-700/60">
                <Pressable
                  onPress={handleDevToggle}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center justify-center space-x-2"
                >
                  <Crown size={14} color="#F59E0B" />
                  <Text className="text-amber-500 text-xs font-bold">
                    🧪 Dev Test: Toggle Pro Status ({isPro ? 'Active' : 'Free'})
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
