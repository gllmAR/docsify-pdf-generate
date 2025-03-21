/**
 * Improved SVG2PDF fallback implementation - synchronous version
 * This provides reliable SVG rendering functionality if the full library can't be loaded
 */
(function (global) {
    if (typeof global.svg2pdf === 'function') {
        console.log('SVG2PDF already loaded, not initializing fallback');
        return;
    }

    // Enhanced function to convert an SVG to an image and then add it to PDF
    // This version is synchronous to match older versions of svg2pdf
    global.svg2pdf = function(svgElement, pdf, options) {
        try {
            console.log("Using fallback SVG renderer - synchronous mode");
            
            // Create a canvas element for rendering the SVG
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match the target dimensions
            canvas.width = options.width * 2;  // Higher resolution for better quality
            canvas.height = options.height * 2;
            
            // Convert SVG to data URL using a synchronous approach
            // This is a workaround to solve the async issue - SVGs are rendered
            // as embedded images in the PDF
            
            // Get SVG data as XML
            const svgString = new XMLSerializer().serializeToString(svgElement);
            
            // Add XML declaration if missing
            if (!svgString.includes('<?xml')) {
                const xmlDeclaration = '<?xml version="1.0" standalone="no"?>';
                svgString = xmlDeclaration + svgString;
            }
            
            // Create a data URL from the SVG
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            
            // Create an image object
            const img = new Image();
            
            // Use a flag to check if the image is loaded
            let imgLoaded = false;
            
            // Set up the onload handler
            img.onload = function() {
                imgLoaded = true;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert canvas to data URL
                const pngDataUrl = canvas.toDataURL('image/png');
                
                // Add the image to the PDF
                pdf.addImage(
                    pngDataUrl,
                    'PNG',
                    options.x,
                    options.y,
                    options.width,
                    options.height
                );
            };
            
            // Load the SVG data URL
            img.src = svgDataUrl;
            
            // Use a timeout to allow the image to load
            // This is a hack to make the synchronous API work
            const startTime = Date.now();
            const timeout = 1000; // 1 second timeout
            
            while (!imgLoaded && (Date.now() - startTime < timeout)) {
                // Wait for the image to load
            }
            
            // Return nothing to match the synchronous API
            return;
        } catch (err) {
            console.error('Error in SVG fallback:', err);
            // Synchronous API doesn't return anything
            return;
        }
    };
    
    console.log('Synchronous SVG2PDF fallback initialized');
})(window);
