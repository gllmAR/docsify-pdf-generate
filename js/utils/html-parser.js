/**
 * HTML Parser module for Docsify PDF Generator
 * Handles parsing and rendering HTML content within Markdown
 */
const HtmlParser = (function() {
    // Create a temporary container to parse HTML strings safely
    function parseHtml(htmlString) {
        try {
            // Create a container div
            const container = document.createElement('div');
            container.innerHTML = sanitizeHtml(htmlString);
            
            return container.firstElementChild;
        } catch (error) {
            Logger.error('Failed to parse HTML:', error);
            return null;
        }
    }
    
    // Basic HTML sanitizer to prevent XSS
    function sanitizeHtml(html) {
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/g, '')
            .replace(/on\w+='[^']*'/g, '');
    }
    
    // Parse CSS style attribute into an object
    function parseStyle(styleAttr) {
        if (!styleAttr) return {};
        
        const result = {};
        const styles = styleAttr.split(';');
        
        styles.forEach(style => {
            if (!style.trim()) return;
            
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                // Convert property to camelCase for JavaScript
                const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelProperty] = value;
            }
        });
        
        return result;
    }
    
    // Convert common CSS colors to RGB arrays for jsPDF
    function cssColorToRgb(color) {
        // Basic color map
        const colorMap = {
            'black': [0, 0, 0],
            'white': [255, 255, 255],
            'red': [255, 0, 0],
            'green': [0, 128, 0],
            'blue': [0, 0, 255],
            'yellow': [255, 255, 0],
            'cyan': [0, 255, 255],
            'magenta': [255, 0, 255],
            'gray': [128, 128, 128],
            'darkgray': [64, 64, 64],
            'lightgray': [211, 211, 211]
        };
        
        if (!color) return null;
        
        // Check if it's a named color
        if (colorMap[color.toLowerCase()]) {
            return colorMap[color.toLowerCase()];
        }
        
        // Handle hex colors
        if (color.startsWith('#')) {
            let hex = color.substring(1);
            
            // Convert short hex format (#rgb) to full format (#rrggbb)
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            
            if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return [r, g, b];
            }
        }
        
        // Handle rgb() format
        const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (rgbMatch) {
            return [
                parseInt(rgbMatch[1], 10),
                parseInt(rgbMatch[2], 10), 
                parseInt(rgbMatch[3], 10)
            ];
        }
        
        return null;
    }
    
    // Convert HTML element to formatted content for the PDF generator
    function convertHtmlElement(element) {
        if (!element) return null;
        
        // Parse element properties
        const tagName = element.tagName.toLowerCase();
        const styleAttr = element.getAttribute('style');
        const styles = parseStyle(styleAttr);
        const content = element.textContent.trim();
        
        // Create formatted segments
        const segments = [];
        const formats = [];
        
        // Determine text format based on element and styles
        if (tagName === 'b' || tagName === 'strong' || styles.fontWeight === 'bold') {
            formats.push('bold');
        }
        
        if (tagName === 'i' || tagName === 'em' || styles.fontStyle === 'italic') {
            formats.push('italic');
        }
        
        if (tagName === 'u' || styles.textDecoration === 'underline') {
            formats.push('underline');
        }
        
        if (tagName === 'code' || tagName === 'pre') {
            formats.push('inlinecode');
        }
        
        // Generate format string
        let format = 'normal';
        if (formats.includes('bold') && formats.includes('italic')) {
            format = 'bolditalic';
        } else if (formats.includes('bold')) {
            format = 'bold';
        } else if (formats.includes('italic')) {
            format = 'italic';
        } else if (formats.includes('inlinecode')) {
            format = 'inlinecode';
        }
        
        // Build segment object
        const segment = {
            text: content,
            format: format
        };
        
        // Add color if specified
        if (styles.color) {
            segment.color = cssColorToRgb(styles.color);
        }
        
        segments.push(segment);
        
        // Return a structured element for the PDF generator
        return {
            type: 'htmlContent',
            tagName: tagName,
            content: content,
            segments: segments,
            styles: styles
        };
    }
    
    // Main function to parse HTML content for use in the PDF generator
    function parseHtmlContent(htmlString) {
        // Parse the HTML string into a DOM element
        const element = parseHtml(htmlString);
        if (!element) return null;
        
        // Convert to PDF-compatible format
        return convertHtmlElement(element);
    }
    
    // Improved HTML block parser that better handles inline HTML
    function parseHtmlBlock(markdownBlock) {
        try {
            // More robust HTML tag detection
            const htmlMatch = markdownBlock.match(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/);
            if (!htmlMatch) return null;
            
            const [fullMatch, tagName, attributes, content] = htmlMatch;
            
            // Skip if this is not a recognized HTML element
            if (!['div', 'span', 'p', 'b', 'i', 'strong', 'em', 'code', 'pre'].includes(tagName.toLowerCase())) {
                return null;
            }

            Logger.debug(`Found HTML element: <${tagName}> with attributes: ${attributes}`);
            
            // Create a full HTML string
            const htmlString = fullMatch;
            
            // Parse the HTML
            return parseHtmlContent(htmlString);
        } catch (error) {
            Logger.error('Error parsing HTML block:', error);
            return null;
        }
    }
    
    // Apply HTML styling to PDF context
    function applyHtmlStyling(doc, element) {
        if (!element || !element.segments) return;
        
        element.segments.forEach(segment => {
            // Apply font style
            if (segment.format === 'bold') {
                doc.setFont('Helvetica', 'bold');
            } else if (segment.format === 'italic') {
                doc.setFont('Helvetica', 'italic');
            } else if (segment.format === 'bolditalic') {
                doc.setFont('Helvetica', 'bolditalic');
            } else if (segment.format === 'inlinecode') {
                doc.setFont('Courier', 'normal');
            } else {
                doc.setFont('Helvetica', 'normal');
            }
            
            // Apply text color
            if (segment.color) {
                doc.setTextColor(segment.color[0], segment.color[1], segment.color[2]);
            } else {
                doc.setTextColor(0, 0, 0);
            }
        });
    }
    
    // Reset styling back to defaults
    function resetStyling(doc) {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
    }
    
    return {
        parseHtmlContent,
        parseHtmlBlock,
        applyHtmlStyling,
        resetStyling
    };
})();
