/**
 * LaTeX-style command parser for Docsify PDF Generator
 * Handles LaTeX-style commands embedded in HTML comments
 */
const LaTeXParser = (function() {
    // Process a LaTeX-style command from HTML comment
    function processCommand(line) {
        // Check for LaTeX-style commands wrapped in HTML comments
        const latexCommandMatch = line.trim().match(/<!--\s*\\(\w+)(?:\{(.*?)\})?\s*-->/i);
        if (!latexCommandMatch) return null;
        
        const command = latexCommandMatch[1];
        const parameter = latexCommandMatch[2] || null;
        
        switch (command.toLowerCase()) {
            case 'newpage':
                return {
                    type: 'pagebreak'
                };
                
            case 'vspace':
                // Add vertical space
                return {
                    type: 'vspace',
                    size: parameter ? parseInt(parameter) : 10 // Default 10mm if no parameter
                };
                
            case 'hline':
                // Add horizontal line
                return {
                    type: 'hr'
                };
                
            case 'textbf':
                // Bold text
                return {
                    type: 'styledText',
                    text: parameter,
                    style: 'bold'
                };
                
            case 'textit':
                // Italic text
                return {
                    type: 'styledText',
                    text: parameter,
                    style: 'italic'
                };
                
            case 'textcolor':
                // Extract color and text from parameter
                if (parameter) {
                    const colorMatch = parameter.match(/^(\w+)\}\{(.*)$/);
                    if (colorMatch) {
                        return {
                            type: 'styledText',
                            text: colorMatch[2],
                            style: 'color',
                            color: colorMatch[1]
                        };
                    }
                }
                break;
                
            case 'centering':
                // Enable centering for next element
                return {
                    type: 'alignment',
                    align: 'center'
                };
                
            case 'raggedright':
            case 'flushleft':
                // Left alignment (default)
                return {
                    type: 'alignment',
                    align: 'left'
                };
                
            case 'raggedleft':
            case 'flushright':
                // Right alignment
                return {
                    type: 'alignment',
                    align: 'right'
                };
                
            case 'justify':
                // Justified text
                return {
                    type: 'alignment',
                    align: 'justify'
                };
                
            default:
                // Unrecognized command
                return null;
        }
        
        return null;
    }
    
    return {
        processCommand
    };
})();
