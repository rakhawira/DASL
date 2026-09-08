import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface NextClassCardProps {
  courseName: string;
  lecturerName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  remainingTime: string;
  currentSession: number;
  totalSessions: number;
  isDarkMode: boolean;
  language: 'EN' | 'ID';
}

type ClassState = 'far' | 'today' | 'soon' | 'live' | 'done';

const STATE_TOKENS = {
  far: {
    accent: ['#1D9E75', '#5DCAA5'],
    badgeBg: '#E1F5EE',
    badgeText: '#0F6E56',
    badgeBorder: '#5DCAA5',
    dot: '#1D9E75',
  },
  today: {
    accent: ['#BA7517', '#EF9F27'],
    badgeBg: '#FAEEDA',
    badgeText: '#854F0B',
    badgeBorder: '#EF9F27',
    dot: '#BA7517',
  },
  soon: {
    accent: ['#E24B4A', '#F09595'],
    badgeBg: '#FCEBEB',
    badgeText: '#A32D2D',
    badgeBorder: '#F09595',
    dot: '#E24B4A',
  },
  live: {
    accent: ['#185FA5', '#85B7EB'],
    badgeBg: '#E6F1FB',
    badgeText: '#0C447C',
    badgeBorder: '#85B7EB',
    dot: '#185FA5',
  },
  done: {
    accent: ['#5F5E5A', '#888780'],
    badgeBg: '#F1EFE8',
    badgeText: '#5F5E5A',
    badgeBorder: '#B4B2A9',
    dot: '#888780',
  },
};

function getClassState(day: string, startTime: string, endTime: string): ClassState {
  const now = new Date();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const daysOrder = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const classDayIndex = daysOrder.indexOf(day);
  
  if (classDayIndex === -1) return 'far';
  
  // Calculate the date of the class
  const startDate = new Date();
  const dayDiff = classDayIndex - currentDayIndex;
  
  if (dayDiff < 0) {
    // Class is next week
    startDate.setDate(startDate.getDate() + dayDiff + 7);
  } else if (dayDiff > 0) {
    // Class is later this week
    startDate.setDate(startDate.getDate() + dayDiff);
  }
  // If dayDiff === 0, class is today, keep current date
  
  startDate.setHours(startHour, startMinute, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setHours(endHour, endMinute, 0, 0);
  
  const diffMs = startDate.getTime() - now.getTime();
  const diffMin = diffMs / 1000 / 60;

  if (now > endDate) return 'done';
  if (now >= startDate) return 'live';
  if (diffMin <= 60) return 'soon';
  if (dayDiff === 0) return 'today';
  
  return 'far';
}

const PulseDot = ({ color, animate }: { color: string; animate: boolean }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) {
      opacity.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animate]);

  return (
    <Animated.View
      className="w-[6px] h-[6px] rounded-[3px] mr-1.5"
      style={{ backgroundColor: color, opacity }}
    />
  );
};

