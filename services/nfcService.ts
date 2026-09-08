// NFC Service using react-native-nfc-manager
import { PermissionsAndroid, Platform } from "react-native";
import NfcManager from "react-native-nfc-manager";

export interface NDEFRecord {
  id?: string;
  type: string;
  payload: string;
  timestamp: number;
}

export interface NFCData {
  id: string;
  records: NDEFRecord[];
  timestamp: number;
}

export class NFCService {
  static async isNFCSupported(): Promise<boolean> {
    try {
      return await NfcManager.isSupported();
    } catch (error) {
      console.error("Error checking NFC support:", error);
      return false;
    }
  }

  static async isNFCEnabled(): Promise<boolean> {
    try {
      // Start NFC manager first (required for API to work)
      await NfcManager.start();
      // Check if NFC is enabled on the device
      const enabled = await NfcManager.isEnabled();
      return enabled;
    } catch (error) {
      console.error("Error checking NFC enabled status:", error);
      return false;
    }
  }

  static async requestNFCPermission(): Promise<boolean> {
    try {
      // For Android, check NFC permission
      if (Platform.OS === "android") {
        // NFC permission is declared in AndroidManifest.xml
        // On most devices, NFC doesn't require runtime permission like camera/mic
        // The permission check here is for Android 12+ compatibility

        // Check Android version
        const androidVersion = Platform.Version as number;

        // For Android 12+ (API 31+), we might need to check for specific permissions
        if (androidVersion >= 31) {
          // Check if NFC permission is granted (using string literal as it's not in standard enum)
          const hasPermission = await PermissionsAndroid.check(
            "android.permission.NFC" as any,
          );

          if (hasPermission) {
            return true;
          }

          // Request permission for Android 12+
          const granted = await PermissionsAndroid.request(
            "android.permission.NFC" as any,
            {
              title: "NFC Permission",
              message:
                "This app needs NFC permission to read NFC cards for attendance.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK",
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        // For older Android versions, NFC is controlled by system settings, not runtime permission
        return true;
      }

      // For iOS, NFC permission is handled by the system
      return true;
    } catch (error) {
      console.error("Error requesting NFC permission:", error);
      // NFC permission might not be available on older Android versions
      // In that case, assume permission is granted (NFC is controlled by system settings)
      return true;
    }
  }

  static async checkNFCPermissions(): Promise<{
    supported: boolean;
    enabled: boolean;
    permissionGranted: boolean;
  }> {
    const supported = await this.isNFCSupported();
    const enabled = await this.isNFCEnabled();
    const permissionGranted = await this.requestNFCPermission();

    return {
      supported,
      enabled,
      permissionGranted,
    };
  }

  static async readNDEF(): Promise<NFCData | null> {
    try {
      // Check all prerequisites
      const { supported, enabled, permissionGranted } =
        await this.checkNFCPermissions();

      if (!supported) {
        throw new Error("NFC is not supported on this device");
      }

      if (!enabled) {
        throw new Error(
          "NFC is not enabled. Please enable NFC in device settings.",
        );
      }

      if (!permissionGranted) {
        throw new Error(
          "NFC permission is required. Please grant NFC permission to use this feature.",
        );
      }

      // Ensure NFC manager is started
      await NfcManager.start();

      // Register for tag events with proper configuration for Expo SDK 55
      await NfcManager.registerTagEvent({
        alertMessage: "Hold your NFC card near the device",
        invalidateAfterFirstRead: true,
      });

      // Wait for tag discovery with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          NfcManager.unregisterTagEvent().catch(() => {});
          reject(new Error("NFC reading timeout. Please try again."));
        }, 15000);

        // Set up event listener for tag discovery
        const handleTagDiscovered = (tag: any) => {
          clearTimeout(timeout);

          try {
            console.log("NFC Tag discovered:", tag);

            // Extract data from the tag
            const records: NDEFRecord[] = [];

            // Try to extract NDEF data if available
            if (tag.ndefMessage && Array.isArray(tag.ndefMessage)) {
              tag.ndefMessage.forEach((record: any, index: number) => {
                let payload = "";

                // Decode the payload based on TNF (Type Name Format)
                if (record.tnf === 1) {
                  // Well-known type
                  if (record.type === "T" || record.type === 0x54) {
                    // Text (handle both string "T" and hex 0x54)
                    // Decode text payload
                    const languageCodeLength = record.payload[0];
                    payload = String.fromCharCode(
                      ...record.payload.slice(languageCodeLength + 1),
                    );
                    console.log("NFC Text payload decoded:", payload);
                  } else if (record.type === "U") {
                    // URI
                    // Decode URI payload
                    const uriIdentifier = record.payload[0];
                    const uriPrefixes = [
                      "",
                      "http://www.",
                      "https://www.",
                      "http://",
                      "https://",
                      "tel:",
                      "mailto:",
                      "ftp://anonymous:anonymous@",
                      "ftp://ftp.",
                      "ftps://",
                      "sftp://",
                      "smb://",
                      "nfs://",
                      "ftp://",
                      "dav://",
                      "news:",
                      "res:",
                      "telnet://",
                      "imap:",
                      "rtsp://",
                      "urn:",
                      "pop:",
                      "sip:",
                      "sips:",
                      "tftp://",
                      "btspp://",
                      "btl2cap://",
                      "btgoep://",
                      "tcpobex://",
                      "irdaobex://",
                      "file://",
                      "urn:epc:id:",
                      "urn:epc:tag:",
                      "urn:epc:pat:",
                      "urn:epc:raw:",
                      "urn:epc:",
                      "urn:nfc:",
                    ];
                    payload =
                      uriPrefixes[uriIdentifier] +
                      String.fromCharCode(...record.payload.slice(1));
                  }
                } else if (record.tnf === 0) {
                  // Empty
                  payload = "";
                } else {
                  // For other types, try to decode as text
                  try {
                    payload = String.fromCharCode(...record.payload);
                    console.log("NFC Raw payload decoded as text:", payload);
                  } catch (e) {
                    payload = (record.payload as number[])
                      .map((b: number) => b.toString(16).padStart(2, "0"))
                      .join("");
                  }
                }

                records.push({
                  id: record.id || `record-${index}`,
                  type: this.getRecordType(record),
                  payload: payload,
                  timestamp: Date.now(),
                });
              });
            }

            // If no NDEF data, try to get raw tag data
            if (records.length === 0) {
              // Try to get tag ID
              if (tag.id) {
                const tagId = Array.isArray(tag.id)
                  ? (tag.id as number[])
                      .map((b: number) => b.toString(16).padStart(2, "0"))
                      .join(":")
                  : String(tag.id);
                records.push({
                  id: "tag-id",
                  type: "tag-id",
                  payload: tagId,
                  timestamp: Date.now(),
                });
              }

              // Try to get technology types if available
              if (tag.tech) {
                const techTypes = Array.isArray(tag.tech)
                  ? tag.tech.join(", ")
                  : String(tag.tech);
                records.push({
                  id: "tech-types",
                  type: "technology",
                  payload: techTypes,
                  timestamp: Date.now(),
                });
              }

              // For Mifare cards, try to get additional data
              if (
                tag.tech &&
                (String(tag.tech).includes("mifare") ||
                  String(tag.tech).includes("iso14443"))
              ) {
                records.push({
                  id: "card-type",
                  type: "card-info",
                  payload: "Mifare/ISO14443 Card Detected",
                  timestamp: Date.now(),
                });
              }
            }

            // If still no records, create a basic record
            if (records.length === 0) {
              records.push({
                id: "raw-tag",
                type: "raw",
                payload: JSON.stringify(tag),
                timestamp: Date.now(),
              });
            }

            const nfcData: NFCData = {
              id: tag.id
                ? Array.isArray(tag.id)
                  ? (tag.id as number[])
                      .map((b: number) => b.toString(16).padStart(2, "0"))
                      .join("")
                  : String(tag.id)
                : `nfc-tag-${Date.now()}`,
              timestamp: Date.now(),
              records,
            };

            resolve(nfcData);
          } catch (parseError) {
            console.error("Error parsing NFC tag:", parseError);
            reject(new Error(`Failed to parse NFC data: ${parseError}`));
          } finally {
            NfcManager.unregisterTagEvent().catch(() => {});
          }
        };

        // Register the event listener using any to avoid TypeScript issues
        (NfcManager as any).setEventListener(
          "tagDiscovered",
          handleTagDiscovered,
        );
      });
    } catch (error) {
      console.error("Error reading NDEF:", error);
      try {
        await NfcManager.unregisterTagEvent();
      } catch (stopError) {
        console.error("Error stopping NFC:", stopError);
      }
      throw error;
    }
  }

  private static getRecordType(record: any): string {
    if (record.tnf === 1) {
      if (record.type === "T") return "text";
      if (record.type === "U") return "uri";
      return "well-known";
    }
    if (record.tnf === 0) return "empty";
    if (record.tnf === 2) return "mime";
    if (record.tnf === 3) return "absolute-uri";
    return "unknown";
  }

  static formatNFCData(data: NFCData): string {
    if (data.records.length === 0) {
      return "No data found";
    }

    const formattedRecords = data.records.map((record) => {
      if (record.type === "T" || record.type === "text/plain") {
        return `Text: ${record.payload}`;
      } else if (record.type === "U" || record.type === "uri") {
        return `URI: ${record.payload}`;
      } else {
        return `${record.type}: ${record.payload}`;
      }
    });

    return formattedRecords.join("\n");
  }

  static validateArduinoRoomData(payload: string): {
    roomCode: string;
    building: string;
    floor: number;
    description: string;
  } | null {
    // Check for Arduino room payload format: "B407|B|4|Ruang B407"
    if (payload.includes("|")) {
      const parts = payload.split("|");
      if (parts.length >= 4) {
        try {
          const roomData = {
            roomCode: parts[0].trim(),
            building: parts[1].trim(),
            floor: parseInt(parts[2].trim(), 10),
            description: parts[3].trim(),
          };

          // Validate the data
          if (
            roomData.roomCode &&
            roomData.building &&
            !isNaN(roomData.floor)
          ) {
            console.log("Arduino room data validated:", roomData);
            return roomData;
          }
        } catch (error) {
          console.error("Error validating Arduino room data:", error);
        }
      }
    }
    return null;
  }

  static extractRoomData(data: NFCData): {
    roomCode: string;
    building: string;
    floor: number;
    description: string;
  } | null {
    // Try to extract room data from NDEF records
    for (const record of data.records) {
      const payload = record.payload.trim();

      // First try Arduino-specific validation
      const arduinoData = this.validateArduinoRoomData(payload);
      if (arduinoData) {
        return arduinoData;
      }

      // Check for other pipe-separated formats
      if (payload.includes("|")) {
        const parts = payload.split("|");
        if (parts.length >= 4) {
          try {
            return {
              roomCode: parts[0].trim(),
              building: parts[1].trim(),
              floor: parseInt(parts[2].trim(), 10),
              description: parts[3].trim(),
            };
          } catch (error) {
            console.error("Error parsing room data:", error);
          }
        }
      }

      // Check for JSON room data
      try {
        const parsed = JSON.parse(payload);
        if (parsed.roomCode && parsed.building && parsed.floor) {
          return {
            roomCode: parsed.roomCode,
            building: parsed.building,
            floor: parsed.floor,
            description: parsed.description || "",
          };
        }
      } catch {
        // Not JSON, continue
      }
    }

    return null;
  }

  static extractStudentId(data: NFCData): string | null {
    // Try to extract student ID from NDEF records
    for (const record of data.records) {
      const payload = record.payload.trim();

      // Check if payload looks like a student ID (numeric, 8-12 digits)
      if (/^\d{8,12}$/.test(payload)) {
        return payload;
      }

      // Check for common student ID patterns
      const studentIdMatch = payload.match(/\b\d{8,12}\b/);
      if (studentIdMatch) {
        return studentIdMatch[0];
      }

      // Check for JSON with student ID
      try {
        const parsed = JSON.parse(payload);
        if (parsed.studentId || parsed.id || parsed.userId) {
          return parsed.studentId || parsed.id || parsed.userId;
        }
      } catch {
        // Not JSON, continue
      }
    }

    return null;
  }

  static async stop(): Promise<void> {
    try {
      await NfcManager.unregisterTagEvent();
      console.log("[NFC] NFC reading stopped");
    } catch (error) {
      console.error("[NFC] Error stopping NFC:", error);
    }
  }

  static getPermissionErrorMessage(error: any): string {
    if (error.message.includes("not supported")) {
      return "Your device does not support NFC. This feature requires an NFC-enabled device.";
    }
    if (error.message.includes("not enabled")) {
      return "NFC is disabled. Please enable NFC in your device settings.";
    }
    if (error.message.includes("permission")) {
      return "NFC permission is required. Please grant permission when prompted.";
    }
    return error.message || "NFC operation failed";
  }
}
