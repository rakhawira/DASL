import Header from "@/components/Header";
import { FACULTIES, getMajorsByFaculty, ROLES } from "@/constants/academicData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { createUser } from "@/services/api";
import { CreateUser, UserRole } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function AddUser() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
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

  const [dynamicMajors, setDynamicMajors] = useState(
    getMajorsByFaculty(formData.fakultas),
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roles = ROLES;
  const faculties = FACULTIES;

  const handleAddUser = async () => {
    // Validation
    if (
      !formData.username ||
      !formData.name ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      showToast(
        language === "EN"
          ? "Please fill in all required fields"
          : "Harap isi semua field yang wajib diisi",
        "error",
      );
      return;
    }

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

    // For all roles, ensure username is properly set as NIM/NIP
    if (!formData.username) {
      showToast(
        language === "EN"
          ? "Please enter NIM/NIP as username"
          : "Harap masukkan NIM/NIP sebagai username",
        "error",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Prepare user data for API
      const userData: CreateUser = {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        jurusan: formData.jurusan || undefined,
        fakultas: formData.fakultas || undefined,
        dosenType:
          formData.role === "dosen" && formData.dosenType
            ? (formData.dosenType as "pengajar" | "wali")
            : undefined,
      };

      // Call API to create user
      const response = await createUser(userData);

      showToast(
        language === "EN"
          ? `User ${response.data.name} has been added successfully!`
          : `Pengguna ${response.data.name} telah berhasil ditambahkan!`,
        "success",
      );

      // Reset form
      setFormData({
        username: "",
        name: "",
        role: "mahasiswa",
        jurusan: "",
        fakultas: "",
        dosenType: "",
        password: "",
        confirmPassword: "",
      });

      // Go back to users list
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        (language === "EN"
          ? "Failed to add user. Please try again."
          : "Gagal menambah pengguna. Silakan coba lagi.");

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
              // Clear role-specific fields when role changes
              if (role.value === "mahasiswa") {
                // For mahasiswa, username serves as NIM
              } else if (role.value === "dosen" || role.value === "staff") {
                // For dosen/staff, username serves as NIP
              } else {
                // For admin, username is custom
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
              // Clear role-specific fields when faculty changes
              if (formData.role === "mahasiswa") {
                // For mahasiswa, username serves as NIM
              } else if (
                formData.role === "dosen" ||
                formData.role === "staff"
              ) {
                // For dosen/staff, username serves as NIP
              } else {
                // For admin, username is custom
              }
              // Update majors when faculty changes
              setDynamicMajors(getMajorsByFaculty(faculty.value));
              // Clear jurusan when faculty changes
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

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Header */}
        <Header
          title={language === "EN" ? "Add New User" : "Tambah Pengguna Baru"}
          subtitle={
            language === "EN"
              ? "Create a new user account for the system"
              : "Buat akun pengguna baru untuk sistem"
          }
          onBack={() => router.back()}
          isDarkMode={isDarkMode}
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
                    onChangeText={(text) => {
                      const updatedFormData = { ...formData, username: text };
                      // For all roles, username serves as NIM/NIP
                      setFormData(updatedFormData);
                    }}
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
            <View className="mb-4 mt-4">
              {formData.role === "mahasiswa" && (
                <View
                  className={`p-4 rounded-xl ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Text
                    className={`text-lg font-semibold mb-4 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN"
                      ? "Student Information"
                      : "Informasi Mahasiswa"}
                  </Text>

                  {/* Username serves as NIM/NIP - Hidden field for reference */}
                  <View className="hidden">
                    <TextInput value={formData.username} editable={false} />
                  </View>

                  {/* Faculty and Major */}
                  {renderFacultySelector()}
                  {formData.fakultas && (
                    <View className="mt-4">{renderMajorSelector()}</View>
                  )}
                </View>
              )}

              {formData.role === "dosen" && (
                <View
                  className={`p-4 rounded-xl ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Text
                    className={`text-lg font-semibold mb-4 ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN"
                      ? "Lecturer Information"
                      : "Informasi Dosen"}
                  </Text>

                  {/* Username serves as NIM/NIP - Hidden field for reference */}
                  <View className="hidden">
                    <TextInput value={formData.username} editable={false} />
                  </View>

                  {/* Faculty and Major */}
                  {renderFacultySelector()}
                  {formData.fakultas && (
                    <View className="mt-4">{renderMajorSelector()}</View>
                  )}

                  {/* Dosen Type Selector - Only show after major is selected */}
                  {formData.jurusan && (
                    <View className="mt-4">{renderDosenTypeSelector()}</View>
                  )}
                </View>
              )}
            </View>

            {/* Security */}
            <View className="mb-6">
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
                  {language === "EN" ? "Security" : "Keamanan"}
                </Text>

                {/* Password */}
                <View className="mb-4">
                  <Text
                    className={`text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {language === "EN" ? "Password" : "Kata Sandi"} *
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
                          ? "Enter password"
                          : "Masukkan kata sandi"
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
                      ? "Confirm Password"
                      : "Konfirmasi Kata Sandi"}{" "}
                    *
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
                          ? "Confirm password"
                          : "Konfirmasi kata sandi"
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
              onPress={handleAddUser}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <Text className="text-white font-semibold mr-2">
                    {language === "EN" ? "Adding..." : "Menambahkan..."}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    {language === "EN" ? "Add User" : "Tambah Pengguna"}
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
