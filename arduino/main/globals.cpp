#include "globals.h"

// ============================================
// IMPLEMENTASI OBJECTS
// ============================================
TFT_eSPI tft;
WebSocketsClient webSocket;
Adafruit_PN532 nfc(PN532_SDA, PN532_SCL);
HTTPClient http;
WiFiClientSecure *client = nullptr;

// ============================================
// IMPLEMENTASI SESSION DATA
// ============================================
String currentUsername = "";
String currentName = "";
String currentCommandId = "";
bool nfcReadingActive = false;
unsigned long nfcTimeoutStart = 0;
String lastCardUID = "";
unsigned long lastReadTime = 0;
bool qrDisplayActive = false;
unsigned long qrTimeoutStart = 0;
String currentQRCode = "";

// ============================================
// IMPLEMENTASI DEVICE STATE
// ============================================
bool deviceRegistered = false;
bool websocketConnected = false;
unsigned long lastHeartbeat = 0;
unsigned long lastCommandPoll = 0;
bool httpInitialized = false;
