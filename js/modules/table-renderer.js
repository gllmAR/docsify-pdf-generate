/**
 * Table renderer module for PDF Generator
 */
const TableRendererModule = (function() {
    // Table rendering helper function
    async function renderTable(doc, tableElement, options) {
        const { pageWidth, pageHeight, margin, contentWidth, imageQuality, imageFormat } = options;
        let { yPosition, currentPage } = options;
        
        // Default cell padding and border settings
        const cellPadding = 5;
        const cellBorderWidth = 0.2;
        
        // Calculate column widths based on content
        const numColumns = tableElement.headers.length;
        const columnWidth = contentWidth / numColumns;
        
        // Table header height calculation
        doc.setFontSize(12);
        doc.setFont('Helvetica', 'bold');
        
        let headerHeight = 14; // Increased minimum header height for better spacing
        
        // Prepare to render header row
        const headerRowY = yPosition;
        
        // Check if there's enough space for the header
        if (yPosition + headerHeight + 10 > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            yPosition = margin;
        }
        
        // First pass: calculate required header height
        for (let col = 0; col < tableElement.headers.length; col++) {
            const cell = tableElement.headers[col];
            
            if (cell.type === 'text') {
                const textLines = doc.splitTextToSize(cell.content, columnWidth - (cellPadding * 2));
                const textHeight = textLines.length * 6 + cellPadding * 2; // Increased line height
                
                if (textHeight > headerHeight) {
                    headerHeight = textHeight;
                }
            } else if (cell.type === 'image') {
                try {
                    // We'll load the image once during rendering, just estimate size
                    headerHeight = Math.max(headerHeight, 30);
                } catch (error) {
                    Logger.error('Error estimating image in table header:', error);
                }
            }
        }
        
        // Draw header cells with final calculated height
        for (let col = 0; col < tableElement.headers.length; col++) {
            const cellX = margin + (col * columnWidth);
            doc.setFillColor(240, 240, 240);
            doc.setDrawColor(150, 150, 150);
            doc.rect(cellX, yPosition, columnWidth, headerHeight, 'FD');
        }
        
        // Render header content with vertical centering
        for (let col = 0; col < tableElement.headers.length; col++) {
            const cell = tableElement.headers[col];
            const cellX = margin + (col * columnWidth);
            
            if (cell.type === 'text') {
                const textLines = doc.splitTextToSize(cell.content, columnWidth - (cellPadding * 2));
                doc.setFont('Helvetica', 'bold');
                
                // Calculate vertical center position for text
                const textHeight = textLines.length * 6; // Total height of text
                const textStartY = yPosition + (headerHeight - textHeight) / 2 + 5; // Center vertically
                
                // Draw text at the centered position
                doc.text(textLines, cellX + cellPadding, textStartY);
            } else if (cell.type === 'image') {
                try {
                    const image = await ImageProcessor.loadImage(cell.url);
                    
                    // Calculate image dimensions to fit cell
                    const maxImgWidth = columnWidth - (cellPadding * 2);
                    const maxImgHeight = headerHeight - (cellPadding * 2);
                    
                    // Get appropriate dimensions
                    const dims = ImageProcessor.getImageDimensions(image, maxImgWidth, maxImgHeight, imageQuality);
                    
                    // Center image horizontally and vertically in cell
                    const imgX = cellX + (columnWidth - dims.width) / 2;
                    const imgY = yPosition + (headerHeight - dims.height) / 2;
                    
                    // Add image with explicit dimensions
                    doc.addImage(
                        image,
                        imageFormat,
                        imgX,
                        imgY,
                        dims.width,
                        dims.height,
                        null, // No alias
                        'MEDIUM' // Compression
                    );
                } catch (error) {
                    Logger.error('Error rendering image in table header:', error);
                    // Add error text that's centered
                    const errorText = '[Image Error]';
                    const txtWidth = doc.getStringUnitWidth(errorText) * 10 / doc.internal.scaleFactor;
                    const centerX = cellX + (columnWidth - txtWidth) / 2;
                    const centerY = yPosition + headerHeight / 2;
                    doc.text(errorText, centerX, centerY);
                }
            }
        }
        
        // Move position down after header
        yPosition += headerHeight;
        
        // Process table rows - similar improvements for vertical centering
        doc.setFont('Helvetica', 'normal');
        
        for (let rowIndex = 0; rowIndex < tableElement.rows.length; rowIndex++) {
            const row = tableElement.rows[rowIndex];
            
            // Calculate row height based on content
            let rowHeight = 14; // Increased minimum row height for better spacing
            let cellContents = [];
            
            // Pre-process row to calculate height
            for (let col = 0; col < row.length; col++) {
                const cell = row[col];
                
                if (cell.type === 'text') {
                    const textLines = doc.splitTextToSize(cell.content, columnWidth - (cellPadding * 2));
                    const textHeight = textLines.length * 6 + cellPadding * 2; // Increased line height
                    
                    if (textHeight > rowHeight) {
                        rowHeight = textHeight;
                    }
                    
                    cellContents.push({
                        type: 'text',
                        lines: textLines
                    });
                } else if (cell.type === 'image') {
                    try {
                        // Store the image URL for later loading
                        cellContents.push({
                            type: 'image',
                            url: cell.url
                        });
                        
                        // Estimate minimum height
                        rowHeight = Math.max(rowHeight, 30);
                    } catch (error) {
                        Logger.error('Error preprocessing image in table cell:', error);
                        cellContents.push({
                            type: 'error',
                            message: 'Image Error'
                        });
                    }
                } else {
                    cellContents.push({
                        type: 'empty'
                    });
                }
            }
            
            // Check if we need a new page for this row
            // IMPORTANT: Use a more conservative page break check for SVG-containing rows
            const hasSVG = row.some(cell => cell.type === 'image' && ImageProcessor.isSVG(cell.url));
            const spaceNeeded = rowHeight + (hasSVG ? 10 : 0); // Extra padding for SVG rows
            
            if (yPosition + spaceNeeded > pageHeight - margin * 1.5) {
                doc.addPage();
                currentPage++;
                yPosition = margin;
                Logger.debug(`Added page break before row ${rowIndex+1} with SVG: ${hasSVG}`);
            }
            
            // Draw row cells background and borders
            for (let col = 0; col < row.length; col++) {
                const cellX = margin + (col * columnWidth);
                
                // Alternating row colors
                if (rowIndex % 2 === 0) {
                    doc.setFillColor(252, 252, 252);
                } else {
                    doc.setFillColor(245, 245, 245);
                }
                
                doc.setDrawColor(200, 200, 200);
                doc.rect(cellX, yPosition, columnWidth, rowHeight, 'FD');
            }
            
            // Add cell content with vertical centering
            for (let col = 0; col < row.length; col++) {
                const cellX = margin + (col * columnWidth);
                const cellContent = cellContents[col];
                
                if (cellContent.type === 'text') {
                    const textLines = cellContent.lines;
                    
                    // Calculate vertical center position for text
                    const textHeight = textLines.length * 6; // Total height of text
                    const textStartY = yPosition + (rowHeight - textHeight) / 2 + 4; // Center vertically
                    
                    // Draw text at the centered position
                    doc.text(textLines, cellX + cellPadding, textStartY);
                } else if (cellContent.type === 'image') {
                    try {
                        // Check if this is an SVG image
                        if (ImageProcessor.isSVG(cellContent.url)) {
                            Logger.debug(`Processing SVG in table cell: ${cellContent.url}`);
                            
                            try {
                                // Load the SVG element
                                const svgElement = await SVGHandler.loadSVGElement(cellContent.url);
                                
                                // Calculate cell dimensions
                                const maxWidth = columnWidth - (cellPadding * 2);
                                const maxHeight = rowHeight - (cellPadding * 2);
                                
                                // Process SVG content
                                await renderTableCellSvg(svgElement, doc, {
                                    cellX,
                                    columnWidth,
                                    rowHeight,
                                    cellPadding,
                                    yPosition,
                                    maxWidth,
                                    maxHeight,
                                    pageHeight,
                                    margin,
                                    currentPage,
                                    rowIndex,
                                    row
                                });
                                
                            } catch (svgError) {
                                Logger.error('SVG processing failed in table cell:', svgError);
                                
                                // Add error message to cell
                                const errorText = '[SVG Error]';
                                const txtWidth = doc.getStringUnitWidth(errorText) * 10 / doc.internal.scaleFactor;
                                const centerX = cellX + (columnWidth - txtWidth) / 2;
                                const centerY = yPosition + rowHeight / 2;
                                doc.text(errorText, centerX, centerY);
                            }
                        } else {
                            // Standard image handling
                            const image = await ImageProcessor.loadImage(cellContent.url);
                            const dims = ImageProcessor.getImageDimensions(
                                image, 
                                columnWidth - (cellPadding * 2), 
                                rowHeight - (cellPadding * 2),
                                imageQuality
                            );
                            
                            const imgX = cellX + (columnWidth - dims.width) / 2;
                            const imgY = yPosition + (rowHeight - dims.height) / 2;
                            
                            doc.addImage(
                                image,
                                imageFormat,
                                imgX,
                                imgY,
                                dims.width,
                                dims.height,
                                null,
                                'MEDIUM'
                            );
                        }
                    } catch (error) {
                        Logger.error('Error rendering image in table cell:', error);
                        const errorText = '[Image Error]';
                        const txtWidth = doc.getStringUnitWidth(errorText) * 10 / doc.internal.scaleFactor;
                        const centerX = cellX + (columnWidth - txtWidth) / 2;
                        const centerY = yPosition + rowHeight / 2;
                        doc.text(errorText, centerX, centerY);
                    }
                }
            }
            
            // Move position down after row
            yPosition += rowHeight;
        }
        
        // Add extra space after table
        yPosition += 10;
        
        return { yPosition, currentPage };
    }
    
    // Helper function for SVG table cells
    async function renderTableCellSvg(svgElement, doc, opts) {
        // Get SVG dimensions
        let svgWidth = parseFloat(svgElement.getAttribute('width') || 100);
        let svgHeight = parseFloat(svgElement.getAttribute('height') || 100);
        
        // Ensure valid dimensions
        svgWidth = Math.max(1, isNaN(svgWidth) ? 100 : svgWidth);
        svgHeight = Math.max(1, isNaN(svgHeight) ? 100 : svgHeight);
        
        // Calculate dimensions to fit in cell while preserving aspect ratio
        let width, height;
        if (svgWidth / svgHeight > opts.maxWidth / opts.maxHeight) {
            // Width constrained
            width = opts.maxWidth;
            height = (width / svgWidth) * svgHeight;
        } else {
            // Height constrained
            height = opts.maxHeight;
            width = (height / svgHeight) * svgWidth;
        }
        
        // Center the SVG in the cell
        const svgX = opts.cellX + (opts.columnWidth - width) / 2;
        const svgY = opts.yPosition + (opts.rowHeight - height) / 2;
        
        Logger.debug(`Table SVG position: (${svgX}, ${svgY}), size: ${width}x${height}`);
        
        // CRITICAL: Check if adding this SVG would push content to next page
        // If we're close to the page boundary, add a page before rendering
        if (opts.yPosition + opts.rowHeight > opts.pageHeight - opts.margin * 1.5) {
            doc.addPage();
            opts.currentPage++;
            opts.yPosition = opts.margin;
            
            // Re-draw this row on the new page
            // Draw row background on new page
            for (let col = 0; col < opts.row.length; col++) {
                const cellX = opts.margin + (col * opts.columnWidth);
                if (opts.rowIndex % 2 === 0) {
                    doc.setFillColor(252, 252, 252);
                } else {
                    doc.setFillColor(245, 245, 245);
                }
                doc.setDrawColor(200, 200, 200);
                doc.rect(cellX, opts.yPosition, opts.columnWidth, opts.rowHeight, 'FD');
            }
        }
        
        // Use simplified direct SVG processing for tables - fewer layers of abstraction
        await SVGHandler.processSVG(svgElement, doc, {
            x: svgX,
            y: svgY,
            width: width,
            height: height,
            renderMode: 'vector', // Always try vector first
            quality: 'medium'     // Use medium quality for better performance
        });
    }
    
    return {
        renderTable
    };
})();
