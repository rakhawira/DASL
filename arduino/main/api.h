#ifndef API_H
#define API_H

#include "globals.h"

// ============================================
// FUNGSI API/HTTP
// ============================================
void registerDevice();
void initializeHttpClient();
void sendHeartbeat();
void pollForCommands();
void acknowledgeCommand(const String& commandId);
void sendAttendanceToBackend(bool success, const String& uid);
void startQRDisplay(const String& qrCode);

#endif
