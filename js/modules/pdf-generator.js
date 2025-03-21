/**
 * PDF Generator module for Docsify PDF Generator
 */
const PDFGenerator = (function() {
    // Import sub-modules - initialize these lazily when first used
    let TableRenderer;
    let ElementRenderer;
    
    // Initialize dependencies when needed
    function initializeDependencies() {
        // Check if dependencies are already initialized
        if (TableRenderer && ElementRenderer) return;
        
        // Get the dependencies from the global scope
        if (typeof TableRendererModule !== 'undefined') {
            TableRenderer = TableRendererModule;
        } else {
            console.error('TableRendererModule not available');
            // Provide fallback
            TableRenderer = { renderTable: () => Promise.resolve({ yPosition: 0, currentPage: 1 }) };
        }
        
        if (typeof ElementRendererModule !== 'undefined') {
            ElementRenderer = ElementRendererModule;
        } else {
            console.error('ElementRendererModule not available');
            // Provide fallback
            ElementRenderer = { 
                initializeOutlineStructure: (doc) => ({}),
                renderTitlePage: () => {},
                isLayoutCommand: () => false,
                processLayoutCommand: () => ({}),
                renderElement: () => Promise.resolve({})
            };
        }
    }

    // Generate PDF from parsed content
    async function generatePDF(options, debug = false) {
        try {
            // Initialize dependencies now when they're needed
            initializeDependencies();
            
            // Ensure dependencies are loaded
            if (!DependencyLoader.areDependenciesLoaded()) {
                UIManager.updateProgress(5, 'Loading dependencies...', 'Fetching required libraries');
                await DependencyLoader.loadAllDependencies();
            }
            
            const { jsPDF } = window.jspdf;
            
            // Configure PDF with compatibility options
            const doc = new jsPDF({
                orientation: options.orientation,
                unit: 'mm',
                format: options.paperSize,
                compress: true,
                precision: 16,
                putOnlyUsedFonts: true,
                floatPrecision: 16,
                hotfixes: ["px_scaling"]
            });
            
            // Set PDF version for compatibility
            doc.internal.events.subscribe('putCatalog', function() {
                const pdfVersion = parseFloat(options.pdfVersion) || 1.4;
                this.internal.write("/Version /1." + Math.floor((pdfVersion * 10) % 10));
            });
            
            // Enable proper font embedding
            doc.setFont('Helvetica', 'normal', 'normal');
            
            let content;
            try {
                content = await MarkdownParser.fetchMarkdownContent();
                UIManager.updateProgress(10, 'Content loaded, parsing...', 'Fetched Markdown content successfully');
            } catch (error) {
                Logger.error('Error fetching Markdown content:', error);
                UIManager.updateProgress(0, `Error: ${error.message}`, 'Failed to load document content');
                return;
            }
            
            const parsedContent = MarkdownParser.parseMarkdown(content);
            UIManager.updateProgress(20, 'Content parsed, processing elements...', 
                `Parsed ${parsedContent.length} document elements`);
            
            if (debug) {
                Logger.info("Parsed Content:", parsedContent);
                UIManager.updateProgress(100, 'Debug mode - content parsed but not rendered', 
                    'No PDF generated in debug mode');
                return;
            }

            // Set up PDF variables
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = parseFloat(options.margins);
            const contentWidth = pageWidth - (margin * 2);
            
            // Keep track of header IDs and their pages for internal linking
            const headerPageMap = new Map();
            
            let yPosition = margin;
            let currentPage = 1;

            // Create a title page if needed
            if (parsedContent.length > 0 && parsedContent[0].type === 'header' && parsedContent[0].level === 1) {
                ElementRenderer.renderTitlePage(doc, parsedContent[0], { pageWidth, pageHeight });
                doc.addPage();
                currentPage++;
                yPosition = margin;
            }
            
            // Create outline tracking
            const outlineEntries = ElementRenderer.initializeOutlineStructure(doc);
            
            // Process content elements
            let alignment = 'left'; // Default alignment
            
            for (let i = 0; i < parsedContent.length; i++) {
                const element = parsedContent[i];
                const progress = 20 + (i / parsedContent.length * 70); // Progress from 20% to 90%
                const elementType = element.type.charAt(0).toUpperCase() + element.type.slice(1);
                
                UIManager.updateProgress(
                    progress, 
                    `Processing element ${i+1} of ${parsedContent.length}...`,
                    `Processing: ${elementType}${element.type === 'header' ? ' - ' + element.text : ''}`
                );
                
                // Process layout and styling commands
                if (ElementRenderer.isLayoutCommand(element)) {
                    const result = ElementRenderer.processLayoutCommand(element, doc, {
                        currentPage,
                        yPosition,
                        options
                    });
                    
                    // Update position and alignment if needed
                    if (result) {
                        if (result.yPosition !== undefined) yPosition = result.yPosition;
                        if (result.currentPage !== undefined) currentPage = result.currentPage;
                        if (result.alignment !== undefined) alignment = result.alignment;
                    }
                    continue;
                }
                
                // Check if we need to add a new page
                if (yPosition > pageHeight - margin * 2) {
                    doc.addPage();
                    currentPage++;
                    yPosition = margin;
                }
                
                // Render the element
                const renderResult = await ElementRenderer.renderElement(element, doc, {
                    pageWidth,
                    pageHeight,
                    contentWidth,
                    margin,
                    yPosition,
                    currentPage,
                    alignment,
                    headerPageMap,
                    outlineEntries,
                    options
                });
                
                // Update position and page if needed
                if (renderResult) {
                    if (renderResult.yPosition !== undefined) yPosition = renderResult.yPosition;
                    if (renderResult.currentPage !== undefined) currentPage = renderResult.currentPage;
                }
            }
            
            UIManager.updateProgress(95, 'Finalizing PDF...', 'Adding page numbers and metadata');
            
            // Add footer with page numbers
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
            }
            
            UIManager.updateProgress(98, 'Saving PDF...', 'Preparing file for download');
            
            // Debug: Dump document structure information
            Logger.debug(`Document has ${doc.internal.getNumberOfPages()} pages and ${headerPageMap.size} mapped headers`);
            Logger.debug(`Link targets available: ${Array.from(headerPageMap.keys()).join(', ')}`);
            
            // Finalize document with proper metadata
            doc.setProperties({
                title: 'Docsify Generated PDF',
                subject: 'Generated from Markdown content',
                author: 'Docsify PDF Generator',
                keywords: 'pdf,docsify,markdown',
                creator: 'Docsify PDF Generator'
            });
            
            // Save with a short delay to allow UI updates
            setTimeout(() => {
                doc.save('docsify-document.pdf');
                UIManager.updateProgress(100, 'Done!', 'PDF generated and downloaded successfully');
            }, 500);
            
        } catch (error) {
            Logger.error('Error generating PDF:', error);
            UIManager.updateProgress(0, `Error: ${error.message}`, 'PDF generation failed');
        }
    }
    
    // Debug PDF generation - just parse and log
    function debugPDF(options) {
        generatePDF(options, true);
    }
    
    return {
        generatePDF,
        debugPDF
    };
})();
