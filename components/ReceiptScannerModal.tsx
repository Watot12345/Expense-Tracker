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
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  Check,
  AlertCircle,
  Repeat,
  DollarSign,
  Tag,
  Calendar,
  List,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { scanReceiptWithAI, ScannedReceiptResult } from '@/lib/pennyAI';
import { CATEGORIES } from '@/types/expense';

interface ReceiptScannerModalProps {
  visible: boolean;
  userToken?: string;
  currencySymbol?: string;
  onClose: () => void;
  onSaveExpense: (expense: {
    amount: number;
    category: string;
    description: string;
    date: string;
    receipt_url?: string;
  }) => Promise<void>;
  onAddAsSubscription?: (sub: {
    name: string;
    amount: number;
    billing_cycle: 'monthly' | 'yearly' | 'weekly';
    category: string;
    color: string;
  }) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  userToken,
  currencySymbol = '$',
  onClose,
  onSaveExpense,
  onAddAsSubscription,
}) => {
  const { colors, isDark } = useTheme();

  // Modal lifecycle states: 'pick' | 'scanning' | 'review'
  const [step, setStep] = useState<'pick' | 'scanning' | 'review'>('pick');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);

  // Extracted & editable fields
  const [merchant, setMerchant] = useState('');
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<{ name: string; price: number; quantity?: number }[]>([]);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionCycle, setSubscriptionCycle] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [receiptPath, setReceiptPath] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = () => {
    setStep('pick');
    setSelectedImageUri(null);
    setMerchant('');
    setTotal('');
    setCategory('Food');
    setDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setIsSubscription(false);
    setSubscriptionCycle('monthly');
    setReceiptPath(undefined);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImage = async (base64: string, uri: string) => {
    setSelectedImageUri(uri);
    setStep('scanning');

    try {
      const result: ScannedReceiptResult = await scanReceiptWithAI(base64, userToken);

      setMerchant(result.vendor || 'Unknown Merchant');
      setTotal(result.total.toFixed(2));
      setCategory(result.category || 'Other');
      setDate(result.date || new Date().toISOString().split('T')[0]);
      setItems(result.items || []);
      setIsSubscription(result.is_likely_subscription);
      setSubscriptionCycle(result.subscription_cycle || 'monthly');
      setReceiptPath(result.receipt_path);
      setIsDegraded(Boolean(result.isDegraded));

      setStep('review');
    } catch (err: any) {
      console.error('Receipt processing error:', err);
      Alert.alert('Scan Failed', 'Unable to process receipt image. Please enter details manually.');
      setStep('pick');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to select receipt photos.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets?.[0]?.base64) {
        const asset = pickerResult.assets[0];
        await processImage(asset.base64!, asset.uri);
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow camera access to scan receipt photos.');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });

      if (!cameraResult.canceled && cameraResult.assets?.[0]?.base64) {
        const asset = cameraResult.assets[0];
        await processImage(asset.base64!, asset.uri);
      }
    } catch (err) {
      console.warn('Camera capture error:', err);
    }
  };

  const handleSaveExpense = async () => {
    const num = parseFloat(total);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please verify the receipt total before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveExpense({
        amount: num,
        category,
        description: merchant.trim() || 'Receipt Expense',
        date,
        receipt_url: receiptPath || selectedImageUri || undefined,
      });
      handleClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToSubscription = () => {
    const num = parseFloat(total) || 0;
    if (onAddAsSubscription) {
      onAddAsSubscription({
        name: merchant.trim() || 'Recurring Subscription',
        amount: num,
        billing_cycle: subscriptionCycle,
        category,
        color: '#6366F1',
      });
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70"
      >
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
          }}
          className="p-6 rounded-t-[36px] border-t max-h-[92%]"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-2xl bg-amber-500/20 items-center justify-center mr-2.5">
                <Sparkles size={18} color="#F59E0B" />
              </View>
              <View>
                <Text style={{ color: colors.text }} className="text-xl font-black">
                  AI Receipt Scanner
                </Text>
                <Text style={{ color: colors.muted }} className="text-xs font-medium">
                  {step === 'pick' && 'Photograph or upload paper bill'}
                  {step === 'scanning' && 'Gemini Vision parsing details...'}
                  {step === 'review' && 'Review extracted financial data'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              className="p-2 rounded-full bg-slate-500/10 active:opacity-60"
            >
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          {/* STEP 1: PICK IMAGE */}
          {step === 'pick' && (
            <View className="py-6">
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                }}
                className="p-6 rounded-3xl border border-dashed items-center justify-center mb-6"
              >
                <View className="w-16 h-16 rounded-full bg-amber-500/10 items-center justify-center mb-3">
                  <Camera size={28} color="#F59E0B" />
                </View>
                <Text style={{ color: colors.text }} className="text-base font-bold text-center mb-1">
                  Scan any paper receipt or invoice
                </Text>
                <Text style={{ color: colors.muted }} className="text-xs text-center px-4">
                  Gemini multimodal vision instantly extracts merchant, line items, taxes, and detects recurring subscriptions.
                </Text>
              </View>

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={handleTakePhoto}
                  className="flex-1 py-4 px-3 rounded-2xl bg-amber-500 active:bg-amber-600 flex-row items-center justify-center space-x-2 mr-2 shadow-lg shadow-amber-500/20"
                >
                  <Camera size={18} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm ml-1.5">Take Photo</Text>
                </Pressable>

                <Pressable
                  onPress={handlePickFromGallery}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                  }}
                  className="flex-1 py-4 px-3 rounded-2xl border flex-row items-center justify-center space-x-2 active:opacity-75"
                >
                  <ImageIcon size={18} color={colors.text} />
                  <Text style={{ color: colors.text }} className="font-bold text-sm ml-1.5">
                    From Gallery
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* STEP 2: SCANNING LOADER */}
          {step === 'scanning' && (
            <View className="py-14 items-center justify-center">
              <View className="relative mb-6">
                {selectedImageUri && (
                  <Image
                    source={{ uri: selectedImageUri }}
                    className="w-28 h-28 rounded-2xl opacity-40"
                    resizeMode="cover"
                  />
                )}
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator size="large" color="#F59E0B" />
                </View>
              </View>
              <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">
                Analyzing Receipt...
              </Text>
              <Text style={{ color: colors.muted }} className="text-xs text-center px-8">
                Extracting merchant details, sub-total, items, and checking recurring patterns.
              </Text>
            </View>
          )}

          {/* STEP 3: PRE-FILLED REVIEW MODAL */}
          {step === 'review' && (
            <ScrollView showsVerticalScrollIndicator={false} className="pb-4">
              {/* Degraded mode notice */}
              {isDegraded && (
                <View className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center">
                  <AlertCircle size={15} color="#F59E0B" />
                  <Text className="text-xs text-amber-500 font-medium ml-2 flex-1">
                    Demo Mode: Offline sample receipt generated for instant verification.
                  </Text>
                </View>
              )}

              {/* Recurring Subscription Detection Banner */}
              {isSubscription && (
                <View
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderColor: 'rgba(99, 102, 241, 0.35)',
                  }}
                  className="p-4 rounded-2xl border mb-4"
                >
                  <View className="flex-row items-center mb-1">
                    <Repeat size={16} color="#6366F1" />
                    <Text className="text-indigo-400 font-bold text-xs ml-1.5 uppercase tracking-wider">
                      Recurring Subscription Detected
                    </Text>
                  </View>
                  <Text style={{ color: colors.text }} className="text-xs font-medium mb-3">
                    This charge looks like a recurring subscription ({subscriptionCycle}). Would you like to track it in your Subscriptions Radar?
                  </Text>
                  {onAddAsSubscription && (
                    <Pressable
                      onPress={handleSwitchToSubscription}
                      className="py-2.5 px-4 rounded-xl bg-indigo-600 active:bg-indigo-700 items-center justify-center flex-row"
                    >
                      <Repeat size={14} color="#FFFFFF" />
                      <Text className="text-white text-xs font-bold ml-1.5">
                        Track as Subscription ({currencySymbol}{total}/{subscriptionCycle})
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Merchant & Amount Row */}
              <View className="flex-row space-x-3 mb-3">
                <View className="flex-1 mr-2">
                  <Text style={{ color: colors.muted }} className="text-[11px] font-semibold mb-1 uppercase tracking-wider">
                    Merchant / Vendor
                  </Text>
                  <TextInput
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholder="Merchant Name"
                    placeholderTextColor={colors.muted}
                    style={{
                      color: colors.text,
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                    }}
                    className="py-2.5 px-3.5 rounded-xl border text-sm font-semibold"
                  />
                </View>

                <View className="w-32">
                  <Text style={{ color: colors.muted }} className="text-[11px] font-semibold mb-1 uppercase tracking-wider">
                    Total ({currencySymbol})
                  </Text>
                  <TextInput
                    value={total}
                    onChangeText={setTotal}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.muted}
                    style={{
                      color: '#10B981',
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                    }}
                    className="py-2.5 px-3.5 rounded-xl border text-base font-extrabold text-right"
                  />
                </View>
              </View>

              {/* Category Pills */}
              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider">
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-1">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={{
                          backgroundColor: isSelected ? '#F59E0B' : isDark ? '#1E293B' : '#F1F5F9',
                        }}
                        className="px-3 py-1.5 rounded-xl mr-2 active:scale-95"
                      >
                        <Text
                          style={{ color: isSelected ? '#FFFFFF' : colors.text }}
                          className="text-xs font-bold"
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date Input */}
              <View className="mb-4">
                <Text style={{ color: colors.muted }} className="text-[11px] font-semibold mb-1 uppercase tracking-wider">
                  Receipt Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  style={{
                    color: colors.text,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                  }}
                  className="py-2.5 px-3.5 rounded-xl border text-xs font-medium"
                />
              </View>

              {/* Itemized Line Items List */}
              {items.length > 0 && (
                <View className="mb-5">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text style={{ color: colors.muted }} className="text-[11px] font-semibold uppercase tracking-wider">
                      Itemized Line Items ({items.length})
                    </Text>
                    <Text style={{ color: colors.muted }} className="text-[10px]">
                      Extracted by Gemini Vision
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    }}
                    className="p-3 rounded-2xl border"
                  >
                    {items.map((item, idx) => (
                      <View
                        key={idx}
                        className={`flex-row justify-between items-center py-1.5 ${
                          idx < items.length - 1 ? 'border-b border-slate-700/20' : ''
                        }`}
                      >
                        <Text style={{ color: colors.text }} className="text-xs font-medium flex-1 mr-2" numberOfLines={1}>
                          {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
                          {item.name}
                        </Text>
                        <Text style={{ color: colors.text }} className="text-xs font-bold">
                          {currencySymbol}{item.price.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row space-x-3 mt-2">
                <Pressable
                  onPress={() => setStep('pick')}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                  }}
                  className="py-3.5 px-4 rounded-2xl border items-center justify-center mr-2 active:opacity-75"
                >
                  <Text style={{ color: colors.text }} className="font-bold text-xs">
                    Re-scan
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSaveExpense}
                  disabled={isSaving}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-500 active:bg-amber-600 items-center justify-center flex-row shadow-lg shadow-amber-500/20"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text className="text-white font-black text-sm ml-1.5">
                        Confirm & Save ({currencySymbol}{total})
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
