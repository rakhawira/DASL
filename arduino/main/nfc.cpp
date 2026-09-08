#include "nfc.h"
#include "websocket.h"
#include "api.h"

void initNFC() {
    Serial.println("Initializing PN532 NFC reader...");
    nfc.begin();
    
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (!versiondata) {
        Serial.print("Didn't find PN53x board");
        while (1);
    }
    
    Serial.print("Found chip PN5");
    Serial.println((versiondata >> 24) & 0xFF, HEX);
    Serial.print("Firmware ver. ");
    Serial.print((versiondata >> 16) & 0xFF, DEC);
    Serial.print('.');
    Serial.println((versiondata >> 8) & 0xFF, DEC);
    nfc.SAMConfig();
}

void startNFCReading(const String& username, const String& name) {
    if (nfcReadingActive) {
        Serial.println("[NFC] Reading already active, ignoring request");
        return;
    }
    
    currentUsername = username;
    currentName = name;
    nfcReadingActive = true;
    nfcTimeoutStart = millis();
    
    Serial.println("[NFC] Starting reading session for user: " + name + " (" + username + ")");
    sendNFCAcknowledgment(username, name);
}

void handleNFCReading() {
    uint8_t success;
    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;

    success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 100);

    if (success) {
        String uidString = "";
        for (uint8_t i = 0; i < uidLength; i++) {
            if (uid[i] < 0x10) uidString += "0";
            uidString += String(uid[i], HEX);
        }
        uidString.toUpperCase();

        // Anti-rebounce: cek apakah kartu sama dibaca dalam waktu debounce
        if (uidString == lastCardUID && (millis() - lastReadTime) < NFC_DEBOUNCE_TIME) {
            Serial.println("[NFC] Duplicate read ignored (debounce)");
            return;
        }

        Serial.println("\n=== NFC Card Detected! ===");
        Serial.print("UID: ");
        Serial.println(uidString);

        // Update anti-rebounce state
        lastCardUID = uidString;
        lastReadTime = millis();

        nfcReadingActive = false;

        // Send to Backend API first (always works)
        sendAttendanceToBackend(true, uidString);

        // Then send WebSocket notification (best effort)
        sendAttendanceResult(true, uidString);

        Serial.println("=== NFC Reading Complete ===\n");
    }
}

void handleNFCTimeout() {
    DynamicJsonDocument doc(512);
    doc["type"] = "nfc_timeout";
    JsonObject data = doc.createNestedObject("data");
    data["deviceId"] = DEVICE_ID;
    data["username"] = currentUsername;
    data["name"] = currentName;
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    Serial.println("[WebSocket] NFC timeout sent");
}
