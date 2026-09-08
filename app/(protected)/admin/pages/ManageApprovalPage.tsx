import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import {
  getApprovals,
  getScheduleRequests,
  updateApprovalStatus,
  updateScheduleRequestStatus,
} from "@/services/api";
import { Approval } from "@/types/approval";
import { formatDate } from "@/utils/dateUtils";
import { getApprovalStatusColor } from "@/utils/statusUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";
import { useTimezone } from "../../../../hooks/useTimezone";

export default function ManageApprovalTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refreshSpecific } = useRefresh();
  const { timezoneInfo } = useTimezone();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null,
  );
  const [selectedScheduleRequest, setSelectedScheduleRequest] =
    useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch function
  const fetchData = async () => {
    try {
      // Fetch schedule requests
      const scheduleResponse = await getScheduleRequests();
      if (scheduleResponse.success) {
        setScheduleRequests(scheduleResponse.data || []);
      }

      // Fetch regular approvals
      const approvalResponse = await getApprovals();
      if (approvalResponse.success) {
        setApprovals(approvalResponse.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Fetch schedule requests and approvals on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return "book-outline";
      case "news":
        return "newspaper-outline";
      case "schedule":
        return "calendar-outline";
      default:
        return "document-outline";
    }
  };

  const handleApproveScheduleRequest = async (scheduleRequest: any) => {
    try {
      setLoading(true);

      const response = await updateScheduleRequestStatus(
        scheduleRequest.id,
        "approved",
        user?.name || "Admin",
      );

      if (response.success) {
        setScheduleRequests((prev) =>
          prev.map((req) =>
            req.id === scheduleRequest.id
              ? {
                  ...req,
                  status: "approved",
                  approved_by: user?.name || "Admin",
                  approved_at: new Date().toISOString(),
                }
              : req,
          ),
        );

        showToast(
          language === "EN"
            ? "Schedule edit request approved successfully"
            : "Permintaan edit jadwal disetujui",
          "success",
        );
      } else {
        throw new Error(
          response.message || "Failed to approve schedule request",
        );
      }
    } catch (error: any) {
      console.error("Error approving schedule request:", error);
      showToast(
        language === "EN"
          ? "Failed to approve schedule request"
          : "Gagal menyetujui permintaan edit jadwal",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (approval: Approval) => {
    try {
      setLoading(true);

      const response = await updateApprovalStatus(
        approval.id,
        "approved",
        user?.name || "Admin",
      );

      if (response.success) {
        setApprovals((prev) =>
          prev.map((req) =>
            req.id === approval.id
              ? {
                  ...req,
                  status: "approved",
                  approved_by: user?.name || "Admin",
                  approved_at: new Date().toISOString(),
                }
              : req,
          ),
        );

        showToast(
          language === "EN"
            ? "Request approved successfully"
            : "Permohonan disetujui",
          "success",
        );
      } else {
        throw new Error(response.message || "Failed to approve request");
      }
    } catch (error: any) {
      console.error("Error approving request:", error);
      showToast(
        language === "EN"
          ? "Failed to approve request"
          : "Gagal menyetujui permohonan",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval && !selectedScheduleRequest) {
      showToast(
        language === "EN"
          ? "Please select an item to reject"
          : "Harap pilih item yang akan ditolak",
        "error",
      );
      return;
    }

    if (!rejectionReason.trim()) {
      showToast(
        language === "EN"
          ? "Please provide a rejection reason"
          : "Harap berikan alasan penolakan",
        "error",
      );
      return;
    }

    try {
      setLoading(true);

      if (selectedApproval) {
        // Handle regular approval rejection
        const response = await updateApprovalStatus(
          selectedApproval.id,
          "rejected",
          user?.name || "Admin",
          rejectionReason,
        );

        if (response.success) {
          setApprovals((prev) =>
            prev.map((req) =>
              req.id === selectedApproval.id
                ? {
                    ...req,
                    status: "rejected",
                    approved_by: user?.name || "Admin",
                    approved_at: new Date().toISOString(),
                    rejectionReason,
                  }
                : req,
            ),
          );
        } else {
          throw new Error(
            response.message || "Failed to reject approval request",
          );
        }
      } else if (selectedScheduleRequest) {
        // Handle schedule request rejection
        const response = await updateScheduleRequestStatus(
          selectedScheduleRequest.id,
          "rejected",
          user?.name || "Admin",
          rejectionReason,
        );

        if (response.success) {
          setScheduleRequests((prev) =>
            prev.map((req) =>
              req.id === selectedScheduleRequest.id
                ? {
                    ...req,
                    status: "rejected",
                    approved_by: user?.name || "Admin",
                    approved_at: new Date().toISOString(),
                    rejection_reason: rejectionReason,
                  }
                : req,
            ),
          );
        } else {
          throw new Error(
            response.message || "Failed to reject schedule request",
          );
        }
      }

      showToast(
        language === "EN"
          ? "Request rejected successfully"
          : "Permohonan ditolak",
        "success",
      );

      setShowRejectModal(false);
      setSelectedApproval(null);
      setSelectedScheduleRequest(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      showToast(
        language === "EN"
          ? "Failed to reject request"
          : "Gagal menolak permohonan",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderApprovalItem = ({ item }: { item: Approval }) => {
    return (
      <View
        className={`p-4 rounded-lg mb-3 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-md`}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Ionicons
              name={getTypeIcon(item.type)}
              size={20}
              color={getApprovalStatusColor(item.status)}
            />
            <View className="ml-3 flex-1">
              <Text
                className={`font-semibold text-sm ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {item.title}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {item.description}
              </Text>
            </View>
          </View>
          <View
            className={`px-2 py-1 rounded-full ${
              item.status === "pending"
                ? "bg-amber-100"
                : item.status === "approved"
                  ? "bg-emerald-100"
                  : "bg-red-100"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.status === "pending"
                  ? "text-amber-700"
                  : item.status === "approved"
                    ? "text-emerald-700"
                    : "text-red-700"
              }`}
            >
              {item.status === "pending"
                ? language === "EN"
                  ? "Pending"
                  : "Menunggu"
                : item.status === "approved"
                  ? language === "EN"
                    ? "Approved"
                    : "Disetujui"
                  : language === "EN"
                    ? "Rejected"
                    : "Ditolak"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <View>
            <Text
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {language === "EN" ? "Requested by" : "Diajukan oleh"}:{" "}
              {item.requested_by}
            </Text>
            <Text
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {formatDate(item.requested_at)}
            </Text>
          </View>

          {item.status === "pending" && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleApproveRequest(item)}
                disabled={loading}
                className={`px-3 py-1 rounded-lg ${
                  loading ? "bg-gray-300" : "bg-emerald-500"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    loading ? "text-gray-500" : "text-white"
                  }`}
                >
                  {language === "EN" ? "Approve" : "Setujui"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedApproval(item);
                  setSelectedScheduleRequest(null);
                  setShowRejectModal(true);
                }}
                disabled={loading}
                className={`px-3 py-1 rounded-lg ${
                  loading ? "bg-gray-300" : "bg-red-500"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    loading ? "text-gray-500" : "text-white"
                  }`}
                >
                  {language === "EN" ? "Reject" : "Tolak"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.status === "rejected" && item.rejectionReason && (
          <View
            className={`mt-2 p-2 rounded-lg ${
              isDarkMode ? "bg-gray-700" : "bg-red-50"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isDarkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              {language === "EN" ? "Rejection Reason" : "Alasan Penolakan"}:
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isDarkMode ? "text-red-300" : "text-red-600"
              }`}
            >
              {item.rejectionReason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderScheduleRequestItem = ({ item }: { item: any }) => {
    let originalData = null;
    try {
      originalData = item.original_data
        ? typeof item.original_data === "string"
          ? JSON.parse(item.original_data)
          : item.original_data
        : null;
    } catch (error) {
      console.error("Error parsing original_data:", error);
      originalData = null;
    }

    return (
      <View
        className={`p-4 rounded-lg mb-3 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-md`}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="calendar-outline"
              size={20}
              color={getApprovalStatusColor(item.status)}
            />
            <View className="ml-3 flex-1">
              <Text
                className={`font-semibold text-sm ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN"
                  ? "Schedule Edit Request"
                  : "Permintaan Edit Jadwal"}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {item.course_name} ({item.course_code})
              </Text>
            </View>
          </View>
          <View
            className={`px-2 py-1 rounded-full ${
              item.status === "pending"
                ? "bg-amber-100"
                : item.status === "approved"
                  ? "bg-emerald-100"
                  : "bg-red-100"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.status === "pending"
                  ? "text-amber-700"
                  : item.status === "approved"
                    ? "text-emerald-700"
                    : "text-red-700"
              }`}
            >
              {item.status === "pending"
                ? language === "EN"
                  ? "Pending"
                  : "Menunggu"
                : item.status === "approved"
                  ? language === "EN"
                    ? "Approved"
                    : "Disetujui"
                  : language === "EN"
                    ? "Rejected"
                    : "Ditolak"}
            </Text>
          </View>
        </View>

        {/* Changes Details Section */}
        <View
          className={`mt-3 p-3 rounded-lg ${
            isDarkMode ? "bg-gray-700" : "bg-blue-50"
          }`}
        >
          <Text
            className={`font-medium text-xs mb-2 ${
              isDarkMode ? "text-blue-400" : "text-blue-700"
            }`}
          >
            {language === "EN" ? "Changes Requested" : "Perubahan yang Diminta"}
            :
          </Text>

          {originalData && (
            <View className="space-y-1">
              {/* Day Change */}
              {originalData.day !== item.day && (
                <View className="flex-row items-center">
                  <Text
                    className={`text-xs w-16 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Day" : "Hari"}
                  </Text>
                  <Text
                    className={`text-xs line-through mr-2 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {originalData.day || "-"}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    →
                  </Text>
                  <Text
                    className={`text-xs ml-2 font-medium ${
                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  >
                    {item.day}
                  </Text>
                </View>
              )}

              {/* Time Change */}
              {(originalData.startTime !== item.start_time ||
                originalData.endTime !== item.end_time) && (
                <View className="flex-row items-center">
                  <Text
                    className={`text-xs w-16 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Time" : "Waktu"}
                  </Text>
                  <Text
                    className={`text-xs line-through mr-2 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {originalData.startTime || "-"} -{" "}
                    {originalData.endTime || "-"}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    →
                  </Text>
                  <Text
                    className={`text-xs ml-2 font-medium ${
                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  >
                    {item.start_time} - {item.end_time}
                  </Text>
                </View>
              )}

              {/* Room Change */}
              {originalData.room !== item.room && (
                <View className="flex-row items-center">
                  <Text
                    className={`text-xs w-16 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Room" : "Ruangan"}
                  </Text>
                  <Text
                    className={`text-xs line-through mr-2 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {originalData.room || "-"}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    →
                  </Text>
                  <Text
                    className={`text-xs ml-2 font-medium ${
                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  >
                    {item.room}
                  </Text>
                </View>
              )}

              {/* No changes indicator */}
              {originalData.day === item.day &&
                originalData.startTime === item.start_time &&
                originalData.endTime === item.end_time &&
                originalData.room === item.room && (
                  <Text
                    className={`text-xs italic ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    {language === "EN"
                      ? "No changes detected"
                      : "Tidak ada perubahan yang terdeteksi"}
                  </Text>
                )}
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <View>
            <Text
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {language === "EN" ? "Requested by" : "Diajukan oleh"}:{" "}
              {item.requested_by}
            </Text>
            <Text
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {formatDate(item.requested_at)}
            </Text>
          </View>

          {item.status === "pending" && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleApproveScheduleRequest(item)}
                disabled={loading}
                className={`px-3 py-1 rounded-lg ${
                  loading ? "bg-gray-300" : "bg-emerald-500"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    loading ? "text-gray-500" : "text-white"
                  }`}
                >
                  {language === "EN" ? "Approve" : "Setujui"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedScheduleRequest(item);
                  setSelectedApproval(null);
                  setShowRejectModal(true);
                }}
                disabled={loading}
                className={`px-3 py-1 rounded-lg ${
                  loading ? "bg-gray-300" : "bg-red-500"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    loading ? "text-gray-500" : "text-white"
                  }`}
                >
                  {language === "EN" ? "Reject" : "Tolak"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.status === "rejected" && item.rejection_reason && (
          <View
            className={`mt-2 p-2 rounded-lg ${
              isDarkMode ? "bg-gray-700" : "bg-red-50"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isDarkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              {language === "EN" ? "Rejection Reason" : "Alasan Penolakan"}:
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isDarkMode ? "text-red-300" : "text-red-600"
              }`}
            >
              {item.rejection_reason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <Header
        title={language === "EN" ? "Manage Approvals" : "Kelola Persetujuan"}
        onBack={() => router.back()}
        isDarkMode={isDarkMode}
      />

      <KeyboardAwareScrollView
        className="flex-1 px-4 pt-4"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
      >
        {/* Regular Approvals Section */}
        {approvals.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="document-outline"
                size={20}
                color={isDarkMode ? "#10B981" : "#059669"}
                className="mr-2"
              />
              <Text
                className={`font-bold text-base ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN"
                  ? "Other Approval Requests"
                  : "Permintaan Persetujuan Lainnya"}
              </Text>
              <View
                className={`ml-2 px-2 py-1 rounded-full ${
                  isDarkMode ? "bg-emerald-900" : "bg-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-700"
                  }`}
                >
                  {approvals.length}
                </Text>
              </View>
            </View>
            {approvals.map((approval) => (
              <View key={approval.id}>
                {renderApprovalItem({ item: approval })}
              </View>
            ))}
          </View>
        )}

        {/* Schedule Requests Section */}
        {scheduleRequests.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isDarkMode ? "#10B981" : "#059669"}
                className="mr-2"
              />
              <Text
                className={`font-bold text-base ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN"
                  ? "Schedule Edit Requests"
                  : "Permintaan Edit Jadwal"}
              </Text>
              <View
                className={`ml-2 px-2 py-1 rounded-full ${
                  isDarkMode ? "bg-emerald-900" : "bg-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-700"
                  }`}
                >
                  {scheduleRequests.length}
                </Text>
              </View>
            </View>
            {scheduleRequests.map((request) => (
              <View key={request.id}>
                {renderScheduleRequestItem({ item: request })}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {scheduleRequests.length === 0 && approvals.length === 0 && (
          <View className="flex-1 items-center justify-center py-12">
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`mt-3 text-center ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {language === "EN"
                ? "No approval requests at the moment"
                : "Tidak ada permintaan persetujuan saat ini"}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className={`w-11/12 max-w-md p-6 rounded-lg ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <Text
              className={`text-lg font-bold mb-4 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Reject Request" : "Tolak Permohonan"}
            </Text>

            <Text
              className={`mb-3 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {selectedApproval?.title ||
                (selectedScheduleRequest
                  ? `${language === "EN" ? "Schedule Edit Request" : "Permintaan Edit Jadwal"}: ${selectedScheduleRequest.course_name}`
                  : "")}
            </Text>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder={
                language === "EN"
                  ? "Enter rejection reason..."
                  : "Masukkan alasan penolakan..."
              }
              multiline
              numberOfLines={4}
              className={`w-full p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              textAlignVertical="top"
            />

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                className={`flex-1 py-3 rounded-lg border ${
                  isDarkMode
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300 bg-gray-100"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Cancel" : "Batal"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                disabled={loading}
                className={`flex-1 py-3 rounded-lg ${
                  loading ? "bg-gray-400" : "bg-red-500"
                }`}
              >
                <Text
                  className={`text-center font-medium text-white ${
                    loading ? "text-gray-300" : ""
                  }`}
                >
                  {loading
                    ? language === "EN"
                      ? "Processing..."
                      : "Memproses..."
                    : language === "EN"
                      ? "Reject"
                      : "Tolak"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaViewComponent>
  );
}
