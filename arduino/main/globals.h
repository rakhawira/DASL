#ifndef GLOBALS_H
#define GLOBALS_H

#include "config.h"
#include <TFT_eSPI.h>

// ============================================
// OBJECTS
// ============================================
extern TFT_eSPI tft;
extern WebSocketsClient webSocket;
extern Adafruit_PN532 nfc;
extern HTTPClient http;
extern WiFiClientSecure *client;

// ============================================
// SESSION DATA
// ============================================
extern String currentUsername;
extern String currentName;
extern String currentCommandId;
extern bool nfcReadingActive;
extern unsigned long nfcTimeoutStart;
extern String lastCardUID;
extern unsigned long lastReadTime;
extern bool qrDisplayActive;
extern unsigned long qrTimeoutStart;
extern String currentQRCode;

// ============================================
// DEVICE STATE
// ============================================
extern bool deviceRegistered;
extern bool websocketConnected;
extern unsigned long lastHeartbeat;
extern unsigned long lastCommandPoll;
extern bool httpInitialized;

#endif
