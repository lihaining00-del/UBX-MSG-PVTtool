import { NavPvtData, ParseResult } from '../types';

// UBX Constants
const SYNC_CHAR_1 = 0xB5;
const SYNC_CHAR_2 = 0x62;
const CLASS_NAV = 0x01;
const ID_PVT = 0x07;
const NAV_PVT_PAYLOAD_LENGTH = 92;
const TOTAL_PACKET_LENGTH = 100; // 6 (Header) + 92 (Payload) + 2 (Checksum)

export const cleanHexString = (input: string): string => {
  return input.replace(/[\s,0x:h]/gi, '').toUpperCase();
};

const hexToBytes = (hex: string): Uint8Array | null => {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const validateChecksum = (bytes: Uint8Array, length: number): boolean => {
  let ck_a = 0;
  let ck_b = 0;
  // Checksum calculation starts after sync chars (index 2) and ends before checksum bytes (last 2)
  for (let i = 2; i < length - 2; i++) {
    ck_a = (ck_a + bytes[i]) & 0xFF;
    ck_b = (ck_b + ck_a) & 0xFF;
  }
  
  return ck_a === bytes[length - 2] && ck_b === bytes[length - 1];
};

// Extract the decoding logic to reuse between string parser and file parser
const decodeNavPvtPayload = (view: DataView, offset: number, rawHex: string): NavPvtData => {
  // Payload starts at offset + 6 (Header 2 + Class 1 + ID 1 + Len 2)
  const p = offset + 6; 

  const iTOW = view.getUint32(p + 0, true);
  const year = view.getUint16(p + 4, true);
  const month = view.getUint8(p + 6);
  const day = view.getUint8(p + 7);
  const hour = view.getUint8(p + 8);
  const min = view.getUint8(p + 9);
  const sec = view.getUint8(p + 10);
  const valid = view.getUint8(p + 11);
  const tAcc = view.getUint32(p + 12, true);
  const nano = view.getInt32(p + 16, true);
  const fixType = view.getUint8(p + 20);
  const flags = view.getUint8(p + 21);
  // skipped flags2 (p+22)
  const numSV = view.getUint8(p + 23);
  const lon = view.getInt32(p + 24, true) * 1e-7;
  const lat = view.getInt32(p + 28, true) * 1e-7;
  const height = view.getInt32(p + 32, true); // mm
  const hMSL = view.getInt32(p + 36, true); // mm
  const hAcc = view.getUint32(p + 40, true); // mm
  const vAcc = view.getUint32(p + 44, true); // mm
  const velN = view.getInt32(p + 48, true);
  const velE = view.getInt32(p + 52, true);
  const velD = view.getInt32(p + 56, true);
  const gSpeed = view.getInt32(p + 60, true);
  const headMot = view.getInt32(p + 64, true) * 1e-5;
  const sAcc = view.getUint32(p + 68, true);
  const headAcc = view.getUint32(p + 72, true) * 1e-5;
  const pDOP = view.getUint16(p + 76, true) * 0.01;

  return {
    iTOW, year, month, day, hour, min, sec, valid, tAcc, nano,
    fixType, flags, numSV, lon, lat, height, hMSL, hAcc, vAcc,
    velN, velE, velD, gSpeed, headMot, sAcc, headAcc, pDOP,
    timestamp: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`,
    rawHex: rawHex
  };
};

/**
 * Parses a single Hex String (e.g. from Text Input)
 */
export const parseNavPvt = (hexInput: string): ParseResult => {
  const cleanHex = cleanHexString(hexInput);
  
  if (cleanHex.length < TOTAL_PACKET_LENGTH * 2) {
    return { success: false, error: "Input too short for a complete UBX-NAV-PVT message." };
  }

  const bytes = hexToBytes(cleanHex);
  if (!bytes) {
    return { success: false, error: "Invalid hexadecimal string." };
  }

  // Search for Preamble
  let startIndex = -1;
  for(let i=0; i < bytes.length - 1; i++) {
    if (bytes[i] === SYNC_CHAR_1 && bytes[i+1] === SYNC_CHAR_2) {
       if (bytes.length > i + 3 && bytes[i+2] === CLASS_NAV && bytes[i+3] === ID_PVT) {
         startIndex = i;
         break;
       }
    }
  }

  if (startIndex === -1) {
    return { success: false, error: "UBX-NAV-PVT Header (0xB5 0x62 0x01 0x07) not found." };
  }

  const packetBytes = bytes.slice(startIndex, startIndex + TOTAL_PACKET_LENGTH);
  
  if (packetBytes.length !== TOTAL_PACKET_LENGTH) {
      return { success: false, error: "Incomplete packet length." };
  }

  if (!validateChecksum(packetBytes, TOTAL_PACKET_LENGTH)) {
    return { success: false, error: "Checksum validation failed." };
  }

  const view = new DataView(packetBytes.buffer);
  const data = decodeNavPvtPayload(view, 0, cleanHex.substring(startIndex * 2, (startIndex + TOTAL_PACKET_LENGTH) * 2));

  return { success: true, data };
};

/**
 * Parses a binary ArrayBuffer (e.g. from File Upload) searching for all NAV-PVT packets
 */
export const parseBinaryUbx = (buffer: ArrayBuffer): NavPvtData[] => {
  const bytes = new Uint8Array(buffer);
  const results: NavPvtData[] = [];
  const view = new DataView(buffer);
  
  let i = 0;
  while (i <= bytes.length - TOTAL_PACKET_LENGTH) {
    // Look for Sync Chars 0xB5 0x62
    if (bytes[i] === SYNC_CHAR_1 && bytes[i+1] === SYNC_CHAR_2) {
      // Check Class (0x01) and ID (0x07)
      if (bytes[i+2] === CLASS_NAV && bytes[i+3] === ID_PVT) {
        
        // Potential candidate found. Extract packet.
        const packetBytes = bytes.slice(i, i + TOTAL_PACKET_LENGTH);
        
        // Validate Checksum
        if (validateChecksum(packetBytes, TOTAL_PACKET_LENGTH)) {
          // Convert this slice to hex string for reference (optional, but requested in type)
          let hexStr = "";
          for(let k=0; k<TOTAL_PACKET_LENGTH; k++) {
             hexStr += bytes[i+k].toString(16).padStart(2, '0').toUpperCase();
          }

          // We pass the MAIN DataView, but with the current offset 'i'
          const data = decodeNavPvtPayload(view, i, hexStr);
          results.push(data);
          
          // Move pointer by packet length
          i += TOTAL_PACKET_LENGTH;
          continue;
        }
      }
    }
    // If not found or invalid, move forward one byte
    i++;
  }
  
  return results;
};