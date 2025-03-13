/**
 * DICOMDIR Parser Module
 * Handles parsing and organizing DICOMDIR files
 */

class DicomdirParser {
    constructor() {
        this.structure = {
            patients: []
        };
        this.rawRecords = [];
        this.filePathMap = {};
    }

    /**
     * Parse DICOMDIR buffer data
     * @param {ArrayBuffer} buffer - DICOMDIR file buffer
     * @returns {Object} Parsed DICOMDIR structure
     */
    parseDicomdir(buffer) {
        console.log("Parsing DICOMDIR...");
        
        // Reset state
        this.structure = { patients: [] };
        this.rawRecords = [];
        this.filePathMap = {};
        
        // Use standard DICOM parser first
        const dicomData = DicomParser.parseDICOMFile(buffer);
        if (!dicomData) {
            console.error("Failed to parse DICOMDIR as DICOM");
            return null;
        }
        
        // Process the directory records
        this.extractDirectoryRecords(buffer);
        
        // Build the hierarchical structure
        this.buildHierarchicalStructure();
        
        console.log("DICOMDIR structure:", this.structure);
        console.log("File path map:", this.filePathMap);
        
        return this.structure;
    }
    
    /**
     * Extract directory records from DICOMDIR
     * @param {ArrayBuffer} buffer - DICOMDIR file buffer
     */
    extractDirectoryRecords(buffer) {
        const dataView = new DataView(buffer);
        const byteArray = new Uint8Array(buffer);
        
        // Check for DICOM magic number
        if (buffer.byteLength < 132 || 
            String.fromCharCode(byteArray[128], byteArray[129], byteArray[130], byteArray[131]) !== "DICM") {
            console.error("Not a valid DICOM file (no DICM prefix)");
            return;
        }
        
        let offset = 132; // Start after DICM prefix
        let littleEndian = true; // DICOMDIR is typically little endian
        
        // Find the Directory Record Sequence (0004,1220)
        while (offset < buffer.byteLength - 8) {
            try {
                const group = dataView.getUint16(offset, littleEndian);
                const element = dataView.getUint16(offset + 2, littleEndian);
                offset += 4;
                
                // Directory Record Sequence (0004,1220)
                if (group === 0x0004 && element === 0x1220) {
                    console.log("Found Directory Record Sequence at offset:", offset - 4);
                    
                    // Skip VR and length (sequence items will be processed individually)
                    offset += 8; // Skip VR (OB/SQ), reserved bytes, and length
                    this.parseDirectoryRecordSequence(dataView, byteArray, offset, littleEndian);
                    break;
                }
                
                // Skip tag value
                // Assuming explicit VR for simplicity
                const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                
                if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                    offset += 4; // Skip VR (2) and reserved bytes (2)
                    const valueLength = dataView.getUint32(offset, littleEndian);
                    offset += 4 + valueLength;
                } else {
                    offset += 2; // Skip VR
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2 + valueLength;
                }
                
            } catch (e) {
                console.error("Error parsing DICOMDIR at offset", offset, e);
                offset += 2; // Try to recover
            }
        }
    }
    
    /**
     * Parse the directory record sequence
     * @param {DataView} dataView - DataView for the buffer
     * @param {Uint8Array} byteArray - Byte array of the buffer
     * @param {number} startOffset - Starting offset
     * @param {boolean} littleEndian - Endianness flag
     */
    parseDirectoryRecordSequence(dataView, byteArray, startOffset, littleEndian) {
        let offset = startOffset;
        
        // Parse sequence items
        while (offset < byteArray.length - 8) {
            // Check for sequence delimiter
            if (byteArray[offset] === 0xFE && byteArray[offset + 1] === 0xFF &&
                byteArray[offset + 2] === 0xDD && byteArray[offset + 3] === 0xE0) {
                console.log("End of Directory Record Sequence at offset:", offset);
                break;
            }
            
            // Check for item tag (FFFE,E000)
            if (byteArray[offset] === 0xFE && byteArray[offset + 1] === 0xFF &&
                byteArray[offset + 2] === 0x00 && byteArray[offset + 3] === 0xE0) {
                
                offset += 4; // Skip item tag
                const itemLength = dataView.getUint32(offset, littleEndian);
                offset += 4; // Skip item length
                
                // Parse directory record item
                const recordData = this.parseDirectoryRecord(dataView, byteArray, offset, littleEndian);
                if (recordData) {
                    this.rawRecords.push(recordData);
                }
                
                // Move to next item
                if (itemLength === 0xFFFFFFFF) {
                    // Undefined length - need to find item delimiter
                    while (offset < byteArray.length - 8) {
                        if (byteArray[offset] === 0xFE && byteArray[offset + 1] === 0xFF &&
                            byteArray[offset + 2] === 0x0D && byteArray[offset + 3] === 0xE0) {
                            offset += 8; // Skip item delimiter tag and length
                            break;
                        }
                        offset++;
                    }
                } else {
                    offset += itemLength;
                }
            } else {
                // Not an item - skip to next tag
                offset += 2;
            }
        }
    }
    
    /**
     * Parse a single directory record
     * @param {DataView} dataView - DataView for the buffer
     * @param {Uint8Array} byteArray - Byte array of the buffer
     * @param {number} startOffset - Starting offset
     * @param {boolean} littleEndian - Endianness flag
     * @returns {Object} Directory record data
     */
    parseDirectoryRecord(dataView, byteArray, startOffset, littleEndian) {
        let offset = startOffset;
        const record = {
            offset: startOffset,
            recordType: '',
            lowerLevelOffset: 0,
            referencedFileID: '',
            directoryRecordType: '',
            fields: {}
        };
        
        // Parse directory record entries
        while (offset < startOffset + 512) { // Limit search to avoid infinite loops
            try {
                const group = dataView.getUint16(offset, littleEndian);
                const element = dataView.getUint16(offset + 2, littleEndian);
                offset += 4;
                
                // Record Type (0004,1430)
                if (group === 0x0004 && element === 0x1430) {
                    const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                    offset += 2;
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2;
                    
                    let value = '';
                    for (let i = 0; i < valueLength && i < 64; i++) {
                        const charCode = dataView.getUint8(offset + i);
                        if (charCode > 0) value += String.fromCharCode(charCode);
                    }
                    record.directoryRecordType = value.trim();
                    offset += valueLength;
                    continue;
                }
                
                // Lower-Level Directory Entity Offset (0004,1420)
                if (group === 0x0004 && element === 0x1420) {
                    offset += 2; // Skip VR
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2;
                    
                    if (valueLength === 4) {
                        record.lowerLevelOffset = dataView.getUint32(offset, littleEndian);
                    }
                    
                    offset += valueLength;
                    continue;
                }
                
                // Referenced File ID (0004,1500)
                if (group === 0x0004 && element === 0x1500) {
                    const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                    offset += 2;
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2;
                    
                    let value = '';
                    for (let i = 0; i < valueLength && i < 256; i++) {
                        const charCode = dataView.getUint8(offset + i);
                        if (charCode > 0) value += String.fromCharCode(charCode);
                    }
                    record.referencedFileID = value.trim();
                    offset += valueLength;
                    continue;
                }
                
                // Other fields - store them by tag
                const tagHex = `0x${group.toString(16).padStart(4, '0')}${element.toString(16).padStart(4, '0')}`;
                const vr = String.fromCharCode(byteArray[offset], byteArray[offset + 1]);
                
                if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
                    // Complex VR - skip
                    offset += 4; // Skip VR and reserved bytes
                    const valueLength = dataView.getUint32(offset, littleEndian);
                    offset += 4 + valueLength;
                } else {
                    offset += 2; // Skip VR
                    const valueLength = dataView.getUint16(offset, littleEndian);
                    offset += 2;
                    
                    // Read value based on VR
                    if (['AE', 'AS', 'CS', 'DA', 'DS', 'DT', 'IS', 'LO', 'LT', 'PN', 'SH', 'ST', 'TM', 'UI', 'UT'].includes(vr)) {
                        let value = '';
                        for (let i = 0; i < valueLength && i < 256; i++) {
                            const charCode = dataView.getUint8(offset + i);
                            if (charCode > 0) value += String.fromCharCode(charCode);
                        }
                        record.fields[tagHex] = value.trim();
                    } else if (vr === 'US') {
                        if (valueLength === 2) {
                            record.fields[tagHex] = dataView.getUint16(offset, littleEndian);
                        }
                    } else if (vr === 'UL') {
                        if (valueLength === 4) {
                            record.fields[tagHex] = dataView.getUint32(offset, littleEndian);
                        }
                    }
                    
                    offset += valueLength;
                }
                
                // Look for Item Delimitation tag to stop parsing
                if (byteArray[offset] === 0xFE && byteArray[offset + 1] === 0xFF &&
                    byteArray[offset + 2] === 0x0D && byteArray[offset + 3] === 0xE0) {
                    break;
                }
                
            } catch (e) {
                console.error("Error parsing directory record at offset", offset, e);
                break;
            }
        }
        
        return record;
    }
    
    /**
     * Build a hierarchical structure from raw records
     */
    buildHierarchicalStructure() {
        // First, map all records by their offset for easy reference
        const recordsByOffset = {};
        for (const record of this.rawRecords) {
            recordsByOffset[record.offset] = record;
        }
        
        // Find patient records (top level)
        const patientRecords = this.rawRecords.filter(r => r.directoryRecordType === 'PATIENT');
        
        // Process each patient
        for (const patientRecord of patientRecords) {
            const patient = {
                name: patientRecord.fields['0x00100010'] || 'Unknown',
                id: patientRecord.fields['0x00100020'] || '',
                birthDate: patientRecord.fields['0x00100030'] || '',
                sex: patientRecord.fields['0x00100040'] || '',
                studies: []
            };
            
            // Add to structure
            this.structure.patients.push(patient);
            
            // Process studies for this patient
            this.processChildren(patientRecord, recordsByOffset, patient, 'studies', 'STUDY');
        }
        
        // Map file paths for quick lookup
        this.mapFilePaths();
    }
    
    /**
     * Process children records recursively
     * @param {Object} parentRecord - Parent record
     * @param {Object} recordsByOffset - Records mapped by offset
     * @param {Object} parentObject - Parent object in structure
     * @param {string} childrenField - Field to store children
     * @param {string} expectedType - Expected record type
     */
    processChildren(parentRecord, recordsByOffset, parentObject, childrenField, expectedType) {
        if (!parentRecord.lowerLevelOffset) return;
        
        let currentOffset = parentRecord.lowerLevelOffset;
        while (currentOffset !== 0) {
            const record = recordsByOffset[currentOffset];
            if (!record) break;
            
            if (record.directoryRecordType === expectedType) {
                let childObject;
                
                // Create appropriate object based on type
                switch (expectedType) {
                    case 'STUDY':
                        childObject = {
                            date: record.fields['0x00080020'] || '',
                            time: record.fields['0x00080030'] || '',
                            id: record.fields['0x00200010'] || '',
                            accessionNumber: record.fields['0x00080050'] || '',
                            description: record.fields['0x00081030'] || '',
                            series: []
                        };
                        
                        parentObject.studies.push(childObject);
                        this.processChildren(record, recordsByOffset, childObject, 'series', 'SERIES');
                        break;
                        
                    case 'SERIES':
                        childObject = {
                            number: record.fields['0x00200011'] || '',
                            modality: record.fields['0x00080060'] || '',
                            description: record.fields['0x0008103E'] || '',
                            date: record.fields['0x00080021'] || '',
                            time: record.fields['0x00080031'] || '',
                            images: []
                        };
                        
                        parentObject.series.push(childObject);
                        this.processChildren(record, recordsByOffset, childObject, 'images', 'IMAGE');
                        break;
                        
                    case 'IMAGE':
                        childObject = {
                            instanceNumber: record.fields['0x00200013'] || '',
                            sopInstanceUID: record.fields['0x00080018'] || '',
                            sopClassUID: record.fields['0x00080016'] || '',
                            filePath: record.referencedFileID || '',
                            transferSyntaxUID: record.fields['0x00020010'] || ''
                        };
                        
                        parentObject.images.push(childObject);
                        break;
                }
            }
            
            // Get next record at same level
            const nextRecord = recordsByOffset[record.offset + 1];
            currentOffset = nextRecord ? nextRecord.offset : 0;
        }
    }
    
    /**
     * Map file paths to their metadata for quick lookup
     */
    mapFilePaths() {
        this.structure.patients.forEach(patient => {
            patient.studies.forEach(study => {
                study.series.forEach(series => {
                    series.images.forEach(image => {
                        if (image.filePath) {
                            // Clean up file path if needed (some use backslashes)
                            const path = image.filePath.replace(/\\/g, '/');
                            
                            this.filePathMap[path] = {
                                patient: {
                                    name: patient.name,
                                    id: patient.id,
                                    birthDate: patient.birthDate,
                                    sex: patient.sex
                                },
                                study: {
                                    date: study.date,
                                    time: study.time,
                                    id: study.id,
                                    accessionNumber: study.accessionNumber,
                                    description: study.description
                                },
                                series: {
                                    number: series.number,
                                    modality: series.modality,
                                    description: series.description,
                                    date: series.date,
                                    time: series.time
                                },
                                image: {
                                    instanceNumber: image.instanceNumber,
                                    sopInstanceUID: image.sopInstanceUID,
                                    sopClassUID: image.sopClassUID,
                                    transferSyntaxUID: image.transferSyntaxUID
                                }
                            };
                        }
                    });
                });
            });
        });
    }
    
    /**
     * Get metadata for a specific file path
     * @param {string} filePath - File path to look up
     * @returns {Object|null} Metadata for the file
     */
    getMetadataForFile(filePath) {
        // Normalize path - account for both forward and backward slashes
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // First try exact match
        if (this.filePathMap[normalizedPath]) {
            return this.filePathMap[normalizedPath];
        }
        
        // Try to find by partial match (sometimes DICOMDIR paths are relative)
        for (const path in this.filePathMap) {
            if (normalizedPath.endsWith(path) || path.endsWith(normalizedPath)) {
                return this.filePathMap[path];
            }
        }
        
        return null;
    }
    
    /**
     * Generate HTML to display the hierarchical structure
     * @returns {string} HTML representation
     */
    generateStructureHTML() {
        let html = '<div class="dicomdir-structure">';
        
        // Patients
        this.structure.patients.forEach(patient => {
            html += `<div class="dicomdir-patient">
                <div class="dicomdir-header">
                    <span class="icon">👤</span>
                    <strong>${patient.name}</strong> (ID: ${patient.id || 'Unknown'})
                </div>
                <div class="dicomdir-info">
                    ${patient.birthDate ? `Birth Date: ${patient.birthDate}<br>` : ''}
                    ${patient.sex ? `Sex: ${patient.sex}` : ''}
                </div>`;
            
            // Studies
            patient.studies.forEach(study => {
                html += `<div class="dicomdir-study">
                    <div class="dicomdir-header">
                        <span class="icon">📋</span>
                        <strong>${study.description || 'Study'}</strong>
                        ${study.date ? ` - ${study.date}` : ''}
                    </div>
                    <div class="dicomdir-info">
                        ${study.id ? `Study ID: ${study.id}<br>` : ''}
                        ${study.accessionNumber ? `Accession: ${study.accessionNumber}` : ''}
                    </div>`;
                
                // Series
                study.series.forEach(series => {
                    html += `<div class="dicomdir-series">
                        <div class="dicomdir-header">
                            <span class="icon">🔍</span>
                            <strong>${series.modality || 'Series'} ${series.number || ''}</strong>
                            ${series.description ? ` - ${series.description}` : ''}
                        </div>
                        <div class="dicomdir-info">
                            ${series.date ? `Date: ${series.date}` : ''}
                        </div>
                        <div class="dicomdir-image-count">
                            Images: ${series.images.length}
                        </div>
                    </div>`;
                });
                
                html += '</div>'; // Close study
            });
            
            html += '</div>'; // Close patient
        });
        
        html += '</div>'; // Close structure
        
        return html;
    }
}

// Make available globally
window.DicomdirParser = DicomdirParser;