import Toast from "@/components/Toast";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface ToastContextType {
  showToast: (message: string, type: "success" | "error" | "info") => void;
  hideToast: () => void;
  toast: {
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Global toast handler for use outside React components (e.g., API interceptors)
let globalShowToast: ((message: string, type: "success" | "error" | "info") => void) | null = null;

export const setGlobalToastHandler = (handler: (message: string, type: "success" | "error" | "info") => void) => {
  globalShowToast = handler;
};

export const showGlobalToast = (message: string, type: "success" | "error" | "info") => {
  if (globalShowToast) {
    globalShowToast(message, type);
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState({
    message: "",
    type: "info" as "success" | "error" | "info",
    visible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type, visible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Set global handler when provider mounts
  React.useEffect(() => {
    setGlobalToastHandler(showToast);
    return () => {
      setGlobalToastHandler(() => {});
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};
