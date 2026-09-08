import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { formatDate } from "../utils/dateUtils";

const { width: screenWidth } = Dimensions.get("window");

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  publish_date?: string;
  event_date?: string;
  is_active?: boolean;
}

interface CampusNewsCarouselProps {
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  maxItems?: number;
  news?: NewsItem[];
}

export default function CampusNewsCarousel({
  isDarkMode,
  language,
  showToast,
  maxItems = 10,
  news = [],
}: CampusNewsCarouselProps) {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Filter news by maxItems
  const displayedNews = news.slice(0, maxItems);

  // Manual scroll handler
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (screenWidth - 48));
    setCurrentNewsIndex(index);
  };

  // Auto-rotate carousel every 10 seconds
  useEffect(() => {
    if (displayedNews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % displayedNews.length);

      // Scroll to the next item
      const nextIndex = (currentNewsIndex + 1) % displayedNews.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * (screenWidth - 48),
        animated: true,
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [currentNewsIndex, displayedNews.length]);

  return (
    <ScrollView className="flex-1">
      <View className="px-6 mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className={`text-lg font-bold ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {language === "EN" ? "Campus News" : "Berita Kampus"}
          </Text>
        </View>

        <View className="relative">
          {displayedNews.length === 0 ? (
            <View
              className={`rounded-xl p-8 mr-3 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <View className="flex-1 justify-center items-center">
                <Ionicons
                  name="newspaper-outline"
                  size={48}
                  color={isDarkMode ? "#4B5563" : "#9CA3AF"}
                />
                <Text
                  className={`text-center mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {language === "EN"
                    ? "No news available"
                    : "Tidak ada berita tersedia"}
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              onMomentumScrollEnd={handleScroll}
              className="flex-1"
            >
              {displayedNews.map((newsItem: NewsItem, index: number) => (
                <View
                  key={newsItem.id}
                  className="w-full"
                  style={{ width: screenWidth - 48 }}
                >
                  <View
                    className={`rounded-xl p-4 mr-3 ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text
                          className={`font-bold text-base mb-1 ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {newsItem.title}
                        </Text>
                        <Text
                          className={`text-sm mb-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                          numberOfLines={3}
                        >
                          {newsItem.content}
                        </Text>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="newspaper-outline"
                              size={16}
                              color="#3B82F6"
                              className="mr-1"
                            />
                            <Text
                              className={`text-xs ${
                                isDarkMode ? "text-gray-500" : "text-gray-500"
                              }`}
                            >
                              {newsItem.category}
                            </Text>
                          </View>
                          <Text
                            className={`text-xs ${
                              isDarkMode ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {(() => {
                              const dateStr = newsItem.event_date;
                              return formatDate(dateStr);
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Carousel Indicators - Only show when has news */}
          {displayedNews.length > 0 && (
            <View className="flex-row justify-center items-center mt-3 space-x-2">
              {displayedNews.map((_: NewsItem, index: number) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentNewsIndex ? "w-6" : "w-2"
                  } ${
                    index === currentNewsIndex
                      ? "bg-red-500"
                      : isDarkMode
                        ? "bg-gray-600"
                        : "bg-gray-300"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
