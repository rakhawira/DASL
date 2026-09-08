#include "display.h"
#include "globals.h"
#include "config.h"

void initDisplay() {
    Serial.println("Initializing TFT Display...");
    tft.init();
    tft.setRotation(0);
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setTextFont(4);
    tft.setTextDatum(MC_DATUM);

    tft.drawString("Display Ready", tft.width() / 2, tft.height() / 2);
    delay(3000);

    tft.fillScreen(TFT_BLACK);
    tft.drawString(DEVICE_NAME, tft.width() / 2, tft.height() / 2);

    Serial.println("TFT Display initialized. Size: " + String(tft.width()) + "x" + String(tft.height()));
}

void clearScreen() {
    tft.fillScreen(TFT_WHITE);
}

void showQRCode(const char *text) {
    QRCode qrcode;
    uint8_t qrcodeData[qrcode_getBufferSize(3)];

    int8_t result = qrcode_initText(&qrcode, qrcodeData, 3, ECC_LOW, text);
    if (result != 0) {
        Serial.println("Failed to generate QR code");
        return;
    }

    int margin = 20;
    int scale = (240 - margin) / qrcode.size;
    int qrSize = qrcode.size * scale;
    int offsetX = (240 - qrSize) / 2;
    int offsetY = (240 - qrSize) / 2;

    clearScreen();

    for (int y = 0; y < qrcode.size; y++) {
        for (int x = 0; x < qrcode.size; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
                tft.fillRect(
                    offsetX + x * scale,
                    offsetY + y * scale,
                    scale,
                    scale,
                    TFT_BLACK
                );
            }
        }
    }
}

void startQRDisplay(const String& qrCode) {
    if (qrDisplayActive) {
        Serial.println("[Display] QR display already active, ignoring request");
        return;
    }

    currentQRCode = qrCode;
    qrDisplayActive = true;
    qrTimeoutStart = millis();

    Serial.println("[Display] Starting QR display for code: " + qrCode);
    showQRCode(qrCode.c_str());
}