export default function NextClassCard({
  courseName,
  lecturerName,
  day,
  startTime,
  endTime,
  room,
  remainingTime,
  currentSession,
  totalSessions,
  isDarkMode,
  language,
}: NextClassCardProps) {
  const { colors } = useTheme();
  const state = getClassState(day, startTime, endTime);
  const token = STATE_TOKENS[state];
  const shouldPulse = state === 'soon' || state === 'live';
  
  // Calculate progress bar width based on state
  const getProgressWidth = () => {
    if (state === 'soon') {
      // Show how close the class is to starting (90-minute window)
      const now = new Date();
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startDate = new Date();
      
      const daysOrder = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDayIndex = now.getDay();
      const classDayIndex = daysOrder.indexOf(day);
      
      if (classDayIndex === -1) return '0%';
      
      const dayDiff = classDayIndex - currentDayIndex;
      if (dayDiff < 0) {
        startDate.setDate(startDate.getDate() + dayDiff + 7);
      } else if (dayDiff > 0) {
        startDate.setDate(startDate.getDate() + dayDiff);
      }
      
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const diffMs = startDate.getTime() - now.getTime();
      const diffMin = diffMs / 1000 / 60;
      const windowMinutes = 90; // 90-minute window for 'soon' state
      const progress = Math.min(100, Math.max(0, ((windowMinutes - diffMin) / windowMinutes) * 100));
      return `${progress}%`;
    }
    
    if (state === 'live') {
      // Show how much of the class duration has passed
      const now = new Date();
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startDate = new Date();
      const daysOrder = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDayIndex = now.getDay();
      const classDayIndex = daysOrder.indexOf(day);
      
      if (classDayIndex === -1) return '0%';
      
      const dayDiff = classDayIndex - currentDayIndex;
      if (dayDiff < 0) {
        startDate.setDate(startDate.getDate() + dayDiff + 7);
      } else if (dayDiff > 0) {
        startDate.setDate(startDate.getDate() + dayDiff);
      }
      
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      return `${progress}%`;
    }
    
    // For far, today, done states - show session progress
    return `${(currentSession / totalSessions) * 100}%`;
  };
  
  const progressWidth = getProgressWidth();
  const showProgressBar = state === 'soon' || state === 'live';
  
  // Convert percentage string to decimal for style
  const progressWidthDecimal = parseFloat(progressWidth) / 100;
  
  // Get progress label based on state
  const getProgressLabel = () => {
    if (state === 'soon') {
      return language === 'EN' ? 'Starting soon' : 'Segera dimulai';
    }
    if (state === 'live') {
      const now = new Date();
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const endDate = new Date();
      
      const daysOrder = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDayIndex = now.getDay();
      const classDayIndex = daysOrder.indexOf(day);
      
      if (classDayIndex === -1) return '';
      
      const dayDiff = classDayIndex - currentDayIndex;
      if (dayDiff < 0) {
        endDate.setDate(endDate.getDate() + dayDiff + 7);
      } else if (dayDiff > 0) {
        endDate.setDate(endDate.getDate() + dayDiff);
      }
      
      endDate.setHours(endHour, endMinute, 0, 0);
      
      const diffMs = endDate.getTime() - now.getTime();
      const diffMin = Math.ceil(diffMs / 1000 / 60);
      
      if (language === 'EN') {
        return `${diffMin} min left`;
      } else {
        return `${diffMin} menit lagi`;
      }
    }
    return `${currentSession} / ${totalSessions} pertemuan`;
  };
  
  const progressLabel = getProgressLabel();

  // Get badge text based on state and language
  const getBadgeText = () => {
    if (state === 'live') {
      return language === 'EN' ? 'Live now' : 'Live sekarang';
    }
    
    // Translate remaining time based on language
    if (language === 'EN') {
      // Parse Indonesian remaining time and convert to English
      if (remainingTime.includes('hari lagi')) {
        const days = remainingTime.match(/\d+/)?.[0];
        return `${days} day${parseInt(days || '1') > 1 ? 's' : ''} left`;
      }
      if (remainingTime.includes('jam')) {
        const parts = remainingTime.match(/(\d+)\s*jam\s*(\d+)\s*menit\s*lagi/);
        if (parts) {
          const hours = parseInt(parts[1]);
          const minutes = parseInt(parts[2]);
          if (hours > 0 && minutes > 0) {
            return `${hours} hr ${minutes} min left`;
          } else if (hours > 0) {
            return `${hours} hr left`;
          } else if (minutes > 0) {
            return `${minutes} min left`;
          }
        }
      }
      if (remainingTime.includes('menit lagi')) {
        const minutes = remainingTime.match(/\d+/)?.[0];
        return `${minutes} min left`;
      }
    }
    
    // Return original Indonesian text for ID language or fallback
    return remainingTime;
  };

  // Get status note based on state and language
  const getStatusNote = () => {
    if (language === 'EN') {
      switch (state) {
        case 'today':
          return 'Prepare your practical work equipment before leaving';
        case 'soon':
          return `Head to ${room} soon`;
        case 'live':
          return `Ends at ${endTime} WIB`;
        case 'done':
          return 'Class completed';
        default:
          return null;
      }
    } else {
      switch (state) {
        case 'today':
          return 'Siapkan alat praktikum sebelum berangkat';
        case 'soon':
          return `Segera menuju ${room}`;
        case 'live':
          return `Berakhir pukul ${endTime} WIB`;
        case 'done':
          return 'Kelas selesai';
        default:
          return null;
      }
    }
  };

  const statusNote = getStatusNote();

  return (
    <View
      className={`px-5 py-4 rounded-2xl shadow-sm border relative overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"} border-gray-200 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      {/* Accent Line */}
      <LinearGradient
        colors={[token.accent[0], token.accent[1], 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
      />

      {/* Row Top */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text
            className="text-base font-medium mb-1"
            style={{ color: colors.text }}
          >
            {courseName}
          </Text>
          <Text
            className="text-xs font-normal"
            style={{ color: colors.placeholder }}
          >
            {lecturerName}
          </Text>
        </View>
        
        {/* Status Badge */}
        <View
          className="flex-row items-center px-3 py-1 rounded-3xl border"
          style={{
            backgroundColor: token.badgeBg,
            borderColor: token.badgeBorder,
          }}
        >
          <PulseDot color={token.dot} animate={shouldPulse} />
          <Text 
            className="text-[11px] font-medium"
            style={{ color: token.badgeText }}
          >
            {getBadgeText()}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View
        className="h-[0.5] mb-3"
        style={{ backgroundColor: colors.border }}
      />

      {/* Meta Row */}
      <View className="flex-row items-center mb-3">
        <View className="flex-row items-center">
          <Ionicons
            name="calendar-outline"
            size={14}
            className="mr-1"
            style={{ color: colors.textSecondary }}
          />
          <Text
            className="text-xs font-normal"
            style={{ color: colors.textSecondary }}
          >
            {day}
          </Text>
        </View>
        <View
          className="w-[3px] h-[3px] rounded-[1.5px] mx-[5px]"
          style={{ backgroundColor: colors.placeholder }}
        />
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={14}
            className="mr-1"
            style={{ color: colors.textSecondary }}
          />
          <Text
            className="text-xs font-normal"
            style={{ color: colors.textSecondary }}
          >
            {startTime} - {endTime} WIB
          </Text>
        </View>
        <View
          className="w-[3px] h-[3px] rounded-[1.5px] mx-[5px]"
          style={{ backgroundColor: colors.placeholder }}
        />
        <View className="flex-row items-center">
          <Ionicons
            name="location-outline"
            size={14}
            className="mr-1"
            style={{ color: colors.textSecondary }}
          />
          <Text
            className="text-xs font-normal"
            style={{ color: colors.textSecondary }}
          >
            {room}
          </Text>
        </View>
      </View>

      {/* Progress Row */}
      {showProgressBar && (
        <View className="flex-row items-center">
          <View
            className="flex-1 h-[4px] rounded-[2px] mr-2"
            style={{ backgroundColor: colors.border }}
          >
            <View
              className="h-[4px] rounded-[2px]"
              style={{
                width: progressWidthDecimal,
                backgroundColor: token.accent[0]
              }}
            />
          </View>
          <Text
            className="text-[11px] font-normal"
            style={{ color: colors.placeholder }}
          >
            {progressLabel}
          </Text>
        </View>
      )}

      {/* Status Note */}
      {statusNote && (
        <Text
          className="text-[11px] font-normal mt-2"
          style={{ color: colors.placeholder }}
        >
          {statusNote}
        </Text>
      )}
    </View>
  );
}
