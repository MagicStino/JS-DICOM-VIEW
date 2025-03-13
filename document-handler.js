/**
 * Document Handler Module
 * Handles embedded document display and extraction
 */

class DocumentHandler {
    constructor() {
        this.documentListElement = document.getElementById('documentList');
        this.documentsTabElement = document.getElementById('documents-tab');
        this.currentDocuments = [];

        // Initialize event listeners
        this.initEventListeners();
    }

    /**
     * Set up event delegation for document list
     */
    initEventListeners() {
        // Use event delegation for document actions
        this.documentListElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-doc-button')) {
                const docIndex = parseInt(e.target.getAttribute('data-index'));
                if (this.currentDocuments[docIndex]) {
                    this.downloadDocument(this.currentDocuments[docIndex]);
                }
            }
        });
    }

    /**
     * Displays the list of embedded documents
     * @param {Array} documents - Array of document objects
     */
    displayDocuments(documents) {
        this.currentDocuments = documents || [];

        if (!this.currentDocuments.length) {
            this.documentListElement.innerHTML = '';
            this.documentsTabElement.innerHTML = '<p>No embedded documents found in this DICOM file.</p>';
            return;
        }

        let html = '';

        for (let i = 0; i < this.currentDocuments.length; i++) {
            const doc = this.currentDocuments[i];
            const docType = DocumentTypeDetector.detectType(doc.buffer);

            html += `<li class="document-item">
                <div class="document-info">
                    <strong>Document ${i+1}</strong> (${doc.length} bytes, ${docType.mimeType})
                </div>
                <div class="document-actions">
                    <button class="download-doc-button" data-index="${i}">Download</button>
                </div>
            </li>`;
        }

        this.documentListElement.innerHTML = html;
    }

    /**
     * Download an embedded document
     * @param {Object} docData - Document data object
     */
    downloadDocument(docData) {
        const docType = DocumentTypeDetector.detectType(docData.buffer);
        const blob = new Blob([docData.buffer], { type: docType.mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `document.${docType.extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

window.DocumentHandler = DocumentHandler;
