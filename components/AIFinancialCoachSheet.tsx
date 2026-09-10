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
} from 'react-native';
import {
  Sparkles,
  X,
  Send,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { askFinancialAdvisor, FinancialAdvisorResult } from '@/lib/pennyAI';

interface AIFinancialCoachSheetProps {
  visible: boolean;
  onClose: () => void;
  userToken?: string;
  currencySymbol?: string;
  context?: {
    balance: number;
    income: number;
    subBurn: number;
    todaySpent: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: FinancialAdvisorResult;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Can I afford a $450 flight this Friday?',
  'Can I spend $50,000 today?',
  'What is my maximum safe spending cap?',
  'How can I lower my monthly subscription burn?',
];

export const AIFinancialCoachSheet: React.FC<AIFinancialCoachSheetProps> = ({
  visible,
  onClose,
  userToken,
  currencySymbol = '$',
  context,
}) => {
  const { colors, isDark } = useTheme();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I am your PennyFlow AI Financial Coach. Ask me about any planned purchases or budgeting questions. All affordability checks are strictly mathematically audited before advice is given.',
      timestamp: 'Just now',
    },
  ]);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    setInputQuery('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await askFinancialAdvisor(q, userToken, context);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        result,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I had trouble connecting to the financial advisor. Please check your network and try again.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/70"
      >
        <View
          style={{
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
          }}
          className="p-5 rounded-t-[36px] border-t max-h-[92%] flex-1"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-slate-700/20 mb-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-9 h-9 rounded-2xl bg-indigo-500/20 items-center justify-center mr-2.5">
                <Sparkles size={18} color="#6366F1" />
              </View>
              <View>
                <Text style={{ color: colors.text }} className="text-lg font-black">
                  PennyFlow AI Coach
                </Text>
                <View className="flex-row items-center">
                  <ShieldCheck size={11} color="#10B981" />
                  <Text className="text-[10px] text-emerald-500 font-bold ml-1">
                    Guardrailed Math Engine
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="p-2 rounded-full bg-slate-500/10 active:opacity-60"
            >
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          {/* Chat Messages */}
          <ScrollView
            className="flex-1 mb-3"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const verdict = msg.result?.affordabilityVerdict;

              return (
                <View
                  key={msg.id}
                  className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <View
                    style={{
                      backgroundColor: isUser
                        ? '#6366F1'
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                      maxWidth: '88%',
                    }}
                    className={`p-4 rounded-3xl ${
                      isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                  >
                    {/* If affordability verdict is present, render prominent mathematically verified card */}
                    {verdict?.evaluated && (
                      <View
                        style={{
                          backgroundColor: verdict.canAfford
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          borderColor: verdict.canAfford
                            ? 'rgba(16, 185, 129, 0.4)'
                            : 'rgba(239, 68, 68, 0.4)',
                        }}
                        className="p-3.5 rounded-2xl border mb-3"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            {verdict.canAfford ? (
                              <CheckCircle size={15} color="#10B981" />
                            ) : (
                              <AlertTriangle size={15} color="#EF4444" />
                            )}
                            <Text
                              style={{
                                color: verdict.canAfford ? '#10B981' : '#EF4444',
                              }}
                              className="text-xs font-black ml-1.5 uppercase tracking-wider"
                            >
                              {verdict.canAfford
                                ? '✓ Verified Affordable'
                                : '✕ Exceeds Safe Limit'}
                            </Text>
                          </View>
                          <Text style={{ color: colors.muted }} className="text-[10px] font-bold">
                            Server Math Audit
                          </Text>
                        </View>

                        {/* Numbers Grid */}
                        <View className="flex-row justify-between pt-1 border-t border-slate-700/20">
                          <View>
                            <Text style={{ color: colors.muted }} className="text-[9px] uppercase font-semibold">
                              Requested
                            </Text>
                            <Text
                              style={{ color: verdict.canAfford ? '#10B981' : '#EF4444' }}
                              className="text-xs font-black"
                            >
                              {currencySymbol}{verdict.requestedAmount.toFixed(2)}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ color: colors.muted }} className="text-[9px] uppercase font-semibold">
                              Max Safe Limit
                            </Text>
                            <Text style={{ color: colors.text }} className="text-xs font-black">
                              {currencySymbol}{verdict.maximumSafePurchase.toFixed(2)}
                            </Text>
                          </View>

                          <View>
                            <Text style={{ color: colors.muted }} className="text-[9px] uppercase font-semibold">
                              Reserve Kept
                            </Text>
                            <Text style={{ color: colors.text }} className="text-xs font-black">
                              {currencySymbol}{verdict.emergencyBuffer.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Prose explanation from Gemini or Guardrail */}
                    <Text
                      style={{
                        color: isUser ? '#FFFFFF' : colors.text,
                        lineHeight: 20,
                      }}
                      className="text-xs font-medium"
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View className="flex-row items-center p-3 rounded-2xl bg-indigo-500/10 mb-3 self-start">
                <ActivityIndicator size="small" color="#6366F1" />
                <Text className="text-indigo-400 text-xs font-bold ml-2">
                  Auditing financial parameters...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompt Suggestions */}
          <View className="mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {QUICK_PROMPTS.map((prompt, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleAsk(prompt)}
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  }}
                  className="px-3 py-1.5 rounded-xl border mr-2 active:scale-95"
                >
                  <Text style={{ color: colors.muted }} className="text-[11px] font-semibold">
                    {prompt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            }}
            className="flex-row items-center rounded-2xl border px-3.5 py-1.5"
          >
            <TextInput
              value={inputQuery}
              onChangeText={setInputQuery}
              placeholder="Ask coach (e.g. Can I afford $120 shoes?)..."
              placeholderTextColor={colors.muted}
              style={{ color: colors.text }}
              className="flex-1 py-2 text-xs font-medium mr-2"
              returnKeyType="send"
              onSubmitEditing={() => handleAsk()}
            />

            <Pressable
              onPress={() => handleAsk()}
              disabled={!inputQuery.trim() || loading}
              style={{
                backgroundColor: inputQuery.trim() && !loading ? '#6366F1' : isDark ? '#334155' : '#E2E8F0',
              }}
              className="p-2 rounded-xl active:opacity-80"
            >
              <Send
                size={15}
                color={inputQuery.trim() && !loading ? '#FFFFFF' : colors.muted}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
