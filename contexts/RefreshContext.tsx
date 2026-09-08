import React, { createContext, useCallback, useContext, useRef } from "react";
import { RefreshControl } from "react-native";

interface RefreshContextType {
  registerRefreshFunction: (
    key: string,
    refreshFn: () => Promise<void>,
  ) => void;
  unregisterRefreshFunction: (key: string) => void;
  refreshAll: () => Promise<void>;
  refreshSpecific: (key: string) => Promise<void>;
  getRefreshControl: (
    key: string,
    onRefresh: () => void,
  ) => React.ReactElement<any>;
  isRefreshing: (key: string) => boolean;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
};

interface RefreshProviderProps {
  children: React.ReactNode;
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({
  children,
}) => {
  const refreshFunctions = useRef<Map<string, () => Promise<void>>>(new Map());
  const refreshingKeys = useRef<Set<string>>(new Set());

  const registerRefreshFunction = useCallback(
    (key: string, refreshFn: () => Promise<void>) => {
      refreshFunctions.current.set(key, refreshFn);
    },
    [],
  );

  const unregisterRefreshFunction = useCallback((key: string) => {
    refreshFunctions.current.delete(key);
    refreshingKeys.current.delete(key);
  }, []);

  const refreshAll = useCallback(async () => {
    const promises = Array.from(refreshFunctions.current.values()).map((fn) => {
      try {
        return fn();
      } catch (error) {
        console.error("Error in refresh function:", error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }, []);

  const refreshSpecific = useCallback(async (key: string) => {
    const refreshFn = refreshFunctions.current.get(key);
    if (refreshFn) {
      try {
        refreshingKeys.current.add(key);
        await refreshFn();
      } catch (error) {
        console.error(`Error refreshing ${key}:`, error);
      } finally {
        refreshingKeys.current.delete(key);
      }
    }
  }, []);

  const isRefreshing = useCallback((key: string) => {
    return refreshingKeys.current.has(key);
  }, []);

  const getRefreshControl = useCallback(
    (key: string, onRefresh: () => void) => {
      return (
        <RefreshControl
          refreshing={isRefreshing(key)}
          onRefresh={() => {
            onRefresh();
            refreshSpecific(key);
          }}
          colors={["#EF4444"]}
          tintColor="#EF4444"
        />
      );
    },
    [refreshSpecific, isRefreshing],
  );

  const value: RefreshContextType = {
    registerRefreshFunction,
    unregisterRefreshFunction,
    refreshAll,
    refreshSpecific,
    getRefreshControl,
    isRefreshing,
  };

  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
};
