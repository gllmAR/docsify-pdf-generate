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
        
        const fontSize = 24 - (element.level * 2);
        const fontWeight = element.level <= 2 ? 'bold' : 'normal';
        
        doc.setFont('Helvetica', fontWeight);
        doc.setFontSize(fontSize);
        
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
        }

        // Store the header ID in multiple formats to ensure link matching
        if (element.id) {
            // Store with and without hash
            headerPageMap.set(element.id, currentPage);
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
        
        return { yPosition, currentPage };
    }
    
    // Render element based on its type
    async function renderElement(element, doc, context) {
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
                
            default:
                return context;
        }
    }
    
    // Render plain text
    function renderText(element, doc, context) {
        const { pageWidth, contentWidth, alignment } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        
        // Process text with formatting
        const textLines = doc.splitTextToSize(element.text, contentWidth);
        
        // Apply current alignment
        if (alignment === 'center') {
            doc.text(textLines, pageWidth / 2, yPosition, { align: 'center' });
        } else {
            doc.text(textLines, margin, yPosition);
        }
        
        // Move position based on the number of lines
        yPosition += (textLines.length * 5) + 3;
        
        return { yPosition };
    }
    
    // Render list (bulleted or numbered)
    function renderList(element, doc, context) {
        const { headerPageMap } = context;
        const margin = context.margin || 10;
        let { yPosition, currentPage } = context;
        const listIndent = 5;
        
        doc.setFontSize(12);
        
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
            
            // Add extra debugging for links
            if (item.hasLink) {
                Logger.debug(`Processing list item with link: ${item.linkText} -> ${item.linkUrl}`);
            }
            
            // Draw bullet or number and handle links
            if (element.listType === 'ul') {
                doc.text('•', itemIndent, yPosition);
                doc.text(item.text, itemIndent + 5, yPosition);
                
                // Add link if this item has one
                if (item.hasLink && item.linkUrl && item.linkText) {
                    renderListItemLink(doc, item, itemIndent + 5, yPosition, headerPageMap);
                }
            } else {
                doc.text(`${j+1}.`, itemIndent, yPosition);
                doc.text(item.text, itemIndent + 7, yPosition);
                
                // Add link if this item has one
                if (item.hasLink && item.linkUrl && item.linkText) {
                    renderListItemLink(doc, item, itemIndent + 7, yPosition, headerPageMap); 
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
        
        const { pageWidth, contentWidth, alignment, headerPageMap } = context;
        const margin = context.margin || 10;
        let { yPosition } = context;
        
        // Define line height for all text rendering paths
        const lineHeight = 5;
        
        // Use a safer approach for text wrapping - we'll calculate the width first
        // and create multiple lines if needed
        const textContent = element.segments.map(s => s.text).join('');
        const formattedLines = doc.splitTextToSize(textContent, contentWidth);
        
        // If there are multiple lines, we need to rebuild our segments for each line
        if (formattedLines.length > 1) {
            // Track position for multi-line text
            let lineYPos = yPosition;
            
            for (let lineIndex = 0; lineIndex < formattedLines.length; lineIndex++) {
                // Process each line with proper formatting
                let lineXPos = alignment === 'center' ? pageWidth / 2 : margin;
                const currentLine = formattedLines[lineIndex];
                
                // For center alignment, we need the total width of this specific line
                if (alignment === 'center') {
                    // Calculate width of current line for centered text
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(12);
                    const lineWidth = doc.getStringUnitWidth(currentLine) * doc.getFontSize() / doc.internal.scaleFactor;
                    lineXPos = (pageWidth - lineWidth) / 2;
                }
                
                // Process the line segments
                renderFormattedTextLine(doc, element.segments, currentLine, lineXPos, lineYPos, headerPageMap);
                
                // Move to the next line
                lineYPos += lineHeight + 3;
            }
            
            // Update final y position after all lines
            yPosition = lineYPos;
        } else {
            // Single line case
            let xPos = alignment === 'center' ? pageWidth / 2 : margin;
            let yPos = yPosition;
            
            // Track total width for centering calculations
            let totalWidth = 0;
            if (alignment === 'center') {
                // Calculate total width of all segments
                element.segments.forEach(segment => {
                    doc.setFont('Helvetica', getFontStyle(segment.format));
                    doc.setFontSize(getFontSize(segment.format));
                    totalWidth += doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                });
                
                // Adjust starting position for center alignment
                xPos = (pageWidth - totalWidth) / 2;
            }
            
            // Render each segment
            for (let j = 0; j < element.segments.length; j++) {
                const segment = element.segments[j];
                
                // Set font style based on format
                doc.setFont('Helvetica', getFontStyle(segment.format));
                doc.setFontSize(getFontSize(segment.format));
                
                // Handle inline code separately
                if (segment.format === 'inlinecode') {
                    const codeWidth = doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                    const padding = 2;
                    doc.setFillColor(240, 240, 240);
                    doc.rect(xPos - padding, yPos - 4, codeWidth + (padding * 2), lineHeight + 4, 'F');
                    doc.setFont('Courier', 'normal');
                    doc.setTextColor(0, 0, 0);
                }
                
                // Draw the text segment
                doc.text(segment.text, xPos, yPos);
                
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
                
                // Update x position for next segment
                xPos += doc.getStringUnitWidth(segment.text) * doc.getFontSize() / doc.internal.scaleFactor;
                
                // Reset styling
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
            }
            
            // Move to next line
            yPosition += lineHeight + 3;
        }
        
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
                    const codeWidth = doc.getStringUnitWidth(textToRender) * doc.getFontSize() / doc.internal.scaleFactor;
                    const padding = 2;
                    doc.setFillColor(240, 240, 240);
                    doc.rect(xPos - padding, yPos - 4, codeWidth + (padding * 2), 5 + 4, 'F');
                    doc.setFont('Courier', 'normal');
                }
                
                // Draw text
                doc.text(textToRender, xPos, yPos);
                
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
                
                // Update position and remaining line content
                xPos += doc.getStringUnitWidth(textToRender) * doc.getFontSize() / doc.internal.scaleFactor;
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
        
        // Set up code block styling
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(200, 200, 200);
        
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
        
        // Draw code with monospace font
        doc.setFont('Courier', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(codeLines, margin + 5, yPosition + 7);
        doc.setFont('Helvetica', 'normal');
        
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
    
    return {
        initializeOutlineStructure,
        renderTitlePage,
        isLayoutCommand,
        processLayoutCommand,
        renderElement
    };
})();
