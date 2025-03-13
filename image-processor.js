/**
 * Image Processor Module
 * Handles DICOM image processing, rendering, and manipulation
 */

class ImageProcessor {
    constructor() {
        this.canvas = document.getElementById('dicomCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageContainer = document.getElementById('imageContainer');
        
        // Image manipulation settings
        this.zoomLevel = 1;
        this.panOffsetX = 0;
        this.panOffsetY = 0;
        this.filters = {
            brightness: 0,
            contrast: 0,
            invert: false
        };
        
        // Store original image data
        this.currentImage = null;
    }
    
    /**
     * Renders a DICOM image to the canvas
     * @param {Object} imageData The extracted DICOM image data
     */
    renderImage(imageData) {
        if (!imageData || !imageData.canvas) {
            console.error("No valid image data to render");
            return;
        }
        
        this.currentImage = imageData;
        
        // Reset canvas size to match image
        this.canvas.width = imageData.width;
        this.canvas.height = imageData.height;
        
        // Draw the image
        this.ctx.drawImage(imageData.canvas, 0, 0);
        
        // Reset view
        this.resetView();
    }
    
    /**
     * Updates canvas position based on zoom and pan
     */
    updateCanvasPosition() {
        this.canvas.style.transform = `translate(${this.panOffsetX}px, ${this.panOffsetY}px) scale(${this.zoomLevel})`;
        
        // Update zoom info if available
        const zoomInfoElement = document.getElementById('zoomInfo');
        if (zoomInfoElement) {
            zoomInfoElement.textContent = `Zoom: ${Math.round(this.zoomLevel * 100)}%`;
        }
    }
    
    /**
     * Center image in container
     */
    centerImage() {
        if (!this.currentImage) return;
        
        const containerWidth = this.imageContainer.clientWidth;
        const containerHeight = this.imageContainer.clientHeight;
        const imageWidth = this.canvas.width * this.zoomLevel;
        const imageHeight = this.canvas.height * this.zoomLevel;
        
        this.panOffsetX = (containerWidth - imageWidth) / 2;
        this.panOffsetY = (containerHeight - imageHeight) / 2;
        
        this.updateCanvasPosition();
    }
    
    /**
     * Adjusts zoom level
     * @param {number} delta - Amount to change zoom by
     * @param {Event} e - Mouse event (optional, for zooming toward cursor)
     */
    adjustZoom(delta, e) {
        if (!this.currentImage) return;
        
        // Store old zoom for calculating adjusted pan
        const oldZoom = this.zoomLevel;
        
        // Update zoom level with limits
        this.zoomLevel = Math.max(0.1, Math.min(10, this.zoomLevel + delta));
        
        // If mouse event is provided, zoom toward cursor position
        if (e) {
            const rect = this.imageContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Adjust pan to keep the point under the cursor at the same position
            this.panOffsetX = mouseX - (mouseX - this.panOffsetX) * (this.zoomLevel / oldZoom);
            this.panOffsetY = mouseY - (mouseY - this.panOffsetY) * (this.zoomLevel / oldZoom);
        }
        
        this.updateCanvasPosition();
    }
    
    /**
     * Reset zoom and pan
     */
    resetZoom() {
        if (!this.currentImage) return;
        
        this.zoomLevel = 1;
        this.centerImage();
    }
    
    /**
     * Fit image to container (Best Fit)
     */
    fitToContainer() {
        if (!this.currentImage) return;
        
        const containerWidth = this.imageContainer.clientWidth;
        const containerHeight = this.imageContainer.clientHeight;
        const imageWidth = this.canvas.width;
        const imageHeight = this.canvas.height;
        
        // Calculate the zoom level that would fit the image in the container
        const widthRatio = containerWidth / imageWidth;
        const heightRatio = containerHeight / imageHeight;
        
        // Use the smaller ratio to ensure the entire image fits
        this.zoomLevel = Math.min(widthRatio, heightRatio) * 0.95; // 95% to leave a small margin
        
        // Center the image
        this.centerImage();
    }
    
    /**
     * Start dragging (panning)
     * @param {MouseEvent} e - Mouse event
     */
    startDrag(e) {
        if (!this.currentImage) return false;
        
        this.isDragging = true;
        this.dragStartX = e.clientX - this.panOffsetX;
        this.dragStartY = e.clientY - this.panOffsetY;
        this.imageContainer.style.cursor = 'grabbing';
        return true;
    }
    
    /**
     * Handle drag (panning)
     * @param {MouseEvent} e - Mouse event
     */
    drag(e) {
        if (!this.isDragging) return;
        
        this.panOffsetX = e.clientX - this.dragStartX;
        this.panOffsetY = e.clientY - this.dragStartY;
        this.updateCanvasPosition();
    }
    
    /**
     * End dragging
     */
    endDrag() {
        this.isDragging = false;
        this.imageContainer.style.cursor = 'grab';
    }
    
    /**
     * Update image filters (brightness/contrast/invert)
     * @param {Object} filterSettings - Filter settings
     */
    updateFilters(filterSettings) {
        if (!this.currentImage) return;
        
        // Update filter settings
        if (filterSettings.hasOwnProperty('brightness')) {
            this.filters.brightness = filterSettings.brightness;
        }
        
        if (filterSettings.hasOwnProperty('contrast')) {
            this.filters.contrast = filterSettings.contrast;
        }
        
        if (filterSettings.hasOwnProperty('invert')) {
            this.filters.invert = filterSettings.invert;
        }
        
        this.applyFilters();
    }
    
    /**
     * Toggle invert filter
     */
    toggleInvert() {
        if (!this.currentImage) return;
        
        this.filters.invert = !this.filters.invert;
        this.applyFilters();
    }
    
    /**
     * Apply all filters to the image
     */
    applyFilters() {
        if (!this.currentImage || !this.currentImage.canvas) return;
        
        // Reset canvas
        this.canvas.width = this.currentImage.width;
        this.canvas.height = this.currentImage.height;
        
        // Draw original image
        this.ctx.drawImage(this.currentImage.canvas, 0, 0);
        
        // Apply filters using CSS
        let filterString = '';
        
        if (this.filters.brightness !== 0) {
            filterString += ` brightness(${100 + this.filters.brightness}%)`;
        }
        
        if (this.filters.contrast !== 0) {
            const contrastValue = (this.filters.contrast + 100) / 100;
            filterString += ` contrast(${contrastValue})`;
        }
        
        if (this.filters.invert) {
            filterString += ` invert(100%)`;
        }
        
        this.canvas.style.filter = filterString.trim();
    }
    
    /**
     * Reset all image adjustments
     */
    resetView() {
        if (!this.currentImage) return;
        
        // Reset zoom and pan
        this.zoomLevel = 1;
        this.centerImage();
        
        // Reset filters
        this.filters.brightness = 0;
        this.filters.contrast = 0;
        this.filters.invert = false;
        
        // Apply changes
        this.applyFilters();
    }
    
    /**
     * Creates a download of the current image
     * @returns {boolean} Success
     */
    downloadImage() {
        if (!this.currentImage) {
            return false;
        }
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            const context = canvas.getContext('2d');
            
            // Apply the current filters to the download
            if (this.filters.invert) {
                context.filter = 'invert(100%)';
            }
            
            if (this.filters.brightness !== 0 || this.filters.contrast !== 0) {
                const brightnessValue = this.filters.brightness;
                const contrastValue = (this.filters.contrast + 100) / 100;
                context.filter += ` brightness(${100 + brightnessValue}%) contrast(${contrastValue})`;
            }
            
            context.drawImage(this.canvas, 0, 0);
            
            // Create data URL and download
            const dataUrl = canvas.toDataURL('image/png');
            
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'dicom_image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            return true;
        } catch (error) {
            console.error("Error downloading image:", error);
            return false;
        }
    }
}

window.ImageProcessor = ImageProcessor;