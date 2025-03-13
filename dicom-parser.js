/**
 * DICOM Parser Module
 * Provides functionality to parse and extract data from DICOM files
 */

// DICOM tag dictionary for metadata display
const DicomTagDictionary = {
    "0x00080020": "Study Date",
    "0x00080030": "Study Time",
    "0x00080050": "Accession Number",
    "0x00080060": "Modality",
    "0x00080070": "Manufacturer",
    "0x00080090": "Referring Physician's Name",
    "0x00100010": "Patient's Name",
    "0x00100020": "Patient ID",
    "0x00100030": "Patient's Birth Date",
    "0x00100040": "Patient's Sex",
    "0x0020000D": "Study Instance UID",
    "0x0020000E": "Series Instance UID",
    "0x00200010": "Study ID",
    "0x00200011": "Series Number",
    "0x00200013": "Instance Number",
    "0x00280010": "Rows",
    "0x00280011": "Columns",
    "0x00280100": "Bits Allocated",
    "0x00280101": "Bits Stored",
    "0x00280102": "High Bit",
    "0x00280103": "Pixel Representation",
    "0x00280004": "Photometric Interpretation",
    "0x00280002": "Samples Per Pixel",
    "0x00280030": "Pixel Spacing",
    "0x00200032": "Image Position",
    "0x00200037": "Image Orientation",
    "0x00180050": "Slice Thickness",
    "0x00180088": "Spacing Between Slices",
    "0x00281050": "Window Center",
    "0x00281051": "Window Width",
    "0x00281052": "Rescale Intercept",
    "0x00281053": "Rescale Slope",
    "0x00321032": "Requesting Physician",
    "0x00321060": "Requested Procedure Description",
    "0x00400254": "Performed Procedure Step Description",
    "0x00400275": "Request Attributes Sequence",
    "0x00420011": "Encapsulated Document"
};

