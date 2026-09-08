// Global type declarations for DASL project

// Ignore ALL missing type definitions with wildcard
declare module "*";

// Babel specific declarations (most important)
declare module "babel__core" {
  export interface TransformOptions {
    ast?: boolean;
    code?: boolean;
    comments?: boolean;
    compact?: boolean | "auto";
    env?: any;
    exclude?: string[];
    extensions?: string[];
    filename?: string;
    generatorOpts?: any;
    highlightCode?: boolean;
    ignore?: string[];
    inputSourceMap?: any;
    minified?: boolean;
    moduleId?: string;
    moduleRoot?: string;
    moduleIds?: boolean;
    only?: string[];
    plugins?: any[];
    presets?: any[];
    retainLines?: boolean;
    sourceFileName?: string;
    sourceMap?: boolean | "inline" | "both";
    sourceMapTarget?: string;
    sourceRoot?: string;
    sourceType?: "script" | "module";
    wrapPluginVisitorMethod?: string;
  }
}

declare module "babel__generator";
declare module "babel__template";
declare module "babel__traverse";
declare module "estree";
declare module "graceful-fs";
declare module "hammerjs";
declare module "istanbul-lib-coverage";
declare module "istanbul-lib-report";
declare module "istanbul-reports";
declare module "json-schema";
declare module "json5";
declare module "stack-utils";
declare module "yargs-parser";
declare module "node";

// React and Expo modules (explicit declarations for clarity)
declare module "@expo/vector-icons";
declare module "react";
declare module "react-native";
declare module "react-native-safe-area-context";

// NativeWind (Tailwind CSS for React Native) declarations
declare module "nativewind" {
  export interface ViewProps {
    className?: string;
  }
  export interface TextProps {
    className?: string;
  }
}

// Extend React Native props to include className
declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}

// Button component interface
declare module "../../components/Button" {
  interface ButtonProps {
    className?: string;
  }
}

// Declare global WebSocket for React Native
declare global {
  var WebSocket: any;
}

export { };

