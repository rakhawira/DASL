#include "api.h"

void registerDevice() {
    HTTPClient httpClient;
    String url = String(BACKEND_URL) + "/api/devices/register";
    
    WiFiClientSecure *apiClient = new WiFiClientSecure();
    apiClient->setInsecure();
    httpClient.begin(*apiClient, url);
    httpClient.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(256);
    doc["device_id"] = DEVICE_ID;
    doc["device_name"] = DEVICE_NAME;
    doc["location"] = DEVICE_LOCATION;
    doc["ip_address"] = WiFi.localIP().toString();
    doc["mac_address"] = WiFi.macAddress();
    doc["firmware_version"] = FIRMWARE_VERSION;
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("[Backend] Registering device to: " + url);
    Serial.println("[Backend] Payload: " + payload);
    
    int httpResponseCode = httpClient.POST(payload);
    
    if (httpResponseCode > 0) {
        String response = httpClient.getString();
        Serial.println("[Backend] Device registered successfully");
        Serial.println("Response: " + response);
        deviceRegistered = true;
    } else {
        Serial.println("[Backend] Error registering device: " + httpClient.errorToString(httpResponseCode));
        Serial.println("[Backend] Response code: " + String(httpResponseCode));
    }
    
    httpClient.end();
    delete apiClient;
}

void initializeHttpClient() {
    if (!httpInitialized) {
        client = new WiFiClientSecure();
        client->setInsecure();
        http.begin(*client, String(BACKEND_URL) + "/api/devices/" + DEVICE_ID + "/heartbeat");
        http.addHeader("Content-Type", "application/json");
        httpInitialized = true;
        Serial.println("[Backend] HTTP client initialized for reuse");
    }
}

void sendHeartbeat() {
    HTTPClient httpClient;
    WiFiClientSecure *hbClient = new WiFiClientSecure();
    hbClient->setInsecure();
    
    String url = String(BACKEND_URL) + "/api/devices/" + DEVICE_ID + "/heartbeat";
    httpClient.begin(*hbClient, url);
    httpClient.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(512);
    doc["ip_address"] = WiFi.localIP().toString();
    doc["status"] = nfcReadingActive ? "in_use" : "online";
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("[Backend] Sending heartbeat: " + payload);
    Serial.println("[Backend] URL: " + url);
    
    int httpResponseCode = httpClient.POST(payload);
    
    if (httpResponseCode > 0) {
        String response = httpClient.getString();
        Serial.println("[Backend] Heartbeat successful - Response: " + response);
    } else {
        Serial.println("[Backend] Heartbeat failed: " + httpClient.errorToString(httpResponseCode));
        Serial.println("[Backend] Response code: " + String(httpResponseCode));
    }
    
    httpClient.end();
    delete hbClient;
}

void pollForCommands() {
    HTTPClient httpClient;
    String url = String(BACKEND_URL) + "/api/devices/" + DEVICE_ID + "/commands/pending";
    
    WiFiClientSecure *cmdClient = new WiFiClientSecure();
    cmdClient->setInsecure();
    httpClient.begin(*cmdClient, url);
    
    int httpResponseCode = httpClient.GET();
    
    if (httpResponseCode == 200) {
        String response = httpClient.getString();
        
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, response);
        
        if (!error && doc["success"]) {
            JsonArray commands = doc["data"]["commands"];
            
            for (JsonObject command : commands) {
                String commandType = command["type"];
                
                if (commandType == "start_nfc_reading") {
                    JsonObject commandData = command["data"];
                    extern void startNFCReading(const String& username, const String& name);
                    startNFCReading(commandData["username"], commandData["name"]);
                    acknowledgeCommand(command["id"]);
                } else if (commandType == "start_qr_display") {
                    JsonObject commandData = command["data"];
                    String qrCode = commandData["qrCode"];
                    extern void startQRDisplay(const String& qrCode);
                    startQRDisplay(qrCode);
                    acknowledgeCommand(command["id"]);
                }
            }
        } else {
            Serial.println("[Backend] Error parsing commands response");
            Serial.println("Response: " + response);
        }
    } else if (httpResponseCode != 404) {
        Serial.println("[Backend] Error polling commands: " + String(httpResponseCode) + " - " + httpClient.errorToString(httpResponseCode));
        String response = httpClient.getString();
        Serial.println("Response: " + response);
    }
    
    httpClient.end();
    delete cmdClient;
}

void acknowledgeCommand(const String& commandId) {
    HTTPClient httpClient;
    String url = String(BACKEND_URL) + "/api/devices/" + DEVICE_ID + "/commands/" + commandId + "/acknowledge";
    
    WiFiClientSecure *ackClient = new WiFiClientSecure();
    ackClient->setInsecure();
    httpClient.begin(*ackClient, url);
    httpClient.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(256);
    doc["device_id"] = DEVICE_ID;
    doc["command_id"] = commandId;
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("[Backend] Acknowledging command: " + commandId);
    Serial.println("[Backend] URL: " + url);
    Serial.println("[Backend] Payload: " + payload);
    
    int httpResponseCode = httpClient.POST(payload);
    
    if (httpResponseCode > 0) {
        Serial.println("[Backend] Command acknowledged: " + commandId);
    } else {
        Serial.println("[Backend] Error acknowledging command: " + String(httpResponseCode) + " - " + httpClient.errorToString(httpResponseCode));
        String response = httpClient.getString();
        Serial.println("[Backend] Response: " + response);
    }
    
    httpClient.end();
    delete ackClient;
}

void sendAttendanceToBackend(bool success, const String& uid) {
    if (!success) return;
    
    HTTPClient httpClient;
    String url = String(BACKEND_URL) + "/api/nfc/process-reading";
    
    WiFiClientSecure *attClient = new WiFiClientSecure();
    attClient->setInsecure();
    httpClient.begin(*attClient, url);
    httpClient.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(1024);
    doc["device_id"] = DEVICE_ID;
    doc["nfc_data"] = uid;
    doc["username"] = currentUsername;
    doc["name"] = currentName;
    doc["timestamp"] = millis();
    
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("[Backend] Sending NFC attendance to: " + url);
    Serial.println("[Backend] Payload: " + payload);
    
    int httpResponseCode = httpClient.POST(payload);
    
    if (httpResponseCode > 0) {
        String response = httpClient.getString();
        Serial.println("[Backend] NFC attendance logged successfully");
        Serial.println("Response: " + response);
    } else {
        Serial.println("[Backend] Error logging NFC attendance: " + httpClient.errorToString(httpResponseCode));
        Serial.println("[Backend] Response code: " + String(httpResponseCode));
    }
    
    httpClient.end();
    delete attClient;
}
