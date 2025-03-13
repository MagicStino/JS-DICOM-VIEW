/**
 * Series Navigator Module
 * Provides filmstrip view and keyboard navigation for series
 */

function SeriesNavigator() {
    // Series data
    this.currentSeries = [];
    this.currentIndex = 0;

    // UI elements
    this.container = null;
    this.filmstrip = null;
    this.counter = null;

    // Initialize component
    this.initialize();
}

// Initialize the series navigator
SeriesNavigator.prototype.initialize = function() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'series-navigator';
    this.container.innerHTML = `
        <div class="navigator-toolbar">
            <button id="nav-prev" title="Previous Image (Left Arrow)">&lt;</button>
            <span id="image-counter">No images loaded</span>
            <button id="nav-next" title="Next Image (Right Arrow)">&gt;</button>
            <div class="navigator-spacer"></div>
            <button id="toggle-filmstrip" title="Toggle Filmstrip">Filmstrip</button>
        </div>
        <div class="filmstrip-container" style="display: none;">
            <div class="filmstrip-scroll">
                <div class="filmstrip" id="series-filmstrip"></div>
            </div>
        </div>
    `;

    // Get references to key elements
    this.filmstrip = this.container.querySelector('#series-filmstrip');
    this.counter = this.container.querySelector('#image-counter');
    this.filmstripContainer = this.container.querySelector('.filmstrip-container');

    // Add to document
    const viewerArea = document.querySelector('.viewer-area');
    viewerArea.insertBefore(this.container, document.querySelector('.patient-info'));

    // Set up event listeners
    this.setupEventListeners();
};

// Set up event listeners
SeriesNavigator.prototype.setupEventListeners = function() {
    // Navigation buttons
    const prevButton = this.container.querySelector('#nav-prev');
    const nextButton = this.container.querySelector('#nav-next');

    prevButton.addEventListener('click', () => {
        this.navigateToPrevious();
    });

    nextButton.addEventListener('click', () => {
        this.navigateToNext();
    });

    // Toggle filmstrip
    const toggleButton = this.container.querySelector('#toggle-filmstrip');
    toggleButton.addEventListener('click', () => {
        this.toggleFilmstrip();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only if we're not in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Left arrow: previous image
        if (e.key === 'ArrowLeft') {
            this.navigateToPrevious();
            e.preventDefault();
        }

        // Right arrow: next image
        if (e.key === 'ArrowRight') {
            this.navigateToNext();
            e.preventDefault();
        }
    });
};

// Load a series of images
SeriesNavigator.prototype.loadSeries = function(seriesData) {
    this.currentSeries = seriesData || [];
    this.currentIndex = 0;

    // Update counter
    this.updateCounter();

    // Generate filmstrip
    this.generateFilmstrip();

    // Show navigator only if we have multiple images
    this.container.style.display = this.currentSeries.length > 1 ? 'block' : 'none';

    // Hide filmstrip toggle if there's only one image
    const toggleButton = this.container.querySelector('#toggle-filmstrip');
    if (toggleButton) {
        toggleButton.style.display = this.currentSeries.length > 1 ? 'inline-block' : 'none';
    }

    // Make sure filmstrip is initially hidden
    this.filmstripContainer.style.display = 'none';
};

// Update image counter
SeriesNavigator.prototype.updateCounter = function() {
    if (this.currentSeries.length === 0) {
        this.counter.textContent = 'No images loaded';
    } else {
        this.counter.textContent = `${this.currentIndex + 1} / ${this.currentSeries.length}`;
    }

    // Also update filmstrip selection
    this.updateFilmstripSelection();
};

// Generate filmstrip thumbnails
SeriesNavigator.prototype.generateFilmstrip = function() {
    // Clear filmstrip
    this.filmstrip.innerHTML = '';

    // Add thumbnails
    this.currentSeries.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'filmstrip-thumbnail';
        thumbnail.setAttribute('data-index', index);

        // Create thumbnail image
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        thumbnail.appendChild(canvas);

        // Draw thumbnail
        this.drawThumbnail(canvas, image);

        // Add index number
        const indexNumber = document.createElement('div');
        indexNumber.className = 'thumbnail-index';
        indexNumber.textContent = index + 1;
        thumbnail.appendChild(indexNumber);

        // Add click handler
        thumbnail.addEventListener('click', () => {
            this.navigateToIndex(index);
        });

        this.filmstrip.appendChild(thumbnail);
    });

    // Mark current thumbnail as selected
    this.updateFilmstripSelection();
};

