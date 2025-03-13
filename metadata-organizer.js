/**
 * Metadata Organizer Module
 * Handles organization and categorization of DICOM metadata
 */

class MetadataOrganizer {
    constructor() {
        // Define metadata categories
        this.categories = {
            patient: {
                title: 'Patient',
                icon: '👤',
                tags: [
                    '0x00100010', // Patient's Name
                    '0x00100020', // Patient ID
                    '0x00100021', // Issuer of Patient ID
                    '0x00100030', // Patient's Birth Date
                    '0x00100040', // Patient's Sex
                    '0x00101000', // Other Patient IDs
                    '0x00101010', // Patient's Age
                    '0x00101020', // Patient's Size
                    '0x00101030'  // Patient's Weight
                ]
            },
            study: {
                title: 'Study',
                icon: '📋',
                tags: [
                    '0x00080020', // Study Date
                    '0x00080030', // Study Time
                    '0x00080050', // Accession Number
                    '0x00080090', // Referring Physician's Name
                    '0x00081030', // Study Description
                    '0x0020000d', // Study Instance UID
                    '0x00200010'  // Study ID
                ]
            },
            series: {
                title: 'Series',
                icon: '📷',
                tags: [
                    '0x00080021', // Series Date
                    '0x00080031', // Series Time
                    '0x0008103e', // Series Description
                    '0x00180015', // Body Part Examined
                    '0x00080060', // Modality
                    '0x00081050', // Performing Physician's Name
                    '0x0020000e', // Series Instance UID
                    '0x00200011', // Series Number
                    '0x00185101'  // View Position
                ]
            },
            image: {
                title: 'Image',
                icon: '🖼️',
                tags: [
                    '0x00080008', // Image Type
                    '0x00080023', // Content Date
                    '0x00080033', // Content Time
                    '0x00080016', // SOP Class UID
                    '0x00080018', // SOP Instance UID
                    '0x00200013'  // Instance Number
                ]
            },
            acquisition: {
                title: 'Acquisition',
                icon: '⚙️',
                tags: [
                    '0x00180060', // KVP
                    '0x00181152', // Exposure
                    '0x00181150', // Exposure Time
                    '0x00181153', // Exposure mAs
                    '0x00181160', // Filter Type
                    '0x00181170', // Generator Power
                    '0x00181190', // Focal Spot(s)
                    '0x00181030', // Protocol Name
                    '0x00181020', // Software Versions
                    '0x00180015', // Body Part Examined
                    '0x00181000', // Device Serial Number
                    '0x00181010', // Secondary Capture Device ID
                    '0x00181012', // Date of Secondary Capture
                    '0x00181014'  // Time of Secondary Capture
                ]
            },
            examination: {
                title: 'Examination',
                icon: '🔍',
                tags: [
                    '0x00101010', // Patient's Age
                    '0x00181030', // Protocol Name
                    '0x00321032', // Requesting Physician
                    '0x00321060', // Requested Procedure Description
                    '0x00400254', // Performed Procedure Step Description
                    '0x00400275', // Request Attributes Sequence
                    '0x00401001', // Requested Procedure ID
                    '0x00400007', // Scheduled Procedure Step Description
                    '0x00400009', // Scheduled Procedure Step ID
                    '0x00400011', // Scheduled Procedure Step Location
                    '0x00401002', // Reason for the Requested Procedure
                    '0x00401400'  // Requested Procedure Comments
                ]
            },
            anatomy: {
                title: 'Anatomy & Positioning',
                icon: '🦴',
                tags: [
                    '0x00180015', // Body Part Examined
                    '0x00185101', // View Position
                    '0x00181030', // Protocol Name
                    '0x00081030', // Study Description
                    '0x0008103e', // Series Description
                    '0x00200060', // Laterality
                    '0x00200020'  // Patient Orientation
                ]
            },
            image_quality: {
                title: 'Image Quality',
                icon: '✨',
                tags: [
                    '0x00281050', // Window Center
                    '0x00281051', // Window Width
                    '0x00281052', // Rescale Intercept
                    '0x00281053', // Rescale Slope
                    '0x00281054'  // Rescale Type
                ]
            },
            technical: {
                title: 'Technical',
                icon: '🔧',
                tags: [
                    '0x00280002', // Samples Per Pixel
                    '0x00280004', // Photometric Interpretation
                    '0x00280010', // Rows
                    '0x00280011', // Columns
                    '0x00280030', // Pixel Spacing
                    '0x00280100', // Bits Allocated
                    '0x00280101', // Bits Stored
                    '0x00280102', // High Bit
                    '0x00280103', // Pixel Representation
                    '0x00280106', // Smallest Image Pixel Value
                    '0x00280107', // Largest Image Pixel Value
                    '0x00181050'  // Spatial Resolution
                ]
            },
            institution: {
                title: 'Institution',
                icon: '🏥',
                tags: [
                    '0x00080080', // Institution Name
                    '0x00080081', // Institution Address
                    '0x00080090', // Referring Physician's Name
                    '0x00081040', // Institution Department Name
                    '0x00081050', // Performing Physician's Name
                    '0x00081070'  // Operators' Name
                ]
            }
        };
        
        // Define body part examined tags and their possible values
        this.bodyPartTags = [
            '0x00180015', // Body Part Examined
            '0x00081030', // Study Description
            '0x0008103e', // Series Description
            '0x00181030', // Protocol Name
            '0x00321060', // Requested Procedure Description
            '0x00400254', // Performed Procedure Step Description
            '0x00400007'  // Scheduled Procedure Step Description
        ];
        
        // Define known body parts and related keywords
        this.bodyParts = {
            'HEAD': ['HEAD', 'SKULL', 'BRAIN', 'CEREBR'],
            'NECK': ['NECK', 'CERVICAL', 'THROAT'],
            'CHEST': ['CHEST', 'THORAX', 'LUNG', 'THORACIC'],
            'ABDOMEN': ['ABDOMEN', 'BELLY', 'STOMACH'],
            'PELVIS': ['PELVIS', 'PELVIC', 'HIP'],
            'SPINE': ['SPINE', 'VERTEBRA', 'SPINAL'],
            'UPPER EXTREMITY': ['ARM', 'HAND', 'WRIST', 'ELBOW', 'SHOULDER', 'HUMERUS', 'ULNA', 'RADIUS'],
            'LOWER EXTREMITY': ['LEG', 'FOOT', 'VOET', 'KNEE', 'ANKLE', 'FEMUR', 'TIBIA', 'FIBULA'],
            'WHOLE BODY': ['WHOLE BODY', 'FULL BODY', 'SKELETON'],
            'BREAST': ['BREAST', 'MAMMARY']
        };
        
        // Define laterality terms
        this.laterality = {
            'LEFT': ['LEFT', 'LINKS', 'GAUCHE', 'SINISTER', 'L ', ' L', 'LT'],
            'RIGHT': ['RIGHT', 'RECHTS', 'DROIT', 'DEXTER', 'R ', ' R', 'RT']
        };
    }
    
