/**
 * Image processor module for Docsify PDF Generator
 */
const ImageProcessor = (function() {
    // Check if a URL is an SVG
    function isSVG(url) {
        return url.toLowerCase().endsWith('.svg') || url.toLowerCase().includes('image/svg');
    }
    
    // Load an image from URL
    function loadImage(url) {
        return new Promise((resolve, reject) => {
            if (!url || url.trim() === '') {
                reject(new Error('Invalid image URL'));
                return;
            }
            
            const image = new Image();
            
            // Set a timeout in case the image takes too long to load
            const timeoutId = setTimeout(() => {
                reject(new Error(`Image load timeout: ${url}`));
            }, 30000); // 30-second timeout
            
            image.onload = () => {
                clearTimeout(timeoutId);
                resolve(image);
            };
            
            image.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            // Start loading the image
            image.src = url;
        });
    }
    
    // Calculate dimensions for an image with proper scaling
    function getImageDimensions(image, maxWidth, maxHeight, quality) {
        try {
            // Check for valid image object with dimensions
            if (!image || typeof image !== 'object' || !image.width || !image.height) {
                Logger.warn("Invalid image object received");
                return { width: 50, height: 50 }; // Return safe defaults
            }
            
            const imgWidth = Math.max(1, image.width || 1);
            const imgHeight = Math.max(1, image.height || 1);
            
            // Scale factors for different quality settings
            let scaleFactor;
            switch (quality) {
                case 'low':
                    scaleFactor = 0.5;
                    break;
                case 'high':
                    scaleFactor = 1.0;
                    break;
                case 'medium':
                default:
                    scaleFactor = 0.75;
                    break;
            }
            
            // Calculate proportional dimensions with safety checks
            let pdfWidth = Math.max(1, imgWidth * scaleFactor);
            let pdfHeight = Math.max(1, imgHeight * scaleFactor);
            
            // If image is too large, scale it down proportionally
            if (pdfWidth > maxWidth) {
                const ratio = maxWidth / pdfWidth;
                pdfWidth = maxWidth;
                pdfHeight = Math.max(1, pdfHeight * ratio);
            }
            
            // Check height constraint
            if (pdfHeight > maxHeight) {
                const ratio = maxHeight / pdfHeight;
                pdfHeight = maxHeight;
                pdfWidth = Math.max(1, pdfWidth * ratio);
            }
            
            // Ensure minimum dimensions and maximum dimensions
            pdfWidth = Math.min(maxWidth, Math.max(1, pdfWidth));
            pdfHeight = Math.min(maxHeight, Math.max(1, pdfHeight));
            
            return { width: pdfWidth, height: pdfHeight };
        } catch (e) {
            Logger.error("Error calculating image dimensions:", e);
            return { width: 50, height: 50 }; // Return safe defaults
        }
    }
    
    // Convert SVG to a raster image - optimized for performance
    function convertSVGToRaster(svgElement, options) {
        return new Promise((resolve, reject) => {
            try {
                // Create canvas with a reasonable scale factor for better performance
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // More reasonable scaling factor (3x instead of 6x)
                const scaleFactor = options.quality === 'high' ? 4 : 
                                   options.quality === 'low' ? 2 : 3;
                                   
                canvas.width = options.width * scaleFactor;
                canvas.height = options.height * scaleFactor;
                
                // Clone SVG and set proper attributes
                const svgClone = svgElement.cloneNode(true);
                svgClone.setAttribute('width', canvas.width);
                svgClone.setAttribute('height', canvas.height);
                
                if (!svgClone.getAttribute('viewBox')) {
                    svgClone.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);
                }
                
                // Get SVG as data URL
                let svgString = new XMLSerializer().serializeToString(svgClone);
                if (!svgString.includes('xmlns=')) {
                    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                
                const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                
                // Load SVG as image
                const img = new Image();
                img.onload = () => {
                    // Draw on canvas
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to data URL
                    const dataUrl = canvas.toDataURL('image/png', 0.95);
                    
                    // Create final image
                    const finalImage = new Image();
                    finalImage.onload = () => {
                        resolve(finalImage);
                    };
                    finalImage.onerror = () => {
                        reject(new Error('Failed to create image from SVG canvas'));
                    };
                    finalImage.src = dataUrl;
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load SVG for raster conversion'));
                };
                
                img.src = svgUrl;
            } catch (err) {
                reject(err);
            }
        });
    }
    
    return {
        isSVG,
        loadImage,
        getImageDimensions,
        convertSVGToRaster
    };
})();
