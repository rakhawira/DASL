import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

export interface TabItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface FloatingTabBarProps {
  state: { index: number };
  navigation: { navigate: (key: string) => void };
  tabs: TabItem[];
  isDarkMode: boolean;
  activeColor?: string;
}

const ICON_SIZE = 22;
const LABEL_MARGIN = 6;
const TAB_PADDING_H = 16;

function createAnims(count: number, initialValue = 0) {
  return Array.from({ length: count }, () => new Animated.Value(initialValue));
}

function FloatingTabBar({
  state,
  navigation,
  tabs,
  isDarkMode,
  activeColor = "#EF4444",
}: FloatingTabBarProps) {
  const tabCount = tabs.length;

  const tabWidthAnims = useRef<Animated.Value[]>(createAnims(tabCount));
  const scaleAnims = useRef<Animated.Value[]>(createAnims(tabCount, 1));
  const translateYAnims = useRef<Animated.Value[]>(createAnims(tabCount));
  const labelOpacityAnims = useRef<Animated.Value[]>(
    Array.from(
      { length: tabCount },
      (_, i) => new Animated.Value(i === state.index ? 1 : 0),
    ),
  );
  const labelTranslateXAnims = useRef<Animated.Value[]>(
    Array.from(
      { length: tabCount },
      (_, i) => new Animated.Value(i === state.index ? 0 : -8),
    ),
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const [labelWidths, setLabelWidths] = useState<number[]>(
    Array.from({ length: tabCount }, () => 0),
  );
  const labelMeasured = useRef<boolean[]>(
    Array.from({ length: tabCount }, () => false),
  );
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const containerWidthRef = useRef(0);
  const labelWidthsRef = useRef<number[]>(
    Array.from({ length: tabCount }, () => 0),
  );
  const activeIndexRef = useRef(state.index);
  const isInitializedRef = useRef(false);

  const getTabWidths = (
    activeIndex: number,
    measuredLabelWidths: number[],
    cWidth: number,
  ) => {
    if (cWidth === 0) return Array.from({ length: tabCount }, () => 0);

    const usableWidth = cWidth - 16;
    const activeLabelWidth = measuredLabelWidths[activeIndex] ?? 0;
    const activeContentWidth =
      TAB_PADDING_H * 2 +
      ICON_SIZE +
      (activeLabelWidth > 0 ? LABEL_MARGIN + activeLabelWidth : 0);
    const inactiveContentWidth = TAB_PADDING_H * 2 + ICON_SIZE;
    const remainingWidth =
      usableWidth - activeContentWidth - inactiveContentWidth * (tabCount - 1);
    const bonusPerTab = remainingWidth / tabCount;

    return tabs.map((_, i) =>
      i === activeIndex
        ? activeContentWidth + bonusPerTab
        : inactiveContentWidth + bonusPerTab,
    );
  };

  const animateTabs = (
    activeIndex: number,
    measuredLabelWidths: number[],
    cWidth: number,
  ) => {
    if (cWidth === 0) return;

    activeIndexRef.current = activeIndex;
    const widths = getTabWidths(activeIndex, measuredLabelWidths, cWidth);

    tabs.forEach((_, index) => {
      const isFocused = activeIndex === index;

      Animated.spring(tabWidthAnims.current[index], {
        toValue: widths[index],
        useNativeDriver: false,
        friction: 9,
        tension: 60,
        overshootClamping: true,
      }).start();

      Animated.parallel([
        Animated.spring(scaleAnims.current[index], {
          toValue: isFocused ? 1.05 : 1,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
          overshootClamping: true,
        }),
        Animated.spring(translateYAnims.current[index], {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
          overshootClamping: true,
        }),
      ]).start();

      if (isFocused) {
        labelTranslateXAnims.current[index].setValue(-8);
        labelOpacityAnims.current[index].setValue(0);

        Animated.parallel([
          Animated.spring(labelTranslateXAnims.current[index], {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 70,
            overshootClamping: true,
          }),
          Animated.timing(labelOpacityAnims.current[index], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(labelOpacityAnims.current[index], {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }).start(() => {
          labelTranslateXAnims.current[index].setValue(-8);
        });
      }
    });
  };

  useEffect(() => {
    if (containerWidth === 0) return;
    containerWidthRef.current = containerWidth;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const widths = getTabWidths(
        state.index,
        labelWidthsRef.current,
        containerWidth,
      );
      tabWidthAnims.current.forEach((anim, index) => {
        anim.setValue(widths[index]);
      });
      scaleAnims.current.forEach((anim, index) => {
        anim.setValue(index === state.index ? 1.05 : 1);
      });
      translateYAnims.current.forEach((anim) => {
        anim.setValue(0);
      });
      return;
    }

    animateTabs(state.index, labelWidthsRef.current, containerWidth);
  }, [containerWidth]);

  useEffect(() => {
    animateTabs(state.index, labelWidthsRef.current, containerWidthRef.current);
  }, [state.index]);

  useEffect(() => {
    labelWidthsRef.current = labelWidths;
    const allMeasured = labelWidths.every((w) => w > 0);
    if (
      allMeasured &&
      containerWidthRef.current > 0 &&
      isInitializedRef.current
    ) {
      animateTabs(state.index, labelWidths, containerWidthRef.current);
    }
  }, [labelWidths]);

  const handleLabelLayout = (index: number, width: number) => {
    if (labelMeasured.current[index] && labelWidthsRef.current[index] === width)
      return;
    labelMeasured.current[index] = true;
    setLabelWidths((prev) => {
      const next = [...prev];
      next[index] = width;
      return next;
    });
  };

  const handlePressIn = (index: number) => {
    setPressedIndex(index);
    Animated.spring(scaleAnims.current[index], {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
      overshootClamping: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    setPressedIndex(null);
    const isFocused = activeIndexRef.current === index;
    Animated.spring(scaleAnims.current[index], {
      toValue: isFocused ? 1.05 : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 50,
      overshootClamping: true,
    }).start();
  };

  return (
    <View className="absolute bottom-8 left-6 right-6">
      <View className="absolute opacity-0 pointer-events-none" aria-hidden>
        {tabs.map((tab, index) => (
          <Text
            key={tab.key}
            className="font-semibold text-[13px]"
            onLayout={(e) =>
              handleLabelLayout(index, e.nativeEvent.layout.width)
            }
          >
            {tab.label}
          </Text>
        ))}
      </View>

      <View
        className={`rounded-3xl shadow-2xl border ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View className="flex-row items-center justify-center py-3 px-2">
          {tabs.map((tab, index) => {
            const isFocused = state.index === index;
            const iconColor = isFocused
              ? activeColor
              : isDarkMode
                ? "#9CA3AF"
                : "#6B7280";

            const pillBgClass = isFocused
              ? isDarkMode
                ? "bg-red-500/15"
                : "bg-red-100"
              : pressedIndex === index
                ? isDarkMode
                  ? "bg-gray-600/50"
                  : "bg-gray-100/70"
                : "bg-transparent";

            return (
              <TouchableOpacity
                key={tab.key}
                className="items-center justify-center"
                onPress={() => navigation.navigate(tab.key)}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                activeOpacity={1}
              >
                <Animated.View
                  className={`rounded-2xl overflow-hidden ${pillBgClass}`}
                  style={{
                    width: tabWidthAnims.current[index],
                  }}
                >
                  <Animated.View
                    className="flex-row items-center justify-center px-4 py-2"
                    style={{
                      transform: [
                        { scale: scaleAnims.current[index] },
                        { translateY: translateYAnims.current[index] },
                      ],
                    }}
                  >
                    <Ionicons
                      name={isFocused ? tab.activeIcon : tab.icon}
                      size={ICON_SIZE}
                      color={iconColor}
                    />

                    {isFocused && (
                      <Animated.Text
                        className="ml-1.5 text-[13px] font-semibold"
                        style={{
                          opacity: labelOpacityAnims.current[index],
                          transform: [
                            {
                              translateX: labelTranslateXAnims.current[index],
                            },
                          ],
                          color: activeColor,
                        }}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Animated.Text>
                    )}
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default memo(FloatingTabBar);
