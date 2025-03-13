/**
 * Document Type Detector Module
 * Handles detection of document types based on binary signatures
 */

const DocumentTypeDetector = {
    /**
     * Detect the MIME type of a document from its binary content
     * @param {ArrayBuffer} buffer - Raw document data
     * @returns {Object} Object with mimeType and extension
     */
    detectType: function(buffer) {
        const byteArray = new Uint8Array(buffer);
        
        // Check for PDF
        if (byteArray.length > 4 && 
            byteArray[0] === 0x25 && byteArray[1] === 0x50 && 
            byteArray[2] === 0x44 && byteArray[3] === 0x46) {
            return {
                mimeType: "application/pdf",
                extension: "pdf"
            };
        }
        
        // Check for JPEG
        if (byteArray.length > 2 && 
            byteArray[0] === 0xFF && byteArray[1] === 0xD8) {
            return {
                mimeType: "image/jpeg",
                extension: "jpg"
            };
        }
        
        // Check for PNG
        if (byteArray.length > 8 && 
            byteArray[0] === 0x89 && byteArray[1] === 0x50 && 
            byteArray[2] === 0x4E && byteArray[3] === 0x47 &&
            byteArray[4] === 0x0D && byteArray[5] === 0x0A &&
            byteArray[6] === 0x1A && byteArray[7] === 0x0A) {
            return {
                mimeType: "image/png",
                extension: "png"
            };
        }
        
        // Check for XML
        if (byteArray.length > 5 && 
            byteArray[0] === 0x3C && byteArray[1] === 0x3F && 
            byteArray[2] === 0x78 && byteArray[3] === 0x6D && 
            byteArray[4] === 0x6C) {
            return {
                mimeType: "application/xml",
                extension: "xml"
            };
        }
        
        // Check for DOCX/XLSX (Office Open XML)
        if (byteArray.length > 4 && 
            byteArray[0] === 0x50 && byteArray[1] === 0x4B && 
            byteArray[2] === 0x03 && byteArray[3] === 0x04) {
            return {
                mimeType: "application/vnd.openxmlformats-officedocument",
                extension: "docx"
            };
        }
        
        // Default to binary
        return {
            mimeType: "application/octet-stream",
            extension: "bin"
        };
    }
};

window.DocumentTypeDetector = DocumentTypeDetector;