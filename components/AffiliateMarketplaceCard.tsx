import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { CreditCard, TrendingUp, ExternalLink, Sparkles, ChevronRight, Award } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { AFFILIATE_OFFERS, AffiliateOffer } from '@/lib/pennyBilling';

interface AffiliateMarketplaceCardProps {
  onSelectOffer?: (offer: AffiliateOffer) => void;
}

export const AffiliateMarketplaceCard: React.FC<AffiliateMarketplaceCardProps> = ({
  onSelectOffer,
}) => {
  const { colors, isDark } = useTheme();

  const handleOpenOffer = async (offer: AffiliateOffer) => {
    if (onSelectOffer) {
      onSelectOffer(offer);
    }
    try {
      await Linking.openURL(offer.url);
    } catch (e) {
      console.warn('Could not open affiliate offer link', e);
    }
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? '#111827' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      }}
      className="p-5 rounded-[24px] border mb-6 shadow-sm"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-2">
          <View className="w-7 h-7 rounded-xl bg-amber-500/20 items-center justify-center">
            <Award size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={{ color: colors.text }} className="text-sm font-black">
              Smart Financial Rewards
            </Text>
            <Text style={{ color: colors.muted }} className="text-[10px] font-medium">
              Curated for your spending habits
            </Text>
          </View>
        </View>

        <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Text className="text-[10px] font-black text-emerald-500 uppercase">
            Top Picks
          </Text>
        </View>
      </View>

      {/* Offers List */}
      <View className="space-y-3">
        {AFFILIATE_OFFERS.map((offer) => {
          const isCard = offer.category === 'credit_card';
          return (
            <Pressable
              key={offer.id}
              onPress={() => handleOpenOffer(offer)}
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0',
              }}
              className="p-3.5 rounded-2xl border active:opacity-80"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-start space-x-3 flex-1 mr-2">
                  <View
                    style={{ backgroundColor: `${offer.color}20` }}
                    className="w-9 h-9 rounded-xl items-center justify-center mt-0.5"
                  >
                    {isCard ? (
                      <CreditCard size={18} color={offer.color} />
                    ) : (
                      <TrendingUp size={18} color={offer.color} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center space-x-1.5 mb-0.5">
                      <Text style={{ color: colors.text }} className="text-xs font-bold">
                        {offer.title}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-bold text-indigo-400 mb-1">
                      {offer.highlight}
                    </Text>
                    <Text
                      style={{ color: colors.muted }}
                      className="text-[10px] leading-tight"
                      numberOfLines={2}
                    >
                      {offer.description}
                    </Text>
                  </View>
                </View>

                <View className="items-end justify-between self-stretch">
                  <View className="px-2 py-0.5 rounded-md bg-slate-800">
                    <Text className="text-[9px] font-black text-slate-300">
                      {offer.badge}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-1 mt-2">
                    <Text className="text-[11px] font-bold text-indigo-500">
                      View
                    </Text>
                    <ChevronRight size={14} color="#6366F1" />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Developer note disclaimer */}
      <Text style={{ color: colors.muted }} className="text-[9px] text-center mt-3 opacity-60">
        Personalized rewards & rate comparisons. May contain partner sponsor links.
      </Text>
    </View>
  );
};
