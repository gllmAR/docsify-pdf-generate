/**
 * SVG handler module for Docsify PDF Generator
 */
const SVGHandler = (function() {
    // Load SVG as a DOM element
    function loadSVGElement(url) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch SVG: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(svgText => {
                    // Create a container div to hold the SVG
                    const container = document.createElement('div');
                    container.innerHTML = svgText.trim();
                    
                    // Get the SVG element
                    const svgElement = container.querySelector('svg');
                    if (!svgElement) {
                        throw new Error('No SVG element found in response');
                    }
                    
                    resolve(svgElement);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
    
    // Simplified version detection - just test once
    let svgVersionType = null;
    
    // Check if svg2pdf is properly loaded
    function isSVG2PDFAvailable() {
        return typeof window.svg2pdf === 'function';
    }
    
    // Check if the modern svg2pdf integration is available
    function isModernSvg2pdfAvailable() {
        return typeof window.jspdf !== 'undefined' && 
               typeof window.jspdf.jsPDF !== 'undefined' &&
               typeof window.jspdf.jsPDF.prototype.svg === 'function';
    }
    
    // Get SVG2PDF version type (synchronous or promise-based)
    // Tests only once and caches the result for better performance
    function getSVG2PDFVersionType() {
        if (svgVersionType !== null) {
            return svgVersionType;
        }
        
        try {
            // Simple test with minimal SVG
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            testSvg.setAttribute('width', '5');
            testSvg.setAttribute('height', '5');
            
            // Simple mock PDF object
            const mockPdf = {
                addImage: () => {},
                saveGraphicsState: () => {},
                restoreGraphicsState: () => {}
            };
            
            const result = window.svg2pdf(testSvg, mockPdf, { x: 0, y: 0, width: 5, height: 5 });
            svgVersionType = result && typeof result.then === 'function' ? 'promise' : 'sync';
            return svgVersionType;
        } catch (e) {
            // Fallback to sync as default
            svgVersionType = 'sync';
            return svgVersionType;
        }
    }
    
    // Process SVG for PDF rendering - simplified for reliability and performance
    async function processSVG(svgElement, doc, options) {
        try {
            Logger.debug(`Processing SVG at (${options.x}, ${options.y})`);
            
            // IMPORTANT: Always use raster mode temporarily for reliability
            // Until vector rendering issues are resolved
            await rasterizeSVG(svgElement, doc, options);
        } catch (error) {
            Logger.error("SVG processing error:", error);
            throw error;
        }
    }
    
    // Faster rasterization with improved quality settings
    function rasterizeSVG(svgElement, doc, options) {
        return new Promise((resolve, reject) => {
            try {
                // Increase scale factor for better quality
                // Use a higher resolution scaling for better detail preservation
                const scaleFactor = options.quality === 'high' ? 6 : 
                                   options.quality === 'low' ? 3 : 4;
                
                // Use canvas for rendering
                const canvas = document.createElement('canvas');
                canvas.width = options.width * scaleFactor;
                canvas.height = options.height * scaleFactor;
                const ctx = canvas.getContext('2d');
                
                // Set up SVG for rendering with proper dimensions
                const svgClone = svgElement.cloneNode(true);
                svgClone.setAttribute('width', canvas.width);
                svgClone.setAttribute('height', canvas.height);
                
                // Ensure viewBox is set
                if (!svgClone.getAttribute('viewBox')) {
                    svgClone.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);
                }
                
                // Convert to data URL
                const svgString = new XMLSerializer().serializeToString(svgClone);
                const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                
                // Render SVG to canvas with quality enhancements
                const img = new Image();
                img.onload = function() {
                    // White background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Enable anti-aliasing and high-quality image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw the image with better quality
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Get PNG data at high quality
                    const pngData = canvas.toDataURL('image/png', 1.0); // Use maximum PNG quality
                    
                    try {
                        // Record current page for validation
                        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
                        Logger.debug(`Adding SVG on page ${currentPage}`);
                        
                        // Add directly to PDF
                        doc.addImage(
                            pngData,
                            'PNG',
                            options.x,
                            options.y,
                            options.width,
                            options.height
                        );
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };
                
                img.onerror = function(err) {
                    reject(new Error(`SVG rasterization failed: ${err}`));
                };
                
                img.src = svgUrl;
            } catch (err) {
                reject(err);
            }
        });
    }
    
    return {
        loadSVGElement,
        isSVG2PDFAvailable,
        isModernSvg2pdfAvailable,
        processSVG
    };
})();
