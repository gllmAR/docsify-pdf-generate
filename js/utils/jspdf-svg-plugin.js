/**
 * Enhanced SVG Plugin for jsPDF - prioritizes high-quality rendering
 */
(function() {
    // Only add if jsPDF is available
    const addPlugin = function() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            setTimeout(addPlugin, 500);
            return;
        }
        
        console.log('Installing high-quality SVG plugin for jsPDF');
        const jsPDFAPI = window.jspdf.jsPDF.API;
        
        if (!jsPDFAPI) return;
        
        // Skip if already installed
        if (typeof jsPDFAPI.addSvgAsImageSync === 'function') return;
        
        // Enhanced SVG rendering with premium quality settings
        jsPDFAPI.addSvgAsImageSync = function(svg, x, y, w, h) {
            console.log(`Adding SVG at (${x}, ${y}) with dimensions ${w}x${h}`);
            
            try {
                // Create a high-res canvas with 6x scaling for premium quality
                const canvas = document.createElement('canvas');
                canvas.width = w * 6;  // 6x for premium quality
                canvas.height = h * 6;
                const ctx = canvas.getContext('2d');
                
                // Set high-quality rendering context
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Clean background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Convert SVG to string if needed
                let svgData = typeof svg === 'string' ? svg : new XMLSerializer().serializeToString(svg);
                
                // Fix SVG attributes if needed
                if (!svgData.includes('xmlns=')) {
                    svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                
                // Create SVG image
                const img = new Image();
                let loaded = false;
                
                img.onload = function() {
                    // Draw SVG on canvas with premium anti-aliasing
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    loaded = true;
                };
                
                img.onerror = function() {
                    console.error('Failed to load SVG in jsPDF plugin');
                    loaded = true; // Mark as loaded to continue
                };
                
                // Create reliable SVG data URL
                const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
                img.src = svgUrl;
                
                // Wait for image to load (synchronous)
                const startTime = Date.now();
                while (!loaded && (Date.now() - startTime < 2000)) {
                    // Intentional wait - required for sync operation
                }
                
                // Add to PDF at exact position with maximum quality
                const imgData = canvas.toDataURL('image/png', 1.0);
                this.addImage(imgData, 'PNG', x, y, w, h);
                return true;
            } catch (error) {
                console.error('SVG plugin error:', error);
                return false;
            }
        };
        
        // Promise version for compatibility
        jsPDFAPI.addSvgAsImage = function(svg, x, y, w, h) {
            this.addSvgAsImageSync(svg, x, y, w, h);
            return Promise.resolve(this);
        };
        
        console.log('High-quality SVG plugin installed successfully');
    };
    
    // Try multiple times to ensure it gets added
    addPlugin();
    setTimeout(addPlugin, 500);
    setTimeout(addPlugin, 1500);
})();
