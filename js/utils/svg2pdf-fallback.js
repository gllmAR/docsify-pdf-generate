/**
 * Optimized SVG2PDF fallback with enhanced quality
 * High-resolution implementation with superior rendering quality
 */
(function (global) {
    if (typeof global.svg2pdf === 'function') {
        console.log('SVG2PDF already loaded, not initializing fallback');
        return;
    }

    // Enhanced function to convert an SVG to a high-quality image and add it to PDF
    global.svg2pdf = function(svgElement, pdf, options) {
        try {
            console.log("Using high-quality SVG fallback renderer");
            
            // Extract position and dimensions
            const posX = typeof options.x === 'number' ? options.x : 0;
            const posY = typeof options.y === 'number' ? options.y : 0;
            const width = typeof options.width === 'number' ? options.width : 100;
            const height = typeof options.height === 'number' ? options.height : 100;
            
            // Create canvas with 5x resolution for high quality output
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width * 5;  // Significantly increase resolution
            canvas.height = height * 5;
            
            // Clone SVG and set attributes
            const svgClone = svgElement.cloneNode(true);
            svgClone.setAttribute('width', canvas.width);
            svgClone.setAttribute('height', canvas.height);
            
            if (!svgClone.getAttribute('viewBox')) {
                svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }
            
            // Ensure proper namespace
            let svgString = new XMLSerializer().serializeToString(svgClone);
            if (!svgString.includes('xmlns=')) {
                svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            // Convert to data URL with proper encoding
            const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            
            // Use an image to render with quality enhancements
            const img = new Image();
            let imgLoaded = false;
            
            img.onload = function() {
                imgLoaded = true;
                
                // Enable high-quality rendering settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw to canvas with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Get as PNG with maximum quality
                const pngUrl = canvas.toDataURL('image/png', 1.0);
                
                // Add to PDF
                if (pdf && typeof pdf.addImage === 'function') {
                    pdf.addImage(
                        pngUrl,
                        'PNG',
                        posX,
                        posY,
                        width,
                        height
                    );
                }
            };
            
            img.onerror = function() {
                console.error('SVG rendering failed in fallback');
                imgLoaded = true;
            };
            
            img.src = svgUrl;
            
            // Wait synchronously for compatibility
            const startTime = Date.now();
            const timeout = 2000;
            
            while (!imgLoaded && (Date.now() - startTime < timeout)) {
                // Waiting loop for synchronous operation
            }
            
            // Return nothing for sync API
            return;
        } catch (err) {
            console.error('SVG fallback error:', err);
            return;
        }
    };
    
    console.log('High-Quality SVG2PDF fallback initialized');
})(window);