    /**
     * Organize metadata into categories
     * @param {Object} metadata - DICOM metadata
     * @returns {Object} Categorized metadata
     */
    organizeMetadata(metadata) {
        if (!metadata) return {};
        
        const result = {};
        
        // Initialize categories with empty arrays
        for (const category in this.categories) {
            result[category] = [];
        }
        
        // Categorize each metadata tag
        for (const [tag, value] of Object.entries(metadata)) {
            let added = false;
            
            // Check which category this tag belongs to
            for (const category in this.categories) {
                if (this.categories[category].tags.includes(tag)) {
                    result[category].push({ tag, value });
                    added = true;
                    break;
                }
            }
            
            // Add to "other" if not categorized
            if (!added && tag !== 'bitsAllocated' && 
                tag !== 'bitsStored' && 
                tag !== 'highBit' && 
                tag !== 'pixelRepresentation' && 
                tag !== 'transferSyntaxUID' && 
                tag !== 'pixelDataLength') {
                
                if (!result.other) {
                    result.other = [];
                }
                result.other.push({ tag, value });
            }
        }
        
        return result;
    }
    
    /**
     * Identify the body part from metadata
     * @param {Object} metadata - DICOM metadata
     * @returns {Object} Body part information
     */
    identifyBodyPart(metadata) {
        if (!metadata) return { part: 'Unknown', laterality: '' };
        
        let bodyPartText = '';
        
        // Collect all text from body part related fields
        for (const tag of this.bodyPartTags) {
            if (metadata[tag]) {
                bodyPartText += ' ' + metadata[tag].toString().toUpperCase();
            }
        }
        
        // Also check laterality tag
        if (metadata['0x00200060']) {
            bodyPartText += ' ' + metadata['0x00200060'].toString().toUpperCase();
        }
        
        // Identify body part
        let identifiedPart = 'Unknown';
        let highestMatchCount = 0;
        
        for (const [part, keywords] of Object.entries(this.bodyParts)) {
            let matchCount = 0;
            for (const keyword of keywords) {
                if (bodyPartText.includes(keyword.toUpperCase())) {
                    matchCount++;
                }
            }
            
            if (matchCount > highestMatchCount) {
                highestMatchCount = matchCount;
                identifiedPart = part;
            }
        }
        
        // Identify laterality
        let identifiedLaterality = '';
        for (const [side, keywords] of Object.entries(this.laterality)) {
            for (const keyword of keywords) {
                if (bodyPartText.includes(keyword.toUpperCase())) {
                    identifiedLaterality = side;
                    break;
                }
            }
            if (identifiedLaterality) break;
        }
        
        // Get specific body part description
        let description = '';
        if (metadata['0x0008103e']) {
            description = metadata['0x0008103e'];
        } else if (metadata['0x00180015']) {
            description = metadata['0x00180015'];
        } else if (metadata['0x00081030']) {
            description = metadata['0x00081030'];
        }
        
        return {
            part: identifiedPart,
            laterality: identifiedLaterality,
            description: description,
            rawText: bodyPartText.trim()
        };
    }
    
