#include "config.h"
#include "globals.h"
#include "nfc.h"
#include "websocket.h"
#include "api.h"
#include "display.h"

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("Program Start");
    Serial.println("==============================");
    Serial.println("Device ID: " + DEVICE_ID);
    
    Wire.begin(PN532_SDA, PN532_SCL);
    initDisplay();
    initNFC();
    connectWiFi();
    setupWebSocket();
    registerDevice();
    initializeHttpClient();
    
    Serial.println("Setup completed. Device ready for operation.");
}

void loop() {
    if (WiFi.status() == WL_CONNECTED) {
        webSocket.loop();
        
        if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
            sendHeartbeat();
            lastHeartbeat = millis();
        }
        
        if (millis() - lastCommandPoll > COMMAND_POLL_INTERVAL) {
            pollForCommands();
            lastCommandPoll = millis();
        }
        
        if (nfcReadingActive) {
            handleNFCReading();

            if (millis() - nfcTimeoutStart > NFC_READING_TIMEOUT) {
                Serial.println("NFC reading timeout - no card detected");
                handleNFCTimeout();
                nfcReadingActive = false;
                currentUsername = "";
                currentName = "";
            }
        }
        
        if (qrDisplayActive) {
            if (millis() - qrTimeoutStart > QR_DISPLAY_TIMEOUT) {
                handleQRTimeout();
                qrDisplayActive = false;
                currentUsername = "";
                currentName = "";
                currentQRCode = "";
            }
        }
        
        delay(100);
    } else {
        reconnectWiFi();
    }
}

void connectWiFi() {
    Serial.println("\nConnecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
}

void reconnectWiFi() {
    Serial.println("WiFi connection lost. Attempting to reconnect...");
    
    WiFi.disconnect();
    delay(1000);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    WiFi.setTxPower(WIFI_POWER_19_5dBm);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("Reconnected to WiFi!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        setupWebSocket();
    } else {
        Serial.println();
        Serial.println("Failed to reconnect. Will try again...");
    }
}
