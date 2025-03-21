/**
 * Element renderer module for PDF Generator
 */
const ElementRendererModule = (function() {
    // Initialize outline structure
    function initializeOutlineStructure(doc) {
        return {
            root: doc.outline.root,
            1: null,
            2: null,
            3: null,
            4: null,
            5: null,
            6: null
        };
    }

    // Render title page
    function renderTitlePage(doc, titleElement, options) {
        const { pageWidth, pageHeight } = options;
        const title = titleElement.text;
        const centerY = pageHeight / 2;
        
        doc.setFontSize(24);
        doc.text(title, pageWidth / 2, centerY, { align: 'center' });
        
        // Add footer with date - position higher to avoid overlap with page numbers
        const today = new Date();
        const dateStr = today.toLocaleDateString();
        doc.setFontSize(10);
        doc.text(`Generated on ${dateStr}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    }

    // Check if element is a layout command
    function isLayoutCommand(element) {
        return element.type === 'pagebreak' || 
               element.type === 'vspace' || 
               element.type === 'alignment' ||
               element.type === 'styledText';
    }

    // Process layout commands like page breaks, spacing, alignment
    function processLayoutCommand(element, doc, context) {
        const { currentPage, yPosition, options } = context;
        let result = {};
        
        switch(element.type) {
            case 'pagebreak':
                if (options.respectPageBreaks) {
                    doc.addPage();
                    result.currentPage = currentPage + 1;
                    result.yPosition = options.margin || 10;
                }
                break;
                
            case 'vspace':
                result.yPosition = yPosition + element.size;
                break;
                
            case 'alignment':
                result.alignment = element.align;
                break;
                
            case 'styledText':
                // Process styled text separately
                result = renderStyledText(element, doc, context);
                break;
        }
        
        return result;
    }
    
    // Render styled text (bold, italic, color)
    function renderStyledText(element, doc, context) {
        const { pageWidth, yPosition, alignment } = context;
        const margin = context.margin || 10;
        
        doc.setFontSize(12);
        
        switch (element.style) {
            case 'bold':
                doc.setFont('Helvetica', 'bold');
                break;
            case 'italic':
                doc.setFont('Helvetica', 'italic');
                break;
            case 'color':
                const colorMap = {
                    'red': [255, 0, 0],
                    'blue': [0, 0, 255],
                    'green': [0, 128, 0],
                    'black': [0, 0, 0],
                    'gray': [128, 128, 128]
                };
                const color = colorMap[element.color] || [0, 0, 0];
                doc.setTextColor(color[0], color[1], color[2]);
                break;
        }
        
        // Apply current alignment
        const textOptions = {};
        if (alignment === 'center') {
            textOptions.align = 'center';
            doc.text(element.text, pageWidth / 2, yPosition, textOptions);
        } else {
            doc.text(element.text, margin, yPosition);
        }
        
        // Reset styles
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        return { yPosition: yPosition + 7 };
    }
    
    // Render a header and add to outline
    function renderHeader(element, doc, context) {
        const { pageWidth, headerPageMap, outlineEntries, alignment } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        
        // Get theme settings if available
        let headerStyle = {};
        if (typeof ThemeManager !== 'undefined') {
            const theme = ThemeManager.getCurrentTheme();
            headerStyle = theme.elements.header[`h${element.level}`] || {};
        }
        
        // Apply theme settings or fallback to defaults
        const fontSize = headerStyle.fontSize || (24 - (element.level * 2));
        const fontWeight = headerStyle.fontWeight || (element.level <= 2 ? 'bold' : 'normal');
        
        // Use Unicode font if available, otherwise fallback
        const isUsingUnicodeFont = doc.__currentFont && doc.__currentFont.encoding === 'Identity-H';
        if (isUsingUnicodeFont) {
            doc.setFont("NotoSans", fontWeight);
        } else {
            doc.setFont('Helvetica', fontWeight);
        }
        
        doc.setFontSize(fontSize);
        
        // Apply header color from theme if available
        if (headerStyle.color) {
            doc.setTextColor(headerStyle.color[0], headerStyle.color[1], headerStyle.color[2]);
        } else {
            // Fallback to text color
            if (typeof ThemeManager !== 'undefined') {
                const textColor = ThemeManager.getCurrentTheme().text.color;
                doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            }
        }
        
        // Calculate proper vertical position for text (baseline adjustment)
        const headerLineHeight = fontSize * 0.5;
        const verticalTextPosition = yPosition + headerLineHeight/2;
        
        // Apply current alignment
        if (alignment === 'center') {
            doc.text(element.text, pageWidth / 2, verticalTextPosition, { align: 'center', baseline: 'middle' });
        } else {
            doc.text(element.text, margin, verticalTextPosition, { baseline: 'middle' });
        }
        
        // Add to outline with proper nesting
        const headingLevel = element.level;
        
        // Find the parent for this heading level
        let parent;
        if (headingLevel === 1) {
            // Top-level headings attach to root
            parent = outlineEntries.root;
        } else {
            // Find the closest higher level heading as parent
            for (let parentLevel = headingLevel - 1; parentLevel >= 1; parentLevel--) {
                if (outlineEntries[parentLevel]) {
                    parent = outlineEntries[parentLevel];
                    break;
                }
            }
            
            // If no parent found, use root
            if (!parent) {
                parent = outlineEntries.root;
            }
        }
        
        // Add outline entry with correct parent
        const outlineEntry = doc.outline.add(parent, element.text, { pageNumber: currentPage });
        
        // Save this entry for future children
        outlineEntries[headingLevel] = outlineEntry;
        
        // Reset all lower level entries
        for (let level = headingLevel + 1; level <= 6; level++) {
            outlineEntries[level] = null;
        }
        
        // Store the header ID and page for links
        if (element.id) {
            Logger.debug(`Mapping header '${element.text}' with ID '${element.id}' to page ${currentPage}`);
            headerPageMap.set(element.id, currentPage);
            
            // Also store with hash prefix for direct hash lookups
            headerPageMap.set('#' + element.id, currentPage);
            
            // Store with dash-separated format (common with TOC links)
            const dashFormat = element.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            headerPageMap.set(dashFormat, currentPage);
            
            // Also store with spaces for fuzzy matching
            headerPageMap.set(element.text.toLowerCase(), currentPage);
            
            Logger.debug(`Header "${element.text}" mapped to: ${element.id}, #${element.id}, ${dashFormat}`);
        }
        
        // Adjust vertical position for next element
        yPosition += fontSize + 5;
        
        // Reset text color after rendering
        if (typeof ThemeManager !== 'undefined') {
            const textColor = ThemeManager.getCurrentTheme().text.color;
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        } else {
            doc.setTextColor(0, 0, 0); // Default black
        }
        
        return { yPosition, currentPage };
    }
    
    // Render element based on its type
    async function renderElement(element, doc, context) {
        // CRITICAL FIX: Ensure text color is properly set for dark theme before rendering any element
        if (typeof ThemeManager !== 'undefined' && doc.__currentTheme &&
            doc.__currentTheme.page.backgroundColor !== 'transparent') {
            // For dark theme, explicitly ensure correct text color before each element
            const textColor = doc.__currentTheme.text.color;
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
        
        // Handle specific element types
        switch(element.type) {
            case 'header':
                return renderHeader(element, doc, context);
            case 'text':
                return renderText(element, doc, context);
                
            case 'image':
                return await renderImage(element, doc, context);
                
            case 'list':
                return renderList(element, doc, context);
                
            case 'codeBlock':
                return renderCodeBlock(element, doc, context);
                
            case 'blockquote':
                return renderBlockquote(element, doc, context);
                
            case 'hr':
                return renderHorizontalRule(doc, context);
                
            case 'table':
                return await renderTable(element, doc, context);
                
            case 'formattedText':
                return renderFormattedText(element, doc, context);
                
            case 'htmlContent':
                return renderHtmlContent(element, doc, context);
                
            default:
                return context;
        }
    }
    
    // Render plain text with simplified handling
    function renderText(element, doc, context) {
        const { pageWidth, contentWidth, alignment } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        // Set fonts
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        
        // Ensure text is visible in dark theme
        if (doc.__currentTheme && doc.__currentTheme.page.backgroundColor !== 'transparent') {
            const textColor = doc.__currentTheme.text.color;
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
        
        // Process text (normalization happens in the doc.text method override)
        let processedText = element.text;
        
        // Use a smaller width for text wrapping to prevent edge cutting
        const safeWidth = contentWidth * 0.95; // 95% of available width
        const textLines = doc.splitTextToSize(processedText, safeWidth);
        
        // Apply current alignment
        const textOptions = {};
        if (alignment === 'center') {
            textOptions.align = 'center';
            doc.text(textLines, pageWidth / 2, yPosition, textOptions);
        } else if (alignment === 'right') {
            textOptions.align = 'right';
            doc.text(textLines, pageWidth - margin, yPosition, textOptions);
        } else if (alignment === 'justify') {
            // Basic justified text
            const justifiedLines = textLines.map(line => {
                if (line.length < 30) return line;
                return line.replace(/\s+/g, '  ');
            });
            doc.text(justifiedLines, margin, yPosition);
        } else {
            // Default left alignment
            doc.text(textLines, margin, yPosition);
        }
        
        // Increase line spacing for better readability
        const lineHeight = 6;
        yPosition += (textLines.length * lineHeight) + 4;
        
        return { yPosition };
    }
    
    // Render list (bulleted or numbered)
    function renderList(element, doc, context) {
        const { headerPageMap } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        const listIndent = 5;
        
        // Check if this is a TOC and process it specially
        const isTOC = detectAndProcessTOC(element, doc, context);
        
        doc.setFontSize(12);
        
        // Track counters for each level of ordered list
        const levelCounters = {};
        
        // Loop through each list item
        for (let j = 0; j < element.items.length; j++) {
            const item = element.items[j];
            const itemIndent = margin + (item.level * listIndent);
            
            // If this item won't fit on the page, add a new page
            if (yPosition > context.pageHeight - margin * 2) {
                doc.addPage();
                currentPage++;
                yPosition = margin;
            }
            
            // For ordered lists, handle numbering with proper nesting
            if (element.listType === 'ol') {
                // Initialize or update counter for this level
                // FIXED: Reset counters for higher nesting levels when level changes
                if (j === 0 || element.items[j-1].level !== item.level) {
                    // Reset all deeper level counters when the level changes
                    if (j > 0) {
                        const prevLevel = element.items[j-1].level;
                        if (item.level > prevLevel) {
                            // Going deeper - reset the counter for this new level
                            levelCounters[item.level] = item.originalNumber || 1;
                        } else {
                            // Going back to a less deep level - preserve counters
                            // but clear out any deeper levels
                            for (let l = item.level + 1; l <= 6; l++) {
                                delete levelCounters[l];
                            }
                            
                            // If we're returning to this level for the first time, initialize it
                            if (levelCounters[item.level] === undefined) {
                                levelCounters[item.level] = item.originalNumber || 1;
                            } else {
                                // Otherwise, continue from last count at this level
                                levelCounters[item.level]++;
                            }
                        }
                    } else {
                        // First item in the list
                        levelCounters[item.level] = item.originalNumber || 1;
                    }
                } else {
                    // Same level as previous item - increment counter
                    levelCounters[item.level]++;
                }
                
                // Get the current number for this item
                const itemNumber = levelCounters[item.level];
                
                // Draw the number
                doc.text(`${itemNumber}.`, itemIndent, yPosition);
                
                // Handle formatted text rendering if available
                if (item.hasFormatting && item.formattedSegments) {
                    renderFormattedListItem(doc, item, itemIndent + 7, yPosition);
                } else {
                    doc.text(item.text, itemIndent + 7, yPosition);
                    
                    // Add link if this item has one
                    if (item.hasLink && item.linkUrl && item.linkText) {
                        renderListItemLink(doc, item, itemIndent + 7, yPosition, headerPageMap); 
                    }
                }
            } else {
                // For unordered lists, just use bullets
                doc.text('•', itemIndent, yPosition);
                
                // Handle formatted text rendering if available
                if (item.hasFormatting && item.formattedSegments) {
                    renderFormattedListItem(doc, item, itemIndent + 5, yPosition);
                } else {
                    doc.text(item.text, itemIndent + 5, yPosition);
                    
                    // Add link if this item has one
                    if (item.hasLink && item.linkUrl && item.linkText) {
                        renderListItemLink(doc, item, itemIndent + 5, yPosition, headerPageMap);
                    }
                }
            }
            
            yPosition += 7;
        }
        
        yPosition += 3; // Add extra space after list
        return { yPosition, currentPage };
    }
    
    // Helper function for rendering list item links
    function renderListItemLink(doc, item, xPos, yPos, headerPageMap) {
        // Get the current font size
        const fontSize = doc.getFontSize();
        
        // Calculate the width of the text for the link rectangle
        const linkWidth = doc.getStringUnitWidth(item.linkText) * fontSize / doc.internal.scaleFactor;
        
        // Process link based on type
        if (item.linkUrl.startsWith('#')) {
            // Internal TOC link
            Logger.debug(`Creating TOC link: "${item.linkText}" (${item.linkUrl})`);
            const targetPage = LinkUtils.findHeaderPage(item.linkUrl, headerPageMap);
            
            if (targetPage) {
                Logger.debug(`Found target page ${targetPage} for list item "${item.linkText}" at position (${xPos}, ${yPos})`);
                
                try {
                    // Create a larger clickable area
                    const linkHeight = 10;
                    doc.link(
                        xPos - 1, // Slightly wider left side
                        yPos - 7, // Higher top for better click area
                        linkWidth + 2, // Slightly wider
                        linkHeight, 
                        { pageNumber: targetPage }
                    );
                    Logger.debug(`Created clickable link area: x=${xPos-1}, y=${yPos-7}, w=${linkWidth+2}, h=${linkHeight}`);
                } catch (linkError) {
                    Logger.error(`Error creating link: ${linkError.message}`);
                }
            } else {
                Logger.warn(`Target page not found for list item link: ${item.linkUrl}`);
            }
        } else if (item.linkUrl === '#') {
            // README.md converted to first page link
            doc.link(xPos, yPos - 7, linkWidth, 10, { pageNumber: 1 });
        } else {
            // External link
            doc.link(xPos, yPos - 7, linkWidth, 10, { url: item.linkUrl });
        }
    }
    
    // Helper function to render formatted text in list items
    function renderFormattedListItem(doc, item, xPos, yPos) {
        let currXPos = xPos;
        
        // Apply formatting to each segment
        item.formattedSegments.forEach(segment => {
            // Set font style based on format
            switch(segment.format) {
                case 'bold':
                    doc.setFont('Helvetica', 'bold');
                    break;
                case 'italic':
                    doc.setFont('Helvetica', 'italic');
                    break;
                case 'bolditalic':
                    doc.setFont('Helvetica', 'bolditalic');
                    break;
                case 'strikethrough':
                    // We'll handle strikethrough separately
                    doc.setFont('Helvetica', 'normal');
                    break;
                case 'inlinecode':
                    // FIXED: Use Courier font for inline code
                    doc.setFont('Courier', 'normal');
                    doc.setFontSize(10);
                    
                    // Add background for inline code in list items
                    const codeWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                    const padding = 2;
                    doc.setFillColor(240, 240, 240);
                    doc.rect(currXPos - padding, yPos - 4, codeWidth + (padding * 2), 7 + 1, 'F');
                    break;
                default:
                    doc.setFont('Helvetica', 'normal');
            }
            
            // Draw text segment
            doc.text(segment.text, currXPos, yPos);
            
            // Add strikethrough line if needed
            if (segment.format === 'strikethrough') {
                const textWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                if (doc.drawStrikethrough) {
                    doc.drawStrikethrough(currXPos, yPos - 2, textWidth);
                } else {
                    doc.line(currXPos, yPos - 2, currXPos + textWidth, yPos - 2);
                }
            }
            
            // Move x position for next segment - use current font metrics
            const textWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
            if (segment.format === 'inlinecode') {
                // Add padding to advance position correctly
                currXPos += textWidth + (padding * 2);
                // Reset font for next segment
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(12);
            } else {
                currXPos += textWidth;
            }
        });
        
        // Reset font styling
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        
        // Add link if this item has one
        if (item.hasLink && item.linkUrl && item.linkText) {
            renderListItemLink(doc, item, xPos, yPos, headerPageMap);
        }
    }
    
    // Handle image rendering
    async function renderImage(element, doc, context) {
        if (!context.options.includeImages) return context;
        
        const { pageWidth, pageHeight, contentWidth } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        
        try {
            // Check if this is an SVG image
            if (ImageProcessor.isSVG(element.url)) {
                return await renderSvgImage(element, doc, context);
            }
            
            // Handle as regular image
            try {
                const image = await ImageProcessor.loadImage(element.url);
                
                // Get safe dimensions
                const dims = ImageProcessor.getImageDimensions(
                    image, 
                    contentWidth, 
                    pageHeight - margin * 3,
                    context.options.imageQuality
                );
                
                // Check if image will fit on current page
                if (yPosition + dims.height > pageHeight - margin) {
                    doc.addPage();
                    currentPage++;
                    yPosition = margin;
                }
                
                // Determine if we should center the image (if it has alt text for caption)
                const hasCaption = element.alt && element.alt.trim() !== '';
                
                // Calculate x position - center if has caption
                const imgX = hasCaption ? (pageWidth - dims.width) / 2 : margin;
                
                // Add the image
                doc.addImage(
                    image, 
                    context.options.imageFormat || 'JPEG', 
                    imgX, 
                    yPosition, 
                    dims.width, 
                    dims.height,
                    '', // alias
                    'FAST' // More compatible compression
                );
                
                yPosition += dims.height;
                
                // Add caption if alt text exists
                if (hasCaption) {
                    // Format caption
                    doc.setFont('Helvetica', 'italic');
                    doc.setFontSize(10);
                    
                    // Split caption into multiple lines if needed
                    const captionLines = doc.splitTextToSize(element.alt, contentWidth - 20);
                    
                    // Add small spacing between image and caption
                    yPosition += 5;
                    
                    // Render caption centered
                    doc.text(captionLines, pageWidth / 2, yPosition, { align: 'center' });
                    
                    // Calculate space used by caption
                    const captionHeight = captionLines.length * 5;
                    yPosition += captionHeight;
                    
                    // Reset font
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(12);
                }
                
                // Add extra spacing after image (with or without caption)
                yPosition += 10;
                
            } catch (imgError) {
                Logger.error('Error processing image:', imgError);
                // Add a placeholder for failed image
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(`[Image could not be loaded: ${element.url}]`, margin, yPosition);
                doc.setTextColor(0, 0, 0);
                yPosition += 10;
            }
        } catch (error) {
            Logger.error('General error in image processing:', error);
            yPosition += 10; // Add some space even on error
        }
        
        return { yPosition, currentPage };
    }
    
    // Render SVG image
    async function renderSvgImage(element, doc, context) {
        const { pageWidth, pageHeight, contentWidth } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        
        Logger.debug(`Processing SVG image: ${element.url}`);
        
        try {
            // Load the SVG element
            const svgElement = await SVGHandler.loadSVGElement(element.url);
            
            // Calculate dimensions with aspect ratio
            let svgWidth = parseFloat(svgElement.getAttribute('width') || 100);
            let svgHeight = parseFloat(svgElement.getAttribute('height') || 100);
            
            // Handle invalid dimensions
            if (isNaN(svgWidth) || String(svgWidth).includes('%') || svgWidth <= 0) {
                svgWidth = 100;
            }
            
            if (isNaN(svgHeight) || String(svgHeight).includes('%') || svgHeight <= 0) {
                svgHeight = 100;
            }
            
            // Calculate aspect ratio and fit width
            const aspectRatio = svgWidth / svgHeight;
            let width = Math.min(svgWidth, contentWidth);
            let height = width / aspectRatio;
            
            // Check if SVG fits on current page
            if (yPosition + height > pageHeight - margin) {
                doc.addPage();
                currentPage++;
                yPosition = margin;
            }
            
            // Determine if we should center the image (if it has alt text for caption)
            const hasCaption = element.alt && element.alt.trim() !== '';
            
            // Calculate x position - center if has caption
            const svgX = hasCaption ? (pageWidth - width) / 2 : margin;
            const svgY = yPosition;
            
            Logger.debug(`SVG position: (${svgX}, ${svgY}), size: ${width}x${height}, caption: ${hasCaption}`);
            
            // Process SVG - Use vector mode by default, overridden only if 'raster' is explicitly selected
            await SVGHandler.processSVG(svgElement, doc, {
                x: svgX,
                y: svgY,
                width: width,
                height: height,
                renderMode: context.options.svgHandling || 'vector', // Default to vector
                quality: context.options.imageQuality || 'high'
            });
            
            yPosition += height;
            
            // Add caption if alt text exists
            if (hasCaption) {
                // Format caption
                doc.setFont('Helvetica', 'italic');
                doc.setFontSize(10);
                
                // Split caption into multiple lines if needed
                const captionLines = doc.splitTextToSize(element.alt, contentWidth - 20);
                
                // Add small spacing between image and caption
                yPosition += 5;
                
                // Render caption centered
                doc.text(captionLines, pageWidth / 2, yPosition, { align: 'center' });
                
                // Calculate space used by caption
                const captionHeight = captionLines.length * 5;
                yPosition += captionHeight;
                
                // Reset font
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(12);
            }
            
            // Add extra spacing after image (with or without caption)
            yPosition += 10;
            
        } catch (svgError) {
            Logger.error('SVG processing failed:', svgError);
            
            // Add error placeholder
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`[SVG could not be loaded: ${element.url}]`, margin, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 10;
        }
        
        return { yPosition, currentPage };
    }
    
    // Render formatted text with styling and links
    function renderFormattedText(element, doc, context) {
        if (!element.segments || element.segments.length === 0) return context;
        
        // Get theme text color for resetting after segments
        let themeTextColor = [0, 0, 0]; // Default black
        if (typeof ThemeManager !== 'undefined') {
            themeTextColor = ThemeManager.getCurrentTheme().text.color;
        }
        
        const { pageWidth, contentWidth, alignment, headerPageMap } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        // Define line height for all text rendering paths
        const lineHeight = 6; // Increased from 5 for better readability
        
        // Use a safer approach for text wrapping - reduced width to prevent edge cutting
        const safeWidth = contentWidth * 0.95; // Use 95% of available width
        const textContent = element.segments.map(s => s.text).join('');
        const formattedLines = doc.splitTextToSize(textContent, safeWidth);
        
        // If there are multiple lines, we need to rebuild our segments for each line
        if (formattedLines.length > 1) {
            // Track position for multi-line text
            let lineYPos = yPosition;
            
            for (let lineIndex = 0; lineIndex < formattedLines.length; lineIndex++) {
                // Process each line with proper formatting
                let lineXPos;
                const currentLine = formattedLines[lineIndex];
                
                // Calculate text position based on alignment
                if (alignment === 'center') {
                    // Calculate width of current line for centered text
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(12);
                    const lineWidth = doc.getStringUnitWidth(currentLine) * doc.getFontSize() / doc.internal.scaleFactor;
                    lineXPos = (pageWidth - lineWidth) / 2;
                } else if (alignment === 'right') {
                    // Calculate right alignment position
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(12);
                    const lineWidth = doc.getStringUnitWidth(currentLine) * doc.getFontSize() / doc.internal.scaleFactor;
                    lineXPos = pageWidth - margin - lineWidth;
                } else {
                    // Default left alignment
                    lineXPos = margin;
                }
                
                // Process the line segments
                renderFormattedTextLine(doc, element.segments, currentLine, lineXPos, lineYPos, headerPageMap);
                
                // Move to the next line
                lineYPos += lineHeight + 3;
            }
            
            // Update final y position after all lines
            yPosition = lineYPos;
        } else {
            // Single line case - existing code but updated for right alignment
            let xPos;
            let yPos = yPosition;
            
            // Track total width for alignment calculations
            let totalWidth = 0;
            
            // Calculate total width for alignment
            element.segments.forEach(segment => {
                doc.setFont('Helvetica', getFontStyle(segment.format));
                doc.setFontSize(getFontSize(segment.format));
                totalWidth += doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
            });
            
            // Determine starting position based on alignment
            if (alignment === 'center') {
                xPos = (pageWidth - totalWidth) / 2;
            } else if (alignment === 'right') {
                xPos = pageWidth - margin - totalWidth;
            } else {
                xPos = margin; // Left alignment is default
            }
            
            // Render each segment - existing handling of segments...
            for (let j = 0; j < element.segments.length; j++) {
                const segment = element.segments[j];
                
                // Set font style based on format
                doc.setFont('Helvetica', getFontStyle(segment.format));
                doc.setFontSize(getFontSize(segment.format));
                
                // Handle inline code separately - FIXED: use correct font metrics
                if (segment.format === 'inlinecode') {
                    // Save current font settings
                    const originalFont = doc.getFont();
                    
                    // Switch to Courier for proper width calculation
                    doc.setFont('Courier', 'normal');
                    doc.setFontSize(10);
                    
                    // Calculate width with monospace font metrics
                    const codeWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                    
                    // Add padding scaled to font size
                    const padding = 2;
                    const paddedWidth = codeWidth + (padding * 2);
                    
                    // Draw background rectangle using monospace measurements
                    doc.setFillColor(240, 240, 240);
                    doc.rect(xPos - padding, yPos - 4, paddedWidth, lineHeight + 4, 'F');
                    
                    // Draw the text (still with Courier font)
                    doc.setTextColor(0, 0, 0);
                    doc.text(segment.text, xPos, yPos);
                    
                    // Update position using correct width
                    xPos += paddedWidth;
                    
                    // Restore original font
                    doc.setFont(originalFont.fontName, originalFont.fontStyle);
                    doc.setFontSize(12);
                } else {
                    // Draw the text segment
                    doc.text(segment.text, xPos, yPos);
                    
                    // Update x position for next segment using current font
                    const textWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                    xPos += textWidth;
                }
                
                // Add link if present
                if (segment.link) {
                    const textWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                    
                    // Check if it's an internal link
                    if (segment.link.startsWith('#')) {
                        const targetId = segment.link;
                        Logger.debug(`Looking up page for internal link: ${targetId}`);
                        const targetPage = LinkUtils.findHeaderPage(targetId, headerPageMap);
                        
                        if (targetPage) {
                            Logger.debug(`Found target page ${targetPage} for link "${segment.text}" (${targetId})`);
                            doc.link(xPos, yPos - 4, textWidth, lineHeight + 4, { pageNumber: targetPage });
                        } else {
                            Logger.warn(`No target page found for link "${segment.text}" (${targetId})`);
                        }
                    } else {
                        // External link
                        doc.link(xPos, yPos - 4, textWidth, lineHeight + 4, { url: segment.link });
                    }
                }
                
                // Reset styling
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
            }
            
            // Move to next line with better spacing
            yPosition += lineHeight + 4; // Increased from 3
        }
        
        // Reset to theme text color
        doc.setTextColor(themeTextColor[0], themeTextColor[1], themeTextColor[2]);
        
        return { yPosition };
    }
    
    // Helper for rendering formatted text line
    function renderFormattedTextLine(doc, segments, currentLine, xPos, yPos, headerPageMap) {
        let remainingLine = currentLine;
        let segmentIndex = 0;
        
        while (remainingLine.length > 0 && segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            const segText = segment.text;
            
            // If this segment is part of the current line
            if (remainingLine.startsWith(segText) || segText.startsWith(remainingLine)) {
                // Process this segment on the current line
                const textToRender = remainingLine.startsWith(segText) ? segText : remainingLine;
                
                // Set styling
                doc.setFont('Helvetica', getFontStyle(segment.format));
                doc.setFontSize(getFontSize(segment.format));
                
                // Handle inline code
                if (segment.format === 'inlinecode') {
                    // FIXED: Use Courier font for proper width calculation
                    const originalFont = doc.getFont();
                    
                    // Switch to Courier
                    doc.setFont('Courier', 'normal');
                    doc.setFontSize(10);
                    
                    // Calculate width with monospace font
                    const codeWidth = doc.getStringUnitWidth(textToRender) * doc.getFontSize() / doc.internal.scaleFactor;
                    const padding = 2;
                    
                    // Draw background
                    doc.setFillColor(240, 240, 240);
                    doc.rect(xPos - padding, yPos - 4, codeWidth + (padding * 2), 5 + 4, 'F');
                    
                    // Draw text
                    doc.text(textToRender, xPos, yPos);
                    
                    // Update position
                    xPos += codeWidth + (padding * 2);
                    
                    // Restore original font
                    doc.setFont(originalFont.fontName, originalFont.fontStyle);
                    doc.setFontSize(12);
                } else {
                    // Draw text
                    doc.text(textToRender, xPos, yPos);
                    
                    // Use correct font for width calculation
                    const textWidth = doc.getStringUnitWidth(textToRender) * doc.getFontSize() / doc.internal.scaleFactor;
                    xPos += textWidth;
                }
                
                // Add link if present
                if (segment.link) {
                    const textWidth = doc.getStringUnitWidth(textToRender) * doc.getFontSize() / doc.internal.scaleFactor;
                    
                    // Add the link rectangle over the text
                    if (segment.link.startsWith('#')) {
                        const targetId = segment.link.substring(1);
                        const targetPage = LinkUtils.findHeaderPage('#' + targetId, headerPageMap);
                        
                        if (targetPage) {
                            doc.link(xPos, yPos - 4, textWidth, 5 + 4, { pageNumber: targetPage });
                        }
                    } else {
                        doc.link(xPos, yPos - 4, textWidth, 5 + 4, { url: segment.link });
                    }
                }
                
                // Update remaining line content
                remainingLine = remainingLine.substring(textToRender.length);
            }
            
            segmentIndex++;
        }
    }

    // Render code block
    function renderCodeBlock(element, doc, context) {
        if (!context.options.includeCode) return context;
        
        const { contentWidth, pageHeight } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        
        // Get theme settings if available
        let codeStyle = { 
            backgroundColor: [240, 240, 240],
            borderColor: [200, 200, 200],
            color: [0, 0, 0]
        };
        
        if (typeof ThemeManager !== 'undefined') {
            const theme = ThemeManager.getCurrentTheme();
            codeStyle = theme.elements.codeBlock || codeStyle;
        }
        
        // Set up code block styling with theme colors
        doc.setFillColor(codeStyle.backgroundColor[0], codeStyle.backgroundColor[1], codeStyle.backgroundColor[2]);
        doc.setDrawColor(codeStyle.borderColor[0], codeStyle.borderColor[1], codeStyle.borderColor[2]);
        
        // Calculate height needed for code block
        doc.setFontSize(10);
        const codeLines = doc.splitTextToSize(element.content, contentWidth - 10);
        const codeBlockHeight = (codeLines.length * 5) + 10;
        
        // Check if code block will fit on page
        if (yPosition + codeBlockHeight > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            yPosition = margin;
        }
        
        // Draw code block background
        doc.rect(margin, yPosition, contentWidth, codeBlockHeight, 'FD');
        
        // Draw code with monospace font and theme colors
        doc.setFont('Courier', 'normal');
        doc.setTextColor(codeStyle.color[0], codeStyle.color[1], codeStyle.color[2]);
        doc.text(codeLines, margin + 5, yPosition + 7);
        
        // Reset text color
        if (typeof ThemeManager !== 'undefined') {
            const textColor = ThemeManager.getCurrentTheme().text.color;
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        } else {
            doc.setTextColor(0, 0, 0);
        }
        
        yPosition += codeBlockHeight + 5;
        
        return { yPosition, currentPage };
    }
    
    // Render blockquote
    function renderBlockquote(element, doc, context) {
        const { contentWidth, pageHeight } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        
        // Style for blockquote
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(200, 200, 200);
        
        // Calculate blockquote dimensions
        doc.setFontSize(12);
        const quoteLines = doc.splitTextToSize(element.text, contentWidth - 20);
        const quoteHeight = (quoteLines.length * 5) + 10;
        
        // Check if blockquote fits on page
        if (yPosition + quoteHeight > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            yPosition = margin;
        }
        
        // Draw blockquote background and left bar
        doc.rect(margin, yPosition, contentWidth, quoteHeight, 'FD');
        doc.setFillColor(180, 180, 180);
        doc.rect(margin, yPosition, 3, quoteHeight, 'F');
        
        // Draw text
        doc.setTextColor(80, 80, 80);
        doc.text(quoteLines, margin + 10, yPosition + 7);
        doc.setTextColor(0, 0, 0);
        
        yPosition += quoteHeight + 5;
        
        return { yPosition, currentPage };
    }
    
    // Render horizontal rule
    function renderHorizontalRule(doc, context) {
        const { pageWidth } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        // Draw horizontal rule
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        
        yPosition += 10;
        
        return { yPosition };
    }
    
    // Render table
    async function renderTable(element, doc, context) {
        if (!context.options.includeTables) return context;
        
        try {
            // Track current page before table rendering
            const tableStartPage = doc.internal.getCurrentPageInfo().pageNumber;
            Logger.debug(`Starting table rendering on page ${tableStartPage}`);
            
            // Process table and get updated position
            const tableResult = await TableRendererModule.renderTable(doc, element, {
                pageWidth: context.pageWidth,
                pageHeight: context.pageHeight,
                margin: context.margin || 10,
                contentWidth: context.contentWidth,
                yPosition: context.yPosition,
                currentPage: context.currentPage,
                imageQuality: context.options.imageQuality,
                imageFormat: context.options.imageFormat,
                svgHandling: context.options.svgHandling || 'vector' // Default to vector for tables
            });
            
            // Update current position and page
            const yPosition = tableResult.yPosition;
            const currentPage = tableResult.currentPage;
            
            // Verify we're on the correct page after table rendering
            const tableEndPage = doc.internal.getCurrentPageInfo().pageNumber;
            if (tableEndPage !== currentPage) {
                Logger.debug(`Correcting page after table: ${tableEndPage} → ${currentPage}`);
                doc.setPage(currentPage);
            }
            
            return { yPosition, currentPage };
        } catch (error) {
            Logger.error('Error rendering table:', error);
            return { yPosition: context.yPosition + 10 }; // Add some space even if table fails
        }
    }
    
    // Render HTML content
    function renderHtmlContent(element, doc, context) {
        const { pageWidth, contentWidth, alignment } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        // Apply HTML styling
        HtmlParser.applyHtmlStyling(doc, element);
        
        // Process each segment in the HTML content
        element.segments.forEach(segment => {
            // Set font size
            doc.setFontSize(12);
            
            // Split text into lines to handle wrapping
            const textLines = doc.splitTextToSize(segment.text, contentWidth);
            
            // Render the text
            if (alignment === 'center') {
                doc.text(textLines, pageWidth / 2, yPosition, { align: 'center' });
            } else {
                doc.text(textLines, margin, yPosition);
            }
            
            // Update position based on number of lines
            yPosition += (textLines.length * 5) + 3;
        });
        
        // Reset styling to defaults
        HtmlParser.resetStyling(doc);
        
        return { yPosition };
    }
    
    // Helper functions
    function getFontStyle(format) {
        switch(format) {
            case 'bold':
            case 'bolditalic':
                return 'bold';
            case 'italic':
                return 'italic';
            case 'strikethrough':
                return 'normal'; // Handle strikethrough separately
            case 'inlinecode':
                return 'normal'; // Use Courier font for inline code
            default:
                return 'normal';
        }
    }

    function getFontSize(format) {
        switch(format) {
            case 'inlinecode':
                return 10; // Slightly smaller for inline code
            default:
                return 12;
        }
    }

    // Helper function for detecting and processing a Table of Contents
    function detectAndProcessTOC(element, doc, context) {
        // Check if this list matches the pattern of a TOC
        if (!element || !element.items || element.items.length < 2) {
            return false;
        }
        
        // Count how many items have links to internal headers
        let internalLinkCount = 0;
        for (const item of element.items) {
            if (item.hasLink && item.linkUrl && item.linkUrl.startsWith('#')) {
                internalLinkCount++;
            }
        }
        
        // If more than 80% of items have internal links, it's likely a TOC
        const tocProbability = internalLinkCount / element.items.length;
        if (tocProbability > 0.8) {
            Logger.debug(`Detected Table of Contents with ${internalLinkCount} internal links`);
            return true;
        }
        
        return false;
    }
    
    return {
        initializeOutlineStructure,
        renderTitlePage,
        isLayoutCommand,
        processLayoutCommand,
        renderElement
    };
})();
