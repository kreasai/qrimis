/**
 * CRC16-CCITT (0xFFFF) Implementation
 * Polynomial: 0x1021
 */
function crc16ccitt(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = (crc << 1);
      }
    }
  }

  // Ensure 16-bit unsigned integer and format as 4-char hex
  const hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

/**
 * Parses a raw QRIS string to extract Merchant Name (Tag 59)
 */
export function getMerchantName(payload: string): string {
  try {
    let index = 0;
    while (index < payload.length) {
      const id = payload.substring(index, index + 2);
      const length = parseInt(payload.substring(index + 2, index + 4));
      const value = payload.substring(index + 4, index + 4 + length);

      if (id === '59') {
        return value;
      }
      index += 4 + length;
    }
  } catch (e) {
    console.error("Error parsing QRIS merchant name", e);
  }
  return "Unknown Merchant";
}

/**
 * Converts a static QRIS payload to a dynamic one with a specific amount.
 */
export function convertToDynamicQRIS(payload: string, amount: number): string {
  let parts: { id: string; length: number; value: string }[] = [];
  let index = 0;
  
  // 1. Deconstruct the payload
  while (index < payload.length) {
    const id = payload.substring(index, index + 2);
    const lenStr = payload.substring(index + 2, index + 4);
    const length = parseInt(lenStr);
    const value = payload.substring(index + 4, index + 4 + length);
    
    parts.push({ id, length, value });
    index += 4 + length;
  }

  // 2. Modify parts
  // Change Point of Initiation Method (01) to '12' (Dynamic)
  // If '01' exists, update it. If not, this might be a malformed QRIS, but strictly speaking it should be there.
  const pointOfInitiation = parts.find(p => p.id === '01');
  if (pointOfInitiation) {
    pointOfInitiation.value = '12'; // Set to Dynamic
  }

  // Remove existing Amount (54) if any, and CRC (63)
  parts = parts.filter(p => p.id !== '54' && p.id !== '63');

  // Add new Amount (54)
  // Tag 54 is Transaction Amount
  const amountStr = amount.toString();
  parts.push({
    id: '54',
    length: amountStr.length,
    value: amountStr
  });

  // Sort parts? Strictly speaking, EMVCo recommends ordering, but usually appending works if CRC is last.
  // However, Tag 63 MUST be the last TLV.
  // Tag 54 usually comes after 53 (Currency). Let's just insert it and rely on the parser to re-serialize.
  // To be safe, let's sort by ID slightly, or just keep original order + append 54 + append 63.
  // Re-ordering entire array by ID is risky if there are dependencies on order (mostly not, but standard says 63 is last).
  // We will assume the original order was fine, and we just injected 54. 
  // Let's sort: Standard mandates specific ranges, but usually ID ascending works except for specific template usages.
  // Safest: Keep original relative order, put 54 before 58/59 if possible, or just append before CRC.
  
  // Let's simplify: Filter out 63. Add 54. Serialize. Calculate CRC. Append 63.
  // We already filtered 63 and 54.
  
  // Determine injection point for 54 (Amount). Usually after 53 (Currency 360).
  const currencyIndex = parts.findIndex(p => p.id === '53');
  if (currencyIndex !== -1) {
    // Insert after currency
    const amountPart = parts.pop(); // Remove the one we just pushed to end
    if (amountPart) parts.splice(currencyIndex + 1, 0, amountPart);
  }

  // 3. Serialize without CRC
  let rawData = "";
  parts.forEach(p => {
    const lenStr = p.value.length.toString().padStart(2, '0');
    rawData += p.id + lenStr + p.value;
  });

  // 4. Prepare for CRC Calculation
  // Append "6304" to the data
  rawData += "6304";

  // 5. Calculate CRC
  const crcValue = crc16ccitt(rawData);

  // 6. Final String
  return rawData + crcValue;
}
