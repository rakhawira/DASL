import Header from "@/components/Header";
import { FACULTIES, getMajorsByFaculty, ROLES } from "@/constants/academicData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { getUsers, updateUser } from "@/services/api";
import { User, UserRole } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function EditUser() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    role: "mahasiswa" as UserRole,
    jurusan: "",
    fakultas: "",
    dosenType: "" as string,
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await getUsers();
      const foundUser = response.data.find(
        (u: User) => u.id.toString() === userId,
      );
      if (foundUser) {
        setUser(foundUser);
        const faculty = foundUser.fakultas || "";
        setFormData({
          username: foundUser.username,
          name: foundUser.name,
          role: foundUser.role,
          jurusan: foundUser.jurusan || "",
          fakultas: faculty,
          dosenType: (foundUser.dosenType || "") as string,
          password: "",
          confirmPassword: "",
        });
        setDynamicMajors(getMajorsByFaculty(faculty));
      } else {
        showToast(
          language === "EN" ? "User not found" : "Pengguna tidak ditemukan",
          "error",
        );
        router.back();
      }
    } catch (error) {
      showToast(
        language === "EN" ? "Failed to load user" : "Gagal memuat pengguna",
        "error",
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const [dynamicMajors, setDynamicMajors] = useState(
    getMajorsByFaculty(formData.fakultas),
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roles = ROLES;
  const faculties = FACULTIES;

  const handleUpdateUser = async () => {
    // Validation
    if (!formData.username || !formData.name) {
      showToast(
        language === "EN"
          ? "Please fill in all required fields"
          : "Harap isi semua field yang wajib diisi",
        "error",
      );
      return;
    }

    // Password validation only if password is being changed
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        showToast(
          language === "EN" ? "Passwords do not match" : "Password tidak cocok",
          "error",
        );
        return;
      }

      if (formData.password.length < 6) {
        showToast(
          language === "EN"
            ? "Password must be at least 6 characters"
            : "Password minimal 6 karakter",
          "error",
        );
        return;
      }
    }

    // Role-specific validation
    if (
      formData.role === "mahasiswa" &&
      (!formData.jurusan || !formData.fakultas)
    ) {
      showToast(
        language === "EN"
          ? "Please fill in student information"
          : "Harap isi informasi mahasiswa",
        "error",
      );
      return;
    }

    if (
      formData.role === "dosen" &&
      (!formData.jurusan || !formData.fakultas || !formData.dosenType)
    ) {
      showToast(
        language === "EN"
          ? "Please fill in lecturer information including lecturer type"
          : "Harap isi informasi dosen termasuk tipe dosen",
        "error",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Prepare user data for API
      const userData: Partial<User> & { password?: string } = {
        username: formData.username,
        name: formData.name,
        role: formData.role,
        jurusan: formData.jurusan || undefined,
        fakultas: formData.fakultas || undefined,
        dosenType:
          formData.role === "dosen" && formData.dosenType
            ? (formData.dosenType as "pengajar" | "wali")
            : undefined,
      };

      // Only include password if it's being changed
      if (formData.password) {
        userData.password = formData.password;
      }

      // Call API to update user
      const response = await updateUser({
        ...userData,
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: new Date().toISOString(),
      } as User & { password?: string });

      showToast(
        language === "EN"
          ? `User ${response.data.name} has been updated successfully!`
          : `Pengguna ${response.data.name} telah berhasil diperbarui!`,
        "success",
      );

      // Go back to users list
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        (language === "EN"
          ? "Failed to update user. Please try again."
          : "Gagal memperbarui pengguna. Silakan coba lagi.");

      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleSelector = () => (
    <View className="space-y-2">
      <Text
        className={`text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {language === "EN" ? "Role" : "Peran"}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {roles.map((role) => (
          <TouchableOpacity
            key={role.value}
            className={`px-4 py-2 rounded-lg border ${
              formData.role === role.value
                ? "bg-red-500 border-red-500"
                : isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
            }`}
            onPress={() => {
              const updatedFormData = { ...formData, role: role.value };
              // Reset dosenType when changing to dosen role to avoid auto-selection
              if (role.value === "dosen") {
                updatedFormData.dosenType = "";
              }
              setFormData(updatedFormData);
            }}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                formData.role === role.value
                  ? "text-white"
                  : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              {role.label[language]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFacultySelector = () => (
    <View className="space-y-2">
      <Text
        className={`text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {language === "EN" ? "Faculty" : "Fakultas"}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {faculties.map((faculty) => (
          <TouchableOpacity
            key={faculty.value}
            className={`px-3 py-2 rounded-lg border ${
              formData.fakultas === faculty.value
                ? "bg-red-500 border-red-500"
                : isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
            }`}
            onPress={() => {
              const updatedFormData = { ...formData, fakultas: faculty.value };
              setDynamicMajors(getMajorsByFaculty(faculty.value));
              updatedFormData.jurusan = "";
              setFormData(updatedFormData);
            }}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                formData.fakultas === faculty.value
                  ? "text-white"
                  : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              {faculty.label[language]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMajorSelector = () => (
    <View className="space-y-2">
      <Text
        className={`text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {language === "EN" ? "Major" : "Jurusan"}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {dynamicMajors.map((major) => (
          <TouchableOpacity
            key={major.value}
            className={`px-3 py-2 rounded-lg border ${
              formData.jurusan === major.value
                ? "bg-red-500 border-red-500"
                : isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
            }`}
            onPress={() => setFormData({ ...formData, jurusan: major.value })}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                formData.jurusan === major.value
                  ? "text-white"
                  : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              {major.label[language]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDosenTypeSelector = () => (
    <View className="space-y-2">
      <Text
        className={`text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {language === "EN" ? "Lecturer Type" : "Tipe Dosen"}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <TouchableOpacity
          className={`px-3 py-2 rounded-lg border ${
            formData.dosenType === "pengajar"
              ? "bg-red-500 border-red-500"
              : isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
          }`}
          onPress={() => setFormData({ ...formData, dosenType: "pengajar" })}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              formData.dosenType === "pengajar"
                ? "text-white"
                : isDarkMode
                  ? "text-gray-300"
                  : "text-gray-700"
            }`}
          >
            {language === "EN" ? "Teaching Lecturer" : "Dosen Pengajar"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-3 py-2 rounded-lg border ${
            formData.dosenType === "wali"
              ? "bg-red-500 border-red-500"
              : isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
          }`}
          onPress={() => setFormData({ ...formData, dosenType: "wali" })}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              formData.dosenType === "wali"
                ? "text-white"
                : isDarkMode
                  ? "text-gray-300"
                  : "text-gray-700"
            }`}
          >
            {language === "EN" ? "Academic Advisor" : "Dosen Wali"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading || !user) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} items-center justify-center`}
        edges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#EF4444" : "#EF4444"}
        />
        <Text className={`mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          {language === "EN" ? "Loading..." : "Memuat..."}
        </Text>
      </SafeAreaViewComponent>
    );
  }

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={language === "EN" ? "Edit User" : "Edit Pengguna"}
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        {/* Form */}
        <KeyboardAwareScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          keyboardShouldPersistTaps="handled"
        >
          <View className="space-y-6 pb-32">
            {/* Basic Information */}
            <View
              className={`p-6 rounded-xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <Text
                className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN" ? "Basic Information" : "Informasi Dasar"}
              </Text>

              {/* Username */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-medium mb-3 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN"
                    ? "Username (NIM/NIP)"
                    : "Nama Pengguna (NIM/NIP)"}{" "}
                  *
                </Text>
                <View
                  className={`flex-row items-center rounded-lg px-4 py-4 border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                  <TextInput
                    className={`flex-1 ml-3 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                    placeholder={
                      language === "EN"
                        ? "Enter NIM/NIP as Username"
                        : "Masukkan NIM/NIP sebagai Username"
                    }
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={formData.username}
                    onChangeText={(text) =>
                      setFormData({ ...formData, username: text })
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Full Name */}
              <View className="mb-6">
                <Text
                  className={`text-sm font-medium mb-3 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Full Name" : "Nama Lengkap"} *
                </Text>
                <View
                  className={`flex-row items-center rounded-lg px-4 py-4 border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />
                  <TextInput
                    className={`flex-1 ml-3 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                    placeholder={
                      language === "EN"
                        ? "Enter full name"
                        : "Masukkan nama lengkap"
                    }
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Role Selector */}
              <View className="mb-6">{renderRoleSelector()}</View>
            </View>

            {/* Role-Specific Information */}
            <View>
              {(formData.role === "mahasiswa" || formData.role === "dosen") && (
                <View
                  className={`p-4 rounded-xl mt-4 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Text
                    className={`text-lg font-semibold mb-4 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN"
                      ? formData.role === "mahasiswa"
                        ? "Student Information"
                        : "Lecturer Information"
                      : formData.role === "mahasiswa"
                        ? "Informasi Mahasiswa"
                        : "Informasi Dosen"}
                  </Text>

                  {/* Faculty and Major */}
                  {renderFacultySelector()}
                  {formData.fakultas && (
                    <View className="mt-4">{renderMajorSelector()}</View>
                  )}

                  {/* Dosen Type Selector - Only show for dosen role after major is selected */}
                  {formData.role === "dosen" && formData.jurusan && (
                    <View className="mt-4">{renderDosenTypeSelector()}</View>
                  )}
                </View>
              )}
            </View>

            {/* Security */}
            <View className="mb-6 mt-4">
              <View
                className={`p-6 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              >
                <Text
                  className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "EN"
                    ? "Security (Optional)"
                    : "Keamanan (Opsional)"}
                </Text>

                {/* Password */}
                <View className="mb-4">
                  <Text
                    className={`text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {language === "EN" ? "New Password" : "Kata Sandi Baru"}
                  </Text>
                  <View
                    className={`flex-row items-center rounded-lg px-4 py-3 border ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                    <TextInput
                      className={`flex-1 ml-3 ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                      placeholder={
                        language === "EN"
                          ? "Leave blank to keep current password"
                          : "Kosongkan untuk tetap menggunakan password lama"
                      }
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      value={formData.password}
                      onChangeText={(text) =>
                        setFormData({ ...formData, password: text })
                      }
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="ml-3 p-1"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View className="mb-4">
                  <Text
                    className={`text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {language === "EN"
                      ? "Confirm New Password"
                      : "Konfirmasi Kata Sandi Baru"}
                  </Text>
                  <View
                    className={`flex-row items-center rounded-lg px-4 py-3 border ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                    <TextInput
                      className={`flex-1 ml-3 ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                      placeholder={
                        language === "EN"
                          ? "Confirm new password"
                          : "Konfirmasi kata sandi baru"
                      }
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      value={formData.confirmPassword}
                      onChangeText={(text) =>
                        setFormData({ ...formData, confirmPassword: text })
                      }
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="ml-3 p-1"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={20}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className={`p-4 rounded-xl flex-row items-center justify-center ${
                isLoading ? "bg-gray-400" : "bg-red-500"
              }`}
              onPress={handleUpdateUser}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <Text className="text-white font-semibold mr-2">
                    {language === "EN" ? "Updating..." : "Memperbarui..."}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="create-outline" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    {language === "EN" ? "Update User" : "Perbarui Pengguna"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
