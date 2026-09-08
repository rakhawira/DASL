import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type Language = "EN" | "ID";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>("EN");

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage && (savedLanguage === "EN" || savedLanguage === "ID")) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.log("Error loading language preference:", error);
    }
  };

  const saveLanguagePreference = async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem("language", newLanguage);
    } catch (error) {
      console.log("Error saving language preference:", error);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = language === "EN" ? "ID" : "EN";
    setLanguage(newLanguage);
    saveLanguagePreference(newLanguage);
  };

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    saveLanguagePreference(newLanguage);
  };

  const value = {
    language,
    setLanguage: handleSetLanguage,
    toggleLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
