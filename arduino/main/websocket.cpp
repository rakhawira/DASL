#include "websocket.h"
#include "nfc.h"
#include "display.h"
#include "globals.h"

void setupWebSocket() {
    if (websocketConnected) {
        Serial.println("[WebSocket] Already connected, checking connection health...");
        
        if (webSocket.isConnected()) {
            Serial.println("[WebSocket] Connection still alive, skipping setup");
            return;
        } else {
            Serial.println("[WebSocket] Connection lost, forcing reconnection...");
            websocketConnected = false;
            webSocket.disconnect();
        }
    }
    
    WiFiClientSecure *wsClient = new WiFiClientSecure();
    wsClient->setInsecure();
    
    webSocket.beginSSL(WEBSOCKET_HOST, WEBSOCKET_PORT, "/");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(10000);
    webSocket.enableHeartbeat(30000, 3000, 2);
    
    Serial.println("[WebSocket] Connection configured, attempting to connect...");
}

void sendDeviceRegistration() {
    DynamicJsonDocument doc(1024);
    
    doc["type"] = "device_register";
    doc["deviceId"] = DEVICE_ID;
    
    JsonObject data = doc.createNestedObject("data");
    data["device_id"] = DEVICE_ID;
    data["device_name"] = DEVICE_NAME;
    data["location"] = DEVICE_LOCATION;
    data["ip_address"] = WiFi.localIP().toString();
    data["mac_address"] = WiFi.macAddress();
    data["firmware_version"] = FIRMWARE_VERSION;
    data["nfcReady"] = true;
    data["status"] = "online";
    
    String message;
    serializeJson(doc, message);
    
    webSocket.sendTXT(message);
    Serial.println("[WebSocket] Device registration sent");
}

void handleWebSocketMessage(const String& message) {
    DynamicJsonDocument doc(1024);
    
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
        Serial.println("[WebSocket] Failed to parse JSON");
        return;
    }
    
    String type = doc["type"];
    
    if (type == "nfc_trigger") {
        JsonObject userData = doc["userData"];
        String username = userData["username"];
        String name = userData["name"];
        startNFCReading(username, name);
    } else if (type == "qr_trigger") {
        // Handle QR trigger from WebSocket
        JsonObject data = doc["data"];
        String qrCode = data["qrCode"];
        String username = data["username"];
        String name = data["name"];
        
        Serial.println("[WebSocket] QR trigger received");
        Serial.println("[WebSocket] QR Code: " + qrCode);
        Serial.println("[WebSocket] User: " + username + " (" + name + ")");
        
        // Set QR state
        currentUsername = username;
        currentName = name;
        currentQRCode = qrCode;
        qrDisplayActive = true;
        qrTimeoutStart = millis();
        
        // Display QR code on TFT screen
        showQRCode(qrCode.c_str());
        
        // Send QR acknowledgment
        sendQRAcknowledgment(qrCode, username, name);
    } else if (type == "welcome") {
        Serial.println("[WebSocket] Welcome message received");
        sendDeviceRegistration();
    } else if (type == "register_success") {
        deviceRegistered = true;
        Serial.println("[WebSocket] Device registration confirmed");
    } else if (type == "registration_error") {
        Serial.println("[WebSocket] Device registration failed");
    } else if (type == "command") {
        // Handle command messages
        String action = doc["action"];
        
        if (action == "reset_display") {
            Serial.println("[WebSocket] Reset display command received");
            handleQRReset();
        }
    }
}

void sendNFCAcknowledgment(const String& username, const String& name) {
    DynamicJsonDocument doc(512);
    doc["type"] = "nfc_ack";
    doc["deviceId"] = DEVICE_ID;
    JsonObject data = doc.createNestedObject("data");
    data["deviceId"] = DEVICE_ID;
    data["success"] = true;
    data["username"] = username;
    data["name"] = name;
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    Serial.println("[WebSocket] NFC acknowledgment sent");
}

void sendQRAcknowledgment(const String& qrCode, const String& username, const String& name) {
    DynamicJsonDocument doc(512);
    doc["type"] = "qr_ack";
    doc["deviceId"] = DEVICE_ID;
    JsonObject data = doc.createNestedObject("data");
    data["deviceId"] = DEVICE_ID;
    data["success"] = true;
    data["qrCode"] = qrCode;
    data["username"] = username;
    data["name"] = name;
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    Serial.println("[WebSocket] QR acknowledgment sent");
}

void sendAttendanceResult(bool success, const String& uid) {
    if (!webSocket.isConnected()) {
        Serial.println("[WebSocket] Attendance result will be handled by backend API polling");
        return;
    }

    DynamicJsonDocument doc(1024);

    doc["type"] = "nfc_result";
    doc["deviceId"] = DEVICE_ID;

    JsonObject data = doc.createNestedObject("data");
    data["deviceId"] = DEVICE_ID;
    data["success"] = success;

    if (success) {
        JsonObject attendanceData = data.createNestedObject("attendanceData");
        attendanceData["username"] = currentUsername;
        attendanceData["name"] = currentName;
        attendanceData["status"] = "present";
        attendanceData["location"] = DEVICE_LOCATION;
        attendanceData["deviceName"] = DEVICE_NAME;
        attendanceData["ipAddress"] = WiFi.localIP().toString();
        attendanceData["timestamp"] = millis();
        attendanceData["deviceUID"] = uid;
        attendanceData["deviceId"] = DEVICE_ID;
    }

    String message;
    serializeJson(doc, message);
    Serial.println("[WebSocket] Sending message to server:");
    Serial.println(message);

    webSocket.sendTXT(message);
    Serial.println("[WebSocket] NFC result sent");
}

void handleQRReset() {
    Serial.println("[WebSocket] Resetting QR display");
    
    // Reset QR state
    qrDisplayActive = false;
    currentQRCode = "";
    currentUsername = "";
    currentName = "";
    
    // Clear screen and show device name
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setTextDatum(MC_DATUM);
    tft.drawString(DEVICE_NAME, tft.width() / 2, tft.height() / 2);
    
    Serial.println("[WebSocket] QR display reset complete");
}

void handleQRTimeout() {
    DynamicJsonDocument doc(512);
    doc["type"] = "qr_timeout";
    JsonObject data = doc.createNestedObject("data");
    data["deviceId"] = DEVICE_ID;
    data["qrCode"] = currentQRCode;
    data["username"] = currentUsername;
    data["name"] = currentName;
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    // Reset QR state and display
    handleQRReset();
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("[WebSocket] Disconnected from server");
            websocketConnected = false;
            deviceRegistered = false;
            http.end();
            httpInitialized = false;
            break;
            
        case WStype_CONNECTED:
            Serial.println("[WebSocket] Connected to server");
            websocketConnected = true;
            
            if (!deviceRegistered) {
                Serial.println("[WebSocket] Sending device registration...");
                sendDeviceRegistration();
            } else {
                Serial.println("[WebSocket] Device already registered, skipping registration");
            }
            break;
            
        case WStype_TEXT:
            Serial.printf("[WebSocket] Received text: %s\n", payload);
            handleWebSocketMessage(String((char*)payload));
            break;
            
        case WStype_BIN:
            Serial.println("[WebSocket] Received binary data");
            break;
            
        default:
            break;
    }
}