// Improved DICOM parser
const DicomParser = {
    /**
     * Parse a DICOM file buffer
     * @param {ArrayBuffer} buffer - The DICOM file data
     * @returns {Object} Parsed DICOM data
     */
    parseDICOMFile: function(buffer) {
        console.log("parseDICOMFile started, buffer length:", buffer.byteLength);
        
        const dataView = new DataView(buffer);
        const byteArray = new Uint8Array(buffer);
        const result = {
            metadata: {},
            pixels: null,
            width: 0,
            height: 0,
            documents: [] // Array to hold embedded documents
        };
        
        // Check for DICOM magic number
        if (buffer.byteLength < 132) {
            console.warn("Buffer too small for DICOM format:", buffer.byteLength);
            return null;
        }
        
        // Check for DICOM magic number "DICM" at offset 128
        const hasDICM = String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]) === "DICM";
        console.log("Has DICM magic number:", hasDICM);
        
        // Starting offset
        let offset = hasDICM ? 132 : 0;
        console.log("Starting parsing from offset:", offset);
        
        // Look for transfer syntax to determine explicit/implicit VR
        let isExplicitVR = true; // Default to explicit VR
        let littleEndian = true; // Default to little endian
        
        // For debugging
        let tagCount = 0;
        
        // Track SQ nesting level to handle sequences
        let sequenceLevel = 0;
        
        // Parse until we find pixel data or reach end of buffer
        while (offset < buffer.byteLength - 8) {
            try {
                // Read tag group and element
                const group = dataView.getUint16(offset, littleEndian);
                const element = dataView.getUint16(offset + 2, littleEndian);
                offset += 4;
                
                // For debugging
                const tagHex = `0x${group.toString(16).padStart(4, '0')}${element.toString(16).padStart(4, '0')}`;
                tagCount++;
                
                if (tagCount <= 10) {
                    console.log(`Tag ${tagCount}: (${group.toString(16).padStart(4, '0')},${element.toString(16).padStart(4, '0')}) at offset ${offset - 4}`);
                }
                
                // Transfer Syntax UID (0002,0010) - determines encoding
                if (group === 0x0002 && element === 0x0010) {
                    const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                    offset += 2;
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2;
                    
                    // Read transfer syntax UID
                    let transferSyntaxUID = '';
                    for (let i = 0; i < valueLength && i < 64; i++) {
                        const charCode = dataView.getUint8(offset + i);
                        if (charCode > 0) transferSyntaxUID += String.fromCharCode(charCode);
                    }
                    
                    console.log("Transfer Syntax UID:", transferSyntaxUID);
                    
                    // Determine encoding based on transfer syntax
                    if (transferSyntaxUID === "1.2.840.10008.1.2") {
                        // Implicit VR Little Endian
                        isExplicitVR = false;
                        littleEndian = true;
                    } else if (transferSyntaxUID === "1.2.840.10008.1.2.1") {
                        // Explicit VR Little Endian
                        isExplicitVR = true;
                        littleEndian = true;
                    } else if (transferSyntaxUID === "1.2.840.10008.1.2.2") {
                        // Explicit VR Big Endian
                        isExplicitVR = true;
                        littleEndian = false;
                    }
                    
                    result.metadata.transferSyntaxUID = transferSyntaxUID;
                    offset += valueLength;
                    continue;
                }
                
                // Detect sequence start and end items
                if (group === 0xFFFE) {
                    if (element === 0xE000) {
                        // Item start - read length and skip
                        const itemLength = dataView.getUint32(offset, littleEndian);
                        offset += 4;
                        if (itemLength === 0xFFFFFFFF) {
                            // Undefined length item, continue parsing
                        } else {
                            offset += itemLength; // Skip the entire item
                        }
                        continue;
                    } else if (element === 0xE00D) {
                        // Item end - just skip
                        offset += 4; // Skip length field (should be 0)
                        continue;
                    } else if (element === 0xE0DD) {
                        // Sequence end - decrease level
                        sequenceLevel--;
                        offset += 4; // Skip length field
                        continue;
                    }
                }
                
                // Encapsulated Document (0042,0011) - store for later extraction
                if (group === 0x0042 && element === 0x0011) {
                    console.log("Found encapsulated document");
                    
                    let valueLength, docOffset;
                    
                    if (isExplicitVR) {
                        const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                        if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                            offset += 4; // Skip VR (2) and reserved bytes (2)
                            valueLength = dataView.getUint32(offset, littleEndian);
                            docOffset = offset + 4;
                        } else {
                            offset += 2; // Skip VR
                            valueLength = dataView.getUint16(offset, littleEndian);
                            docOffset = offset + 2;
                        }
                    } else {
                        valueLength = dataView.getUint32(offset, littleEndian);
                        docOffset = offset + 4;
                    }
                    
                    // Store document for later extraction
                    result.documents.push({
                        offset: docOffset,
                        length: valueLength,
                        buffer: buffer.slice(docOffset, docOffset + valueLength)
                    });
                    
                    // Skip value
                    offset = docOffset + valueLength;
                    continue;
                }
                
                // Pixel data (7FE0,0010)
                if (group === 0x7FE0 && element === 0x0010) {
                    console.log("Found pixel data tag at offset:", offset - 4);
                    
                    // Get value length
                    let valueLength, pixelOffset;
                    
                    if (isExplicitVR) {
                        const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                        if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                            offset += 4; // Skip VR (2) and reserved bytes (2)
                            valueLength = dataView.getUint32(offset, littleEndian);
                            pixelOffset = offset + 4;
                        } else {
                            offset += 2; // Skip VR
                            valueLength = dataView.getUint16(offset, littleEndian);
                            pixelOffset = offset + 2;
                        }
                    } else {
                        valueLength = dataView.getUint32(offset, littleEndian);
                        pixelOffset = offset + 4;
                    }
                    
                    // Handle special case for undefined length
                    if (valueLength === 0xFFFFFFFF) {
                        console.log("Pixel data has undefined length, using rest of buffer");
                        valueLength = buffer.byteLength - pixelOffset;
                    }
                    
                    // Found pixel data
                    result.pixels = buffer.slice(pixelOffset);
                    result.metadata.pixelDataLength = valueLength;
                    
                    console.log("Extracted pixel data, length:", result.pixels.byteLength);
                    break;
                }
                
                // Process other metadata tags
                let tagValue = null;
                let valueLength = 0;
                
                if (isExplicitVR) {
                    // Explicit VR - read VR first
                    const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                    
                    if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                        offset += 4; // Skip VR (2) and reserved bytes (2)
                        valueLength = dataView.getUint32(offset, littleEndian);
                        offset += 4;
                        
                        if (vr === 'SQ') {
                            // Handle sequences
                            if (valueLength === 0xFFFFFFFF) {
                                // Undefined length sequence
                                sequenceLevel++;
                                console.log(`Entering sequence level ${sequenceLevel} at offset ${offset}`);
                            } else {
                                // Defined length sequence
                                offset += valueLength;
                            }
                            continue;
                        }
                    } else {
                        offset += 2; // Skip VR
                        valueLength = dataView.getUint16(offset, littleEndian);
                        offset += 2;
                        
                        // Read value based on VR
                        if (['AE', 'AS', 'CS', 'DA', 'DS', 'DT', 'IS', 'LO', 'LT', 'PN', 'SH', 'ST', 'TM', 'UI', 'UT'].includes(vr)) {
                            // String value types
                            tagValue = '';
                            for (let i = 0; i < valueLength && i < 256; i++) {
                                const charCode = dataView.getUint8(offset + i);
                                if (charCode > 0) tagValue += String.fromCharCode(charCode);
                            }
                            tagValue = tagValue.trim();
                        } else if (vr === 'US') {
                            // Unsigned short
                            if (valueLength === 2) {
                                tagValue = dataView.getUint16(offset, littleEndian);
                            }
                        } else if (vr === 'SS') {
                            // Signed short
                            if (valueLength === 2) {
                                tagValue = dataView.getInt16(offset, littleEndian);
                            }
                        } else if (vr === 'UL') {
                            // Unsigned long
                            if (valueLength === 4) {
                                tagValue = dataView.getUint32(offset, littleEndian);
                            }
                        } else if (vr === 'SL') {
                            // Signed long
                            if (valueLength === 4) {
                                tagValue = dataView.getInt32(offset, littleEndian);
                            }
                        } else if (vr === 'FL') {
                            // Float
                            if (valueLength === 4) {
                                tagValue = dataView.getFloat32(offset, littleEndian);
                            }
                        } else if (vr === 'FD') {
                            // Double
                            if (valueLength === 8) {
                                tagValue = dataView.getFloat64(offset, littleEndian);
                            }
                        }
                    }
                } else {
                    // Implicit VR - Use dictionary to determine VR (simplified)
                    valueLength = dataView.getUint32(offset, littleEndian);
                    offset += 4;
                    
                    // Handle key DICOM tags
                    if (group === 0x0010 && element === 0x0010) {
                        // Patient's Name - treat as string
                        tagValue = '';
                        for (let i = 0; i < valueLength && i < 64; i++) {
                            const charCode = dataView.getUint8(offset + i);
                            if (charCode > 0) tagValue += String.fromCharCode(charCode);
                        }
                        tagValue = tagValue.trim();
                    } else if (group === 0x0010 && element === 0x0020) {
                        // Patient ID - treat as string
                        tagValue = '';
                        for (let i = 0; i < valueLength && i < 64; i++) {
                            const charCode = dataView.getUint8(offset + i);
                            if (charCode > 0) tagValue += String.fromCharCode(charCode);
                        }
                        tagValue = tagValue.trim();
                    } else if (group === 0x0028 && element === 0x0010) {
                        // Rows - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                        result.height = tagValue;
                    } else if (group === 0x0028 && element === 0x0011) {
                        // Columns - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                        result.width = tagValue;
                    } else if (group === 0x0028 && element === 0x0100) {
                        // Bits Allocated - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                    } else if (group === 0x0028 && element === 0x0101) {
                        // Bits Stored - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                    } else if (group === 0x0028 && element === 0x0102) {
                        // High Bit - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                    } else if (group === 0x0028 && element === 0x0103) {
                        // Pixel Representation - unsigned short
                        tagValue = dataView.getUint16(offset, littleEndian);
                    }
                }
                
                // Store tag and value
                if (tagValue !== null) {
                    const tagString = tagHex;
                    result.metadata[tagString] = tagValue;
                    
                    // Store important dimension values directly
                    if (group === 0x0028 && element === 0x0010) {
                        result.height = tagValue;
                    } else if (group === 0x0028 && element === 0x0011) {
                        result.width = tagValue;
                    } else if (group === 0x0028 && element === 0x0100) {
                        result.metadata.bitsAllocated = tagValue;
                    } else if (group === 0x0028 && element === 0x0101) {
                        result.metadata.bitsStored = tagValue;
                    } else if (group === 0x0028 && element === 0x0102) {
                        result.metadata.highBit = tagValue;
                    } else if (group === 0x0028 && element === 0x0103) {
                        result.metadata.pixelRepresentation = tagValue;
                    }
                }
                
                // Move to next tag
                offset += valueLength;
                
            } catch (e) {
                // If we encounter an error, try to continue from next tag
                console.warn("Error parsing DICOM tag at offset", offset, e);
                offset += 2;
            }
        }
        
        console.log("Finished parsing. Tags processed:", tagCount);
        console.log("Final result:", {
            hasPixels: !!result.pixels,
            pixelDataLength: result.pixels ? result.pixels.byteLength : 0,
            width: result.width,
            height: result.height,
            metadataKeys: Object.keys(result.metadata).length,
            documents: result.documents.length
        });
        
        // Create a simple test pattern if parsing failed
        if (!result.pixels || !result.width || !result.height) {
            console.warn("Failed to extract complete DICOM information");
            
            // Set default dimensions if needed
            if (!result.width) result.width = 512;
            if (!result.height) result.height = 512;
            
            // Create an empty pixels buffer if needed
            if (!result.pixels) {
                console.warn("Creating placeholder pixel data");
                const pixelBuffer = new ArrayBuffer(result.width * result.height * 2); // 16-bit pixels
                result.pixels = pixelBuffer;
                result.metadata.bitsAllocated = 16;
            }
        }
        
        return result;
    },
    
    /**
     * Extract pixel data from a parsed DICOM object
     * @param {Object} dicomData - Parsed DICOM data
     * @returns {Object} Processed image data
     */
    extractPixelData: function(dicomData) {
        console.log("extractPixelData started");
        
        if (!dicomData) {
            console.error("dicomData is null or undefined");
            return this.createTestPattern(512, 512, {});
        }
        
        if (!dicomData.pixels) {
            console.error("No pixel data found in DICOM");
            return this.createTestPattern(512, 512, dicomData.metadata || {});
        }
        
        try {
            const width = dicomData.width || 512;
            const height = dicomData.height || 512;
            const bitsAllocated = dicomData.metadata.bitsAllocated || 16;
            const pixelRepresentation = dicomData.metadata.pixelRepresentation || 0; // 0 = unsigned, 1 = signed
            const pixelLength = dicomData.pixels.byteLength;
            
            console.log(`Image dimensions: ${width}x${height}, bits: ${bitsAllocated}, signed: ${pixelRepresentation === 1}, pixel data length: ${pixelLength} bytes`);
            
            // Create canvas and get context
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(width, height);
            
            // Try to interpret the pixel data
            try {
                if (bitsAllocated === 8) {
                    // 8-bit grayscale
                    const pixelData = new Uint8Array(dicomData.pixels);
                    
                    // Find min/max for windowing
                    let min = 255, max = 0;
                    const sampleSize = Math.min(10000, pixelData.length);
                    
                    for (let i = 0; i < sampleSize; i++) {
                        const idx = Math.floor(i * (pixelData.length / sampleSize));
                        if (pixelData[idx] < min) min = pixelData[idx];
                        if (pixelData[idx] > max) max = pixelData[idx];
                    }
                    
                    console.log(`8-bit pixel range: ${min} to ${max}`);
                    
                    // Apply simple windowing
                    const range = max - min || 1; // Avoid division by zero
                    
                    for (let i = 0; i < Math.min(width * height, pixelData.length); i++) {
                        const normalized = Math.floor(((pixelData[i] - min) / range) * 255);
                        const index = i * 4;
                        imageData.data[index] = normalized;
                        imageData.data[index+1] = normalized;
                        imageData.data[index+2] = normalized;
                        imageData.data[index+3] = 255; // Alpha
                    }
                } else if (bitsAllocated === 16) {
                    // 16-bit grayscale
                    let pixelData;
                    
                    if (pixelRepresentation === 1) {
                        // Signed data
                        pixelData = new Int16Array(dicomData.pixels);
                    } else {
                        // Unsigned data
                        pixelData = new Uint16Array(dicomData.pixels);
                    }
                    
                    // Find min/max for windowing
                    let min = pixelRepresentation === 1 ? 32767 : 65535;
                    let max = pixelRepresentation === 1 ? -32768 : 0;
                    const sampleSize = Math.min(10000, pixelData.length);
                    
                    for (let i = 0; i < sampleSize; i++) {
                        const idx = Math.floor(i * (pixelData.length / sampleSize));
                        if (pixelData[idx] < min) min = pixelData[idx];
                        if (pixelData[idx] > max) max = pixelData[idx];
                    }
                    
                    console.log(`16-bit pixel range: ${min} to ${max}`);
                    
                    // Apply simple windowing
                    const range = max - min || 1; // Avoid division by zero
                    
                    for (let i = 0; i < Math.min(width * height, pixelData.length); i++) {
                        const normalized = Math.floor(((pixelData[i] - min) / range) * 255);
                        const index = i * 4;
                        imageData.data[index] = normalized;
                        imageData.data[index+1] = normalized;
                        imageData.data[index+2] = normalized;
                        imageData.data[index+3] = 255; // Alpha
                    }
                } else {
                    console.warn("Unsupported bits allocated:", bitsAllocated);
                    throw new Error("Unsupported bits allocated: " + bitsAllocated);
                }
            } catch (pixelError) {
                console.error("Failed to render pixel data:", pixelError);
                return this.createTestPattern(width, height, dicomData.metadata);
            }
            
            // Draw image to canvas
            ctx.putImageData(imageData, 0, 0);
            
            return {
                canvas: canvas,
                imageData: imageData,
                width: width,
                height: height,
                metadata: dicomData.metadata,
                documents: dicomData.documents || []
            };
        } catch (error) {
            console.error("Error in extractPixelData:", error);
            return this.createTestPattern(dicomData.width || 512, dicomData.height || 512, dicomData.metadata || {});
        }
    },
    
    /**
     * Create a test pattern image
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {Object} metadata - Metadata to include with the pattern
     * @returns {Object} Test pattern image data
     */
    createTestPattern: function(width, height, metadata) {
        console.log("Creating test pattern", width, "x", height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        
        // Create a checkerboard pattern
        const squareSize = 16;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const isEvenX = Math.floor(x / squareSize) % 2 === 0;
                const isEvenY = Math.floor(y / squareSize) % 2 === 0;
                
                if (isEvenX === isEvenY) {
                    // White square
                    imageData.data[index] = 255;
                    imageData.data[index+1] = 255;
                    imageData.data[index+2] = 255;
                } else {
                    // Gray square
                    imageData.data[index] = 128;
                    imageData.data[index+1] = 128;
                    imageData.data[index+2] = 128;
                }
                imageData.data[index+3] = 255; // Alpha
            }
        }
        
        // Draw pattern
        ctx.putImageData(imageData, 0, 0);
        
        // Add text to indicate it's a test pattern
        ctx.font = '20px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('TEST PATTERN', 20, 30);
        ctx.fillText(`${width}x${height}`, 20, 60);
        
        return {
            canvas: canvas,
            imageData: imageData,
            width: width,
            height: height,
            metadata: metadata,
            documents: []
        };
    }
};

// Make available globally
window.DicomParser = DicomParser;
window.DicomTagDictionary = DicomTagDictionary;