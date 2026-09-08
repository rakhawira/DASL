#ifndef CONFIG_H
#define CONFIG_H

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <WiFiClientSecure.h>

// ============================================
// KONFIGURASI WiFi
// ============================================
extern const char* WIFI_SSID;
extern const char* WIFI_PASSWORD;

// ============================================
// KONFIGURASI BACKEND
// ============================================
extern const char* BACKEND_URL;
extern const char* WEBSOCKET_HOST;
extern const int WEBSOCKET_PORT;

// ============================================
// KONFIGURASI DEVICE
// ============================================
extern String DEVICE_ID;
extern String DEVICE_NAME;
extern String DEVICE_LOCATION;
extern String FIRMWARE_VERSION;

// ============================================
// KONFIGURASI TIMING
// ============================================
constexpr unsigned long HEARTBEAT_INTERVAL = 5000;      // 5 detik
constexpr unsigned long COMMAND_POLL_INTERVAL = 2000;   // 2 detik
constexpr unsigned long NFC_READING_TIMEOUT = 10000;    // 10 detik
constexpr unsigned long NFC_DEBOUNCE_TIME = 2000;       // 2 detik anti-rebounce
constexpr unsigned long QR_DISPLAY_TIMEOUT = 15000;    // 15 detik timeout QR display

// ============================================
// KONFIGURASI PN532 NFC (I2C)
// ============================================
#define PN532_SDA  21     // Data pin
#define PN532_SCL  22  // Clock pin

#endif
