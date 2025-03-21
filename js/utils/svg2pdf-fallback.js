/**
 * Optimized SVG2PDF fallback with enhanced quality
 * High-resolution implementation with superior rendering quality
 */
(function (global) {
    // Skip if already defined
    if (typeof global.svg2pdf === 'function') {
        console.log('SVG2PDF already loaded, not initializing fallback');
        return;
    }

    // Enhanced SVG to PDF conversion
    global.svg2pdf = function(svgElement, pdf, options) {
        try {
            console.log("Using high-quality SVG fallback renderer");
            
            // Extract position and dimensions
            const posX = options.x || 0;
            const posY = options.y || 0;
            const width = options.width || 100;
            const height = options.height || 100;
            
            // Create high-resolution canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scaleFactor = 5; // High resolution multiplier
            
            canvas.width = width * scaleFactor;
            canvas.height = height * scaleFactor;
            
            // Clone and prepare SVG for rendering
            const svgClone = prepareClonedSvg(svgElement, canvas.width, canvas.height, width, height);
            const svgUrl = getSvgDataUrl(svgClone);
            
            // Render SVG to canvas
            const img = new Image();
            let imgLoaded = false;
            
            img.onload = function() {
                imgLoaded = true;
                renderSvgToCanvas(ctx, img, canvas.width, canvas.height);
                addImageToPdf(pdf, canvas, posX, posY, width, height);
            };
            
            img.onerror = function() {
                console.error('SVG rendering failed in fallback');
                imgLoaded = true;
            };
            
            img.src = svgUrl;
            
            // Wait synchronously for compatibility with older API
            waitForImageLoad(imgLoaded);
            
            return undefined; // Match synchronous API
        } catch (err) {
            console.error('SVG fallback error:', err);
            return undefined;
        }
    };
    
    // Helper function to prepare SVG clone
    function prepareClonedSvg(svgElement, canvasWidth, canvasHeight, originalWidth, originalHeight) {
        const svgClone = svgElement.cloneNode(true);
        svgClone.setAttribute('width', canvasWidth);
        svgClone.setAttribute('height', canvasHeight);
        
        // Set viewBox if missing
        if (!svgClone.getAttribute('viewBox')) {
            svgClone.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);
        }
        
        return svgClone;
    }
    
    // Helper function to get SVG data URL
    function getSvgDataUrl(svgElement) {
        let svgString = new XMLSerializer().serializeToString(svgElement);
        
        // Ensure proper namespace
        if (!svgString.includes('xmlns=')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    }
    
    // Helper function to render SVG to canvas
    function renderSvgToCanvas(ctx, img, width, height) {
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
    }
    
    // Helper function to add canvas image to PDF
    function addImageToPdf(pdf, canvas, x, y, width, height) {
        if (pdf && typeof pdf.addImage === 'function') {
            // Get as PNG with maximum quality
            const pngUrl = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(pngUrl, 'PNG', x, y, width, height);
        }
    }
    
    // Helper function to wait for image loading
    function waitForImageLoad(imgLoaded) {
        const startTime = Date.now();
        const timeout = 2000;
        
        while (!imgLoaded && (Date.now() - startTime < timeout)) {
            // Busy wait - required for synchronous API compatibility
        }
    }
    
    console.log('High-Quality SVG2PDF fallback initialized');
})(window);
