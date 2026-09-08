#ifndef WEBSOCKET_H
#define WEBSOCKET_H

#include "globals.h"

// ============================================
// FUNGSI WEBSOCKET
// ============================================
void setupWebSocket();
void sendDeviceRegistration();
void handleWebSocketMessage(const String& message);
void sendNFCAcknowledgment(const String& username, const String& name);
void sendQRAcknowledgment(const String& qrCode, const String& username, const String& name);
void sendAttendanceResult(bool success, const String& uid);
void handleQRReset();
void handleQRTimeout();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);

#endif