    /**
     * Generate HTML for categorized metadata
     * @param {Object} categorizedMetadata - Metadata organized by category
     * @returns {string} HTML for the metadata display
     */
    generateMetadataHTML(categorizedMetadata) {
        let html = '';
        
        // Generate tabs for each category that has data
        html += '<div class="metadata-tabs">';
        html += '<div class="metadata-tab-buttons">';
        
        let firstCategory = true;
        for (const category in this.categories) {
            if (categorizedMetadata[category] && categorizedMetadata[category].length > 0) {
                const isActive = firstCategory ? 'active' : '';
                html += `<div class="metadata-tab-button ${isActive}" data-category="${category}">
                    <span class="icon">${this.categories[category].icon}</span>
                    ${this.categories[category].title}
                </div>`;
                firstCategory = false;
            }
        }
        
        // Add "Other" tab if needed
        if (categorizedMetadata.other && categorizedMetadata.other.length > 0) {
            const isActive = firstCategory ? 'active' : '';
            html += `<div class="metadata-tab-button ${isActive}" data-category="other">
                <span class="icon">📎</span>
                Other
            </div>`;
        }
        
        html += '</div>'; // End tab buttons
        
        // Generate content for each tab
        html += '<div class="metadata-tab-contents">';
        
        firstCategory = true;
        for (const category in this.categories) {
            if (categorizedMetadata[category] && categorizedMetadata[category].length > 0) {
                const isActive = firstCategory ? 'active' : '';
                html += `<div class="metadata-tab-content ${isActive}" id="metadata-${category}">`;
                html += this.generateCategoryTable(categorizedMetadata[category]);
                html += '</div>';
                firstCategory = false;
            }
        }
        
        // Add "Other" tab content if needed
        if (categorizedMetadata.other && categorizedMetadata.other.length > 0) {
            const isActive = firstCategory ? 'active' : '';
            html += `<div class="metadata-tab-content ${isActive}" id="metadata-other">`;
            html += this.generateCategoryTable(categorizedMetadata.other);
            html += '</div>';
        }
        
        html += '</div>'; // End tab contents
        html += '</div>'; // End metadata tabs
        
        return html;
    }
    
    /**
     * Generate a table for a category's metadata
     * @param {Array} items - Metadata items
     * @returns {string} HTML table
     */
    generateCategoryTable(items) {
        let html = '<table class="metadata-table">';
        html += '<tr><th>Tag</th><th>Description</th><th>Value</th></tr>';
        
        for (const item of items) {
            const tagName = DicomTagDictionary[item.tag] || 'Unknown';
            html += `<tr>
                <td>${item.tag}</td>
                <td>${tagName}</td>
                <td>${item.value}</td>
            </tr>`;
        }
        
        html += '</table>';
        return html;
    }
    
    /**
     * Generate HTML for body part information
     * @param {Object} bodyPartInfo - Body part information
     * @returns {string} HTML for body part display
     */
    generateBodyPartHTML(bodyPartInfo) {
        let html = '<div class="body-part-info">';
        
        // Create icon based on body part
        let bodyPartIcon = '🦴';
        switch (bodyPartInfo.part) {
            case 'HEAD': bodyPartIcon = '🧠'; break;
            case 'NECK': bodyPartIcon = '👄'; break;
            case 'CHEST': bodyPartIcon = '👚'; break;
            case 'ABDOMEN': bodyPartIcon = '🫃'; break;
            case 'PELVIS': bodyPartIcon = '🦴'; break;
            case 'SPINE': bodyPartIcon = '🧍'; break;
            case 'UPPER EXTREMITY': bodyPartIcon = '💪'; break;
            case 'LOWER EXTREMITY': bodyPartIcon = '🦶'; break;
            case 'WHOLE BODY': bodyPartIcon = '🧍'; break;
            case 'BREAST': bodyPartIcon = '👚'; break;
        }
        
        html += `<div class="body-part-icon">${bodyPartIcon}</div>`;
        html += '<div class="body-part-details">';
        html += `<div class="body-part-name">${bodyPartInfo.part}${bodyPartInfo.laterality ? ' - ' + bodyPartInfo.laterality : ''}</div>`;
        
        if (bodyPartInfo.description) {
            html += `<div class="body-part-description">${bodyPartInfo.description}</div>`;
        }
        
        html += '</div>'; // End body-part-details
        html += '</div>'; // End body-part-info
        
        return html;
    }
    