// Draw a thumbnail
SeriesNavigator.prototype.drawThumbnail = function(canvas, imageData) {
    if (!imageData || !imageData.canvas) {
        // Draw placeholder
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ddd';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillText('No image', canvas.width / 2, canvas.height / 2);
        return;
    }

    const ctx = canvas.getContext('2d');

    // Calculate aspect ratio
    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcRatio = srcWidth / srcHeight;

    // Calculate destination dimensions
    let dstWidth, dstHeight;
    if (srcRatio > 1) {
        // Landscape
        dstWidth = canvas.width;
        dstHeight = canvas.width / srcRatio;
    } else {
        // Portrait
        dstHeight = canvas.height;
        dstWidth = canvas.height * srcRatio;
    }

    // Calculate destination position (center)
    const dstX = (canvas.width - dstWidth) / 2;
    const dstY = (canvas.height - dstHeight) / 2;

    // Draw image
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        imageData.canvas,
        0, 0, srcWidth, srcHeight,
        dstX, dstY, dstWidth, dstHeight
    );
};

// Update filmstrip selection
SeriesNavigator.prototype.updateFilmstripSelection = function() {
    // Remove selection from all thumbnails
    const thumbnails = this.filmstrip.querySelectorAll('.filmstrip-thumbnail');
    thumbnails.forEach(thumbnail => {
        thumbnail.classList.remove('selected');
    });

    // Add selection to current thumbnail
    if (this.currentIndex >= 0 && this.currentIndex < thumbnails.length) {
        thumbnails[this.currentIndex].classList.add('selected');

        // Scroll thumbnail into view
        this.scrollThumbnailIntoView();
    }
};

// Scroll current thumbnail into view
SeriesNavigator.prototype.scrollThumbnailIntoView = function() {
    const thumbnail = this.filmstrip.querySelector(`.filmstrip-thumbnail.selected`);
    if (!thumbnail) return;

    const filmstripScroll = this.container.querySelector('.filmstrip-scroll');
    const thumbnailLeft = thumbnail.offsetLeft;
    const thumbnailWidth = thumbnail.offsetWidth;
    const scrollLeft = filmstripScroll.scrollLeft;
    const scrollWidth = filmstripScroll.offsetWidth;

    // If thumbnail is to the left of the visible area
    if (thumbnailLeft < scrollLeft) {
        filmstripScroll.scrollLeft = thumbnailLeft;
    }
    // If thumbnail is to the right of the visible area
    else if (thumbnailLeft + thumbnailWidth > scrollLeft + scrollWidth) {
        filmstripScroll.scrollLeft = thumbnailLeft + thumbnailWidth - scrollWidth;
    }
};

// Navigate to previous image
SeriesNavigator.prototype.navigateToPrevious = function() {
    if (this.currentSeries.length === 0) return;

    // Calculate new index (with wrap-around)
    const newIndex = (this.currentIndex - 1 + this.currentSeries.length) % this.currentSeries.length;
    this.navigateToIndex(newIndex);
};

// Navigate to next image
SeriesNavigator.prototype.navigateToNext = function() {
    if (this.currentSeries.length === 0) return;

    // Calculate new index (with wrap-around)
    const newIndex = (this.currentIndex + 1) % this.currentSeries.length;
    this.navigateToIndex(newIndex);
};

// Navigate to specific index
SeriesNavigator.prototype.navigateToIndex = function(index) {
    if (index < 0 || index >= this.currentSeries.length) return;

    // Update current index
    this.currentIndex = index;

    // Update counter
    this.updateCounter();

    // Trigger callback
    if (typeof window.onSeriesNavigate === 'function') {
        window.onSeriesNavigate(this.currentSeries[this.currentIndex], this.currentIndex);
    }
};

// Toggle filmstrip visibility
SeriesNavigator.prototype.toggleFilmstrip = function() {
    const isVisible = this.filmstripContainer.style.display !== 'none';
    this.filmstripContainer.style.display = isVisible ? 'none' : 'block';

    // Update button text
    const button = this.container.querySelector('#toggle-filmstrip');
    button.textContent = isVisible ? 'Filmstrip' : 'Hide Filmstrip';
};

// Set current index
SeriesNavigator.prototype.setCurrentIndex = function(index) {
    if (index < 0 || index >= this.currentSeries.length) return;

    this.currentIndex = index;
    this.updateCounter();
};

// Make the constructor available globally
window.SeriesNavigator = SeriesNavigator;
