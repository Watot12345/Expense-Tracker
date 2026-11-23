import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import {
  Smartphone,
  Coffee,
  Utensils,
  Car,
  ShoppingBag,
  Plus,
  Check,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Camera,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/lib/pennyAI';
import { SafeToSpendResult } from '@/lib/safeToSpend';
import { AnimatedProgressBar } from '@/components/AnimatedPrimitives';

interface PhoneHomeWidgetProps {
  safeToSpend: SafeToSpendResult;
  balance: number;
  todaySpent: number;
  currency?: string;
  onQuickExpense: (item: { amount: number; category: string; description: string }) => Promise<boolean>;
  onOpenCustomExpense: () => void;
  onOpenScanner?: () => void;
}

const QUICK_TAPS = [
  { id: 'coffee', label: 'Coffee', amount: 5, category: 'Food', description: 'Morning Coffee', Icon: Coffee, color: '#F97316' },
  { id: 'meal', label: 'Meal', amount: 15, category: 'Food', description: 'Quick Meal', Icon: Utensils, color: '#10B981' },
  { id: 'transit', label: 'Transit', amount: 8, category: 'Transport', description: 'Ride / Transit', Icon: Car, color: '#06B6D4' },
  { id: 'market', label: 'Shop', amount: 25, category: 'Shopping', description: 'Quick Errand', Icon: ShoppingBag, color: '#EC4899' },
];

export const PhoneHomeWidget: React.FC<PhoneHomeWidgetProps> = ({
  safeToSpend,
  balance,
  todaySpent,
  currency = 'USD',
  onQuickExpense,
  onOpenCustomExpense,
  onOpenScanner,
}) => {
  const { colors, isDark } = useTheme();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const statusColor =
    safeToSpend.status === 'overspent'
      ? '#F43F5E'
      : safeToSpend.status === 'tight'
      ? '#F59E0B'
      : '#10B981';

  const remainingPct =
    safeToSpend.baseDailyAllowance > 0
      ? Math.max(0, Math.min(100, Math.round((safeToSpend.dailySafeToSpend / safeToSpend.baseDailyAllowance) * 100)))
      : 0;

  const handleTapPreset = async (preset: typeof QUICK_TAPS[number]) => {
    setJustAddedId(preset.id);
    await onQuickExpense({
      amount: preset.amount,
      category: preset.category,
      description: preset.description,
    });
    setTimeout(() => {
      setJustAddedId((curr) => (curr === preset.id ? null : curr));
    }, 1100);
  };

  return (
    <>
      {/* In-App Phone Quick-Tap Widget Card */}
      <View
        style={[
          styles.widgetCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Top Row: Widget Title & Home Screen Preview Trigger */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.14)' }]}>
              <Zap size={14} color="#6366F1" />
            </View>
            <View>
              <Text style={[styles.widgetTitle, { color: colors.text }]}>
                1-Tap Phone Widget
              </Text>
              <Text style={[styles.widgetSub, { color: colors.muted }]}>
                Instant expense logging for mobile
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setPreviewModalVisible(true)}
            style={[
              styles.previewBtn,
              {
                backgroundColor: isDark ? '#162033' : '#EEF2F8',
                borderColor: colors.border,
              },
            ]}
          >
            <Smartphone size={13} color="#6366F1" />
            <Text style={styles.previewBtnText}>Home Widget</Text>
          </Pressable>
        </View>

        {/* Quick-Tap 4-Grid Presets */}
        <View style={styles.presetsRow}>
          {QUICK_TAPS.map((preset) => {
            const Icon = preset.Icon;
            const isAdded = justAddedId === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => handleTapPreset(preset)}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: isAdded
                      ? 'rgba(16, 185, 129, 0.16)'
                      : isDark
                      ? '#162033'
                      : '#F4F6FA',
                    borderColor: isAdded ? '#10B981' : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.presetIconWrap,
                    { backgroundColor: isAdded ? '#10B981' : `${preset.color}18` },
                  ]}
                >
                  {isAdded ? (
                    <Check size={14} color="#FFFFFF" />
                  ) : (
                    <Icon size={14} color={preset.color} />
                  )}
                </View>
                <Text style={[styles.presetLabel, { color: colors.text }]} numberOfLines={1}>
                  {isAdded ? 'Added' : preset.label}
                </Text>
                <Text style={[styles.presetAmount, { color: isAdded ? '#10B981' : colors.muted }]}>
                  +{formatCurrency(preset.amount, currency)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Phone Home Screen Widget Showcase & Simulator Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#101726' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.titleGroup}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.14)' }]}>
                  <Smartphone size={17} color="#6366F1" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Phone Home Screen Widgets
                  </Text>
                  <Text style={[styles.widgetSub, { color: colors.muted }]}>
                    Interactive iOS & Android widget layouts
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setPreviewModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? '#162033' : '#F1F5F9' }]}
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 1. Small 2x2 Widget & Quick Action 2x2 Widget Row */}
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                SMALL (2x2) & MEDIUM (4x2) PHONE WIDGETS
              </Text>

              <View style={styles.smallWidgetsRow}>
                {/* 2x2 Safe-to-Spend Compact Phone Widget */}
                <View style={styles.smallWidgetBox}>
                  <View style={styles.smallWidgetTop}>
                    <Text style={styles.smallWidgetBrand}>PENNYFLOW</Text>
                    {safeToSpend.status === 'overspent' ? (
                      <AlertTriangle size={13} color="#F43F5E" />
                    ) : (
                      <ShieldCheck size={13} color="#10B981" />
                    )}
                  </View>

                  <Text style={styles.smallWidgetCaption}>Safe Today</Text>
                  <Text style={[styles.smallWidgetValue, { color: statusColor }]}>
                    {safeToSpend.dailySafeToSpend < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(safeToSpend.dailySafeToSpend), currency)}
                  </Text>

                  <View style={{ marginTop: 8 }}>
                    <AnimatedProgressBar
                      progress={remainingPct}
                      color={statusColor}
                      trackColor="rgba(255,255,255,0.12)"
                      height={6}
                    />
                  </View>
                  <Text style={styles.smallWidgetFooter}>
                    {remainingPct}% of daily limit left
                  </Text>
                </View>

                {/* 2x2 Net Balance & Quick Action Phone Widget */}
                <View style={styles.smallWidgetBox}>
                  <View style={styles.smallWidgetTop}>
                    <Text style={styles.smallWidgetBrand}>NET BALANCE</Text>
                    <Zap size={13} color="#818CF8" />
                  </View>

                  <Text style={styles.smallWidgetCaption}>Available</Text>
                  <Text style={[styles.smallWidgetValue, { color: '#FFFFFF' }]}>
                    {formatCurrency(balance, currency)}
                  </Text>

                  <View style={styles.smallWidgetBtnRow}>
                    <Pressable
                      onPress={() => {
                        setPreviewModalVisible(false);
                        onOpenCustomExpense();
                      }}
                      style={styles.smallActionBtnPrimary}
                    >
                      <Plus size={12} color="#FFFFFF" />
                      <Text style={styles.smallActionBtnText}>Add</Text>
                    </Pressable>
                    {onOpenScanner ? (
                      <Pressable
                        onPress={() => {
                          setPreviewModalVisible(false);
                          onOpenScanner();
                        }}
                        style={styles.smallActionBtnSecondary}
                      >
                        <Camera size={12} color="#A5B4FC" />
                        <Text style={[styles.smallActionBtnText, { color: '#A5B4FC' }]}>Scan</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* 2. Medium 4x2 Interactive Quick-Tap Widget */}
              <View style={styles.mediumWidgetBox}>
                <View style={styles.mediumWidgetHeader}>
                  <View>
                    <Text style={styles.smallWidgetBrand}>PENNYFLOW · QUICK LOG WIDGET</Text>
                    <Text style={styles.mediumWidgetTitle}>
                      Today Spent: {formatCurrency(todaySpent, currency)}
                    </Text>
                  </View>
                  <View style={styles.liveTag}>
                    <Text style={styles.liveTagText}>LIVE</Text>
                  </View>
                </View>

                <View style={styles.mediumPresetsGrid}>
                  {QUICK_TAPS.map((preset) => {
                    const Icon = preset.Icon;
                    const isAdded = justAddedId === preset.id;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => handleTapPreset(preset)}
                        style={[
                          styles.mediumPresetBtn,
                          isAdded && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                        ]}
                      >
                        {isAdded ? (
                          <Check size={14} color="#10B981" />
                        ) : (
                          <Icon size={14} color={preset.color} />
                        )}
                        <Text style={styles.mediumPresetText}>
                          {isAdded ? 'Logged' : `${preset.label} +${formatCurrency(preset.amount, currency)}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={() => setPreviewModalVisible(false)}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  widgetCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  widgetTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  widgetSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    marginLeft: 5,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetAmount: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    padding: 22,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  smallWidgetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  smallWidgetBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  smallWidgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallWidgetBrand: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  smallWidgetCaption: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  smallWidgetValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  smallWidgetFooter: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  smallWidgetBtnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  smallActionBtnPrimary: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderRadius: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  mediumWidgetBox: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 18,
  },
  mediumWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediumWidgetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveTagText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '800',
  },
  mediumPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediumPresetBtn: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediumPresetText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  doneBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
