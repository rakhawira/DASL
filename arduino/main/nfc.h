#ifndef NFC_H
#define NFC_H

#include "globals.h"

// ============================================
// FUNGSI NFC
// ============================================
void initNFC();
void startNFCReading(const String& username, const String& name);
void handleNFCReading();
void handleNFCTimeout();

#endif
