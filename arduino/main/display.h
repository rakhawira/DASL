#ifndef DISPLAY_H
#define DISPLAY_H

#include <TFT_eSPI.h>
#include "qrcode.h"

void initDisplay();
void showQRCode(const char *text);
void clearScreen();
void startQRDisplay(const String& qrCode);

#endif
