import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Text, View } from "react-native";
import NextClassCard from "./NextClassCard";

const { width: screenWidth } = Dimensions.get("window");

export interface ClassItem {
  subject: string;
  dosen: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  remainingTime: string;
  currentSession: number;
  totalSessions: number;
}

interface NextClassCarouselProps {
  isDarkMode: boolean;
  language: "EN" | "ID";
  classes?: ClassItem[];
}

export default function NextClassCarousel({
  isDarkMode,
  language,
  classes = [],
}: NextClassCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);

  // Manual scroll handler
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (screenWidth - 48));
    const clampedIndex = Math.max(0, Math.min(index, classes.length - 1));
    setCurrentIndex(clampedIndex);
    currentIndexRef.current = clampedIndex;
  };

  // Auto-rotate carousel every 10 seconds
  useEffect(() => {
    if (classes.length === 0 || classes.length === 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % classes.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);

      // Scroll to the next item
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [classes.length]);

  // Reset index when classes change
  useEffect(() => {
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, [classes]);

  return (
    <View className="px-6 mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className={`text-lg font-bold ${
            isDarkMode ? "text-white" : "text-gray-800"
          }`}
        >
          {language === "EN" ? "Next Class" : "Kelas Berikutnya"}
        </Text>
      </View>

      <View className="relative">
        {classes.length === 0 ? (
          <View
            className={`p-8 rounded-2xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
          >
            <View className="flex-row items-center">
              <View
                className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "EN"
                    ? "No upcoming classes"
                    : "Tidak ada kelas mendatang"}
                </Text>
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {language === "EN"
                    ? "No approved courses yet. Complete your perwalian first."
                    : "Belum ada mata kuliah yang disetujui. Selesaikan perwalian terlebih dahulu."}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={classes}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onMomentumScrollEnd={handleScroll}
            keyExtractor={(item) => `${item.subject}-${item.day}-${item.startTime}`}
            renderItem={({ item, index }) => (
              <View
                style={{ width: screenWidth - 48, marginRight: 12 }}
              >
                <NextClassCard
                  courseName={item.subject}
                  lecturerName={item.dosen || ""}
                  day={item.day}
                  startTime={item.startTime}
                  endTime={item.endTime}
                  room={item.room}
                  remainingTime={item.remainingTime}
                  currentSession={item.currentSession}
                  totalSessions={item.totalSessions}
                  isDarkMode={isDarkMode}
                  language={language}
                />
              </View>
            )}
          />
        )}

        {/* Carousel Indicators - Only show when has classes */}
        {classes.length > 0 && (
          <View className="flex-row justify-center items-center mt-3 space-x-2">
            {classes.map((_: ClassItem, index: number) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === currentIndex ? "w-6" : "w-2"
                } ${
                  index === currentIndex
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
  );
}