    /**
     * Get a readable description for a given SOP Class UID
     * @param {string} sopClassUid - The SOP Class UID
     * @returns {string} Readable description
     */
    getMediaTypeForSopClass(sopClassUid) {
        const mediaTypes = {
            '1.2.840.10008.5.1.4.1.1.1': 'Computed Radiography Image',
            '1.2.840.10008.5.1.4.1.1.1.1': 'Digital X-Ray Image - For Presentation',
            '1.2.840.10008.5.1.4.1.1.1.1.1': 'Digital X-Ray Image - For Processing',
            '1.2.840.10008.5.1.4.1.1.1.2': 'Digital Mammography X-Ray Image - For Presentation',
            '1.2.840.10008.5.1.4.1.1.1.2.1': 'Digital Mammography X-Ray Image - For Processing',
            '1.2.840.10008.5.1.4.1.1.2': 'CT Image',
            '1.2.840.10008.5.1.4.1.1.2.1': 'Enhanced CT Image',
            '1.2.840.10008.5.1.4.1.1.3.1': 'Ultrasound Multi-frame Image',
            '1.2.840.10008.5.1.4.1.1.4': 'MR Image',
            '1.2.840.10008.5.1.4.1.1.4.1': 'Enhanced MR Image',
            '1.2.840.10008.5.1.4.1.1.6.1': 'Ultrasound Image',
            '1.2.840.10008.5.1.4.1.1.7': 'Secondary Capture Image',
            '1.2.840.10008.5.1.4.1.1.88.11': 'Basic Text SR',
            '1.2.840.10008.5.1.4.1.1.88.22': 'Enhanced SR',
            '1.2.840.10008.5.1.4.1.1.88.33': 'Comprehensive SR',
            '1.2.840.10008.5.1.4.1.1.104.1': 'Encapsulated PDF',
            '1.2.840.10008.5.1.4.1.1.130': 'Enhanced PET Image',
            '1.2.840.10008.5.1.4.1.1.128': 'PET Image',
            '1.2.840.10008.5.1.4.1.1.481.1': 'RT Image',
            '1.2.840.10008.5.1.4.1.1.77.1.1': 'VL Photographic Image',
            '1.2.840.10008.5.1.4.1.1.77.1.4': 'VL Microscopic Image',
            '1.2.840.10008.5.1.4.1.1.77.1.2': 'VL Slide-Coordinates Microscopic Image',
            '1.2.840.10008.5.1.4.1.1.77.1.5.1': 'Video Photographic Image',
            '1.2.840.10008.5.1.4.1.1.77.1.5.2': 'Video Microscopic Image',
            '1.2.840.10008.5.1.4.1.1.77.1.5.4': 'Video Endoscopic Image',
            '1.2.840.10008.3.1.2.3.3': 'DICOM Directory',
            '1.2.840.10008.5.1.4.1.1.66': 'Raw Data',
            '1.2.840.10008.5.1.4.1.1.9.1.1': 'Twelve Lead ECG Waveform',
            '1.2.840.10008.5.1.4.1.1.9.1.2': 'General ECG Waveform',
            '1.2.840.10008.5.1.4.1.1.9.1.3': 'Ambulatory ECG Waveform',
            '1.2.840.10008.5.1.4.1.1.9.2.1': 'Hemodynamic Waveform',
            '1.2.840.10008.5.1.4.1.1.9.3.1': 'Cardiac Electrophysiology Waveform',
            '1.2.840.10008.5.1.4.1.1.9.4.1': 'Basic Voice Audio Waveform',
            '1.2.840.10008.5.1.4.1.1.66.4': 'Segmentation'
        };
        
        return mediaTypes[sopClassUid] || 'Unknown Media Type';
    }
}

window.MetadataOrganizer = MetadataOrganizer;