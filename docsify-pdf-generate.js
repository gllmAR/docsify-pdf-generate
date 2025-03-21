(function() {
    // Function to dynamically load jsPDF script
    function loadJSPDF(callback) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Function to dynamically load the local outline plugin script
    function loadOutlinePlugin(callback) {
        const script = document.createElement('script');
        script.src = 'jspdf-module/outline.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Improved function to dynamically load svg2pdf.js library with better handling
    function loadSVG2PDF(callback) {
        // Skip if already loaded successfully and working
        if (window.svg2pdf && typeof window.svg2pdf === 'function') {
            console.log("SVG2PDF already loaded, using existing instance");
            callback();
            return;
        }
        
        // First try to load it directly using a fixed version known to work
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/svg2pdf.js@1.4.0/dist/svg2pdf.min.js';
        
        script.onload = function() {
            // Verify that it's actually working
            if (typeof window.svg2pdf === 'function') {
                console.log("SVG2PDF loaded successfully");
                callback();
            } else {
                console.error("SVG2PDF loaded but function not available, SVGs will be rasterized");
                callback();
            }
        };
        
        script.onerror = function() {
            console.error("Failed to load SVG2PDF library. SVGs will be rasterized.");
            callback();
        };
        
        document.head.appendChild(script);
    }

    // Simple function to check if svg2pdf is properly loaded
    function isSVG2PDFAvailable() {
        return typeof window.svg2pdf === 'function';
    }

    // Function to safely apply svg2pdf using whatever method is available
    async function applySVG2PDF(svgElement, doc, options) {
        // Try direct svg2pdf function first
        if (typeof window.svg2pdf === 'function') {
            return window.svg2pdf(svgElement, doc, options);
        }
        
        // Try as a method on the jsPDF instance
        if (typeof doc.svg === 'function') {
            return doc.svg(svgElement, options);
        }
        
        // Try as a module with default export
        if (window.svg2pdf && typeof window.svg2pdf.default === 'function') {
            return window.svg2pdf.default(svgElement, doc, options);
        }
        
        throw new Error('svg2pdf function not available');
    }

    // Function to handle SVG-to-PDF conversion safely
    async function processSVG(svgElement, doc, options) {
        // Verify svg2pdf is available
        if (!isSVG2PDFAvailable()) {
            throw new Error('svg2pdf function not available');
        }
        
        try {
            // Clean up SVG element to ensure it has proper attributes
            if (!svgElement.getAttribute('width') || svgElement.getAttribute('width') === '100%') {
                svgElement.setAttribute('width', options.width.toString());
            }
            
            if (!svgElement.getAttribute('height') || svgElement.getAttribute('height') === '100%') {
                svgElement.setAttribute('height', options.height.toString());
            }
            
            // Add a viewBox if missing
            if (!svgElement.getAttribute('viewBox')) {
                svgElement.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);
            }
            
            // Convert with safe dimensions
            return window.svg2pdf(svgElement, doc, {
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height
            });
        } catch (error) {
            console.error("SVG2PDF conversion error:", error);
            throw error;
        }
    }

    // Get the correct svg2pdf function regardless of how it's exposed
    function getSVG2PDFFunc() {
        if (typeof window.svg2pdf === 'function') {
            return window.svg2pdf;
        } else if (window.svg2pdf && typeof window.svg2pdf.svg2pdf === 'function') {
            return window.svg2pdf.svg2pdf;
        } else if (window.svg2pdf && typeof window.svg2pdf.default === 'function') {
            return window.svg2pdf.default;
        }
        return null;
    }

    // Create a test function to validate that svg2pdf works
    function testSVG2PDF() {
        if (!isSVG2PDFAvailable()) {
            console.log("SVG2PDF function not available");
            return false;
        }
        
        console.log("SVG2PDF function is available");
        return true;
    }

    function createSettingsDiv() {
        const settingsDiv = document.createElement('div');
        settingsDiv.style.position = 'fixed';
        settingsDiv.style.top = '50%';
        settingsDiv.style.left = '50%';
        settingsDiv.style.transform = 'translate(-50%, -50%)';
        settingsDiv.style.padding = '20px';
        settingsDiv.style.backgroundColor = '#fff';
        settingsDiv.style.border = '1px solid #ccc';
        settingsDiv.style.zIndex = '1000';
        settingsDiv.style.display = 'none';
        settingsDiv.style.maxWidth = '500px';
        settingsDiv.style.width = '90%';
        settingsDiv.style.maxHeight = '80vh';
        settingsDiv.style.overflow = 'auto';
        settingsDiv.innerHTML = `
            <h3>PDF Settings</h3>
            <div style="margin-bottom: 10px;">
                <label for="paperSize">Paper Size:</label>
                <select id="paperSize" style="margin-left: 5px;">
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="orientation">Orientation:</label>
                <select id="orientation" style="margin-left: 5px;">
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="theme">Theme:</label>
                <select id="theme" style="margin-left: 5px;">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="margins">Margins (mm):</label>
                <input type="number" id="margins" min="5" max="50" value="10" style="width: 50px; margin-left: 5px;">
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="imageQuality">Image Quality:</label>
                <select id="imageQuality" style="margin-left: 5px;">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>Include:</label>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeHeader" checked>
                    <label for="includeHeader">Headers</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeImages" checked>
                    <label for="includeImages">Images</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeCode" checked>
                    <label for="includeCode">Code Blocks</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeTables" checked>
                    <label for="includeTables">Tables</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="respectPageBreaks" checked>
                    <label for="respectPageBreaks">LaTeX Commands</label>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="pdfVersion">PDF Compatibility:</label>
                <select id="pdfVersion" style="margin-left: 5px;">
                    <option value="1.3">PDF 1.3 (Acrobat 4)</option>
                    <option value="1.4" selected>PDF 1.4 (Acrobat 5)</option>
                    <option value="1.5">PDF 1.5 (Acrobat 6)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>Image Format:</label>
                <select id="imageFormat" style="margin-left: 5px;">
                    <option value="JPEG" selected>JPEG (smaller files)</option>
                    <option value="PNG">PNG (better quality)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>SVG Handling:</label>
                <select id="svgHandling" style="margin-left: 5px;">
                    <option value="vector" selected>Vector (preserve quality)</option>
                    <option value="raster">Raster (convert to image)</option>
                </select>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="startPDF" style="padding: 5px 15px;">Generate PDF</button>
                <button id="cancelPDF" style="padding: 5px 15px;">Cancel</button>
                <button id="debugPDF" style="padding: 5px 15px;">Debug</button>
            </div>
            
            <div id="progressContainer" style="display: none; margin-top: 15px;">
                <div id="progressText">Processing...</div>
                <progress id="progressBar" value="0" max="100" style="width: 100%; margin-top: 5px;"></progress>
            </div>
        `;
        document.body.appendChild(settingsDiv);
        return settingsDiv;
    }

    async function fetchMarkdownContent() {
        try {
            const response = await fetch('README.md');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        } catch (error) {
            console.error('Error fetching Markdown content:', error);
            throw error;
        }
    }

    function parseMarkdown(content) {
        const lines = content.split('\n');
        const parsedContent = [];
        let insideCodeBlock = false;
        let codeBlockContent = '';
        let codeBlockLanguage = '';
        let listItems = [];
        let currentListType = null;
        
        // Table parsing variables
        let tableRows = [];
        let tableHeaders = [];
        let inTable = false;
        let tableSeparatorFound = false;

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // Check if we're in a table
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                // Table processing logic
                const isHeaderSeparator = line.trim().replace(/\|/g, '').trim().split(/\s+/).every(cell => /^[-:]+$/.test(cell.trim()));
                
                if (isHeaderSeparator) {
                    tableSeparatorFound = true;
                } else {
                    const cells = line.trim()
                        .slice(1, -1)  // Remove outer pipes
                        .split('|')
                        .map(cell => {
                            // Check for images in table cells
                            const imageMatch = cell.trim().match(/!\[(.*?)\]\((.*?)\)/);
                            if (imageMatch) {
                                return {
                                    type: 'image',
                                    alt: imageMatch[1],
                                    url: imageMatch[2]
                                };
                            }
                            return {
                                type: 'text',
                                content: cell.trim()
                            };
                        });
                    
                    if (!inTable) {
                        inTable = true;
                        tableHeaders = cells;
                    } else if (!tableSeparatorFound) {
                        // This is still part of the header in a complex header
                        tableHeaders = cells;
                    } else {
                        tableRows.push(cells);
                    }
                }
                
                i++;
                continue;
            } else if (inTable) {
                // End of table
                parsedContent.push({
                    type: 'table',
                    headers: tableHeaders,
                    rows: tableRows
                });
                
                // Reset table variables
                inTable = false;
                tableSeparatorFound = false;
                tableHeaders = [];
                tableRows = [];
            }

            // Existing parsing logic for other elements
            // Check for LaTeX-style commands wrapped in HTML comments
            const latexCommandMatch = line.trim().match(/<!--\s*\\(\w+)(?:\{(.*?)\})?\s*-->/i);
            if (latexCommandMatch) {
                const command = latexCommandMatch[1];
                const parameter = latexCommandMatch[2] || null;
                
                switch (command.toLowerCase()) {
                    case 'newpage':
                        parsedContent.push({
                            type: 'pagebreak'
                        });
                        i++;
                        continue;
                    case 'vspace':
                        // Add vertical space
                        parsedContent.push({
                            type: 'vspace',
                            size: parameter ? parseInt(parameter) : 10 // Default 10mm if no parameter
                        });
                        i++;
                        continue;
                    case 'hline':
                        // Add horizontal line
                        parsedContent.push({
                            type: 'hr'
                        });
                        i++;
                        continue;
                    case 'textbf':
                        // Bold text
                        parsedContent.push({
                            type: 'styledText',
                            text: parameter,
                            style: 'bold'
                        });
                        i++;
                        continue;
                    case 'textit':
                        // Italic text
                        parsedContent.push({
                            type: 'styledText',
                            text: parameter,
                            style: 'italic'
                        });
                        i++;
                        continue;
                    case 'textcolor':
                        // Extract color and text from parameter
                        if (parameter) {
                            const colorMatch = parameter.match(/^(\w+)\}\{(.*)$/);
                            if (colorMatch) {
                                parsedContent.push({
                                    type: 'styledText',
                                    text: colorMatch[2],
                                    style: 'color',
                                    color: colorMatch[1]
                                });
                                i++;
                                continue;
                            }
                        }
                        break;
                    case 'centering':
                        // Enable centering for next element
                        parsedContent.push({
                            type: 'alignment',
                            align: 'center'
                        });
                        i++;
                        continue;
                    default:
                        // Unrecognized command, treat as comment (skip)
                        i++;
                        continue;
                }
            }

            // Check for code blocks
            if (line.trim().startsWith('```')) {
                if (!insideCodeBlock) {
                    insideCodeBlock = true;
                    codeBlockLanguage = line.trim().substring(3);
                    codeBlockContent = '';
                } else {
                    insideCodeBlock = false;
                    parsedContent.push({
                        type: 'codeBlock',
                        language: codeBlockLanguage,
                        content: codeBlockContent
                    });
                }
                i++;
                continue;
            }

            if (insideCodeBlock) {
                codeBlockContent += line + '\n';
                i++;
                continue;
            }

            // Check for headers
            const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
                // If we were processing a list, add it now
                if (listItems.length > 0) {
                    parsedContent.push({
                        type: 'list',
                        listType: currentListType,
                        items: [...listItems]
                    });
                    listItems = [];
                    currentListType = null;
                }
                
                parsedContent.push({
                    type: 'header',
                    level: headerMatch[1].length,
                    text: headerMatch[2]
                });
                i++;
                continue;
            }

            // Check for images
            const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
            if (imageMatch) {
                parsedContent.push({
                    type: 'image',
                    alt: imageMatch[1],
                    url: imageMatch[2]
                });
                i++;
                continue;
            }

            // Check for unordered lists
            const ulMatch = line.match(/^(\s*)-\s+(.*)$/);
            if (ulMatch) {
                if (currentListType !== 'ul') {
                    if (listItems.length > 0) {
                        parsedContent.push({
                            type: 'list',
                            listType: currentListType,
                            items: [...listItems]
                        });
                        listItems = [];
                    }
                    currentListType = 'ul';
                }
                
                const indentLevel = ulMatch[1].length;
                listItems.push({
                    text: ulMatch[2],
                    level: Math.floor(indentLevel / 2)
                });
                i++;
                continue;
            }

            // Check for ordered lists
            const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
            if (olMatch) {
                if (currentListType !== 'ol') {
                    if (listItems.length > 0) {
                        parsedContent.push({
                            type: 'list',
                            listType: currentListType,
                            items: [...listItems]
                        });
                        listItems = [];
                    }
                    currentListType = 'ol';
                }
                
                const indentLevel = olMatch[1].length;
                listItems.push({
                    text: olMatch[2],
                    level: Math.floor(indentLevel / 2)
                });
                i++;
                continue;
            }

            // If we're not continuing a list, but have list items, add the list
            if (listItems.length > 0 && !ulMatch && !olMatch) {
                parsedContent.push({
                    type: 'list',
                    listType: currentListType,
                    items: [...listItems]
                });
                listItems = [];
                currentListType = null;
            }

            // Check for blockquotes
            const blockquoteMatch = line.match(/^>\s+(.*)$/);
            if (blockquoteMatch) {
                parsedContent.push({
                    type: 'blockquote',
                    text: blockquoteMatch[1]
                });
                i++;
                continue;
            }

            // Check for horizontal rule
            if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
                parsedContent.push({ type: 'hr' });
                i++;
                continue;
            }

            // Process regular text
            if (line.trim() !== '') {
                // Process emphasis within text
                let text = line;
                // Bold
                text = text.replace(/\*\*(.*?)\*\*/g, '**$1**');
                // Italic
                text = text.replace(/\*(.*?)\*/g, '*$1*');
                // Strikethrough
                text = text.replace(/~~(.*?)~~/g, '~~$1~~');
                
                parsedContent.push({ type: 'text', text });
            }
            i++;
        }

        // Check if we ended while still processing a table
        if (inTable) {
            parsedContent.push({
                type: 'table',
                headers: tableHeaders,
                rows: tableRows
            });
        }

        // If there are any remaining list items, add them
        if (listItems.length > 0) {
            parsedContent.push({
                type: 'list',
                listType: currentListType,
                items: [...listItems]
            });
        }

        return parsedContent;
    }

    async function loadImage(url) {
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

    function getImageDimensions(image, maxWidth, maxHeight, quality) {
        try {
            // Check for valid image object with dimensions
            if (!image || typeof image !== 'object' || !image.width || !image.height) {
                console.warn("Invalid image object received");
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
            
            // Ensure minimum dimensions and maximum dimensions
            pdfWidth = Math.min(maxWidth, Math.max(1, pdfWidth));
            pdfHeight = Math.min(maxHeight, Math.max(1, pdfHeight));
            
            return { width: pdfWidth, height: pdfHeight };
        } catch (e) {
            console.error("Error calculating image dimensions:", e);
            return { width: 50, height: 50 }; // Return safe defaults
        }
    }

    // Function to check if a URL is an SVG
    function isSVG(url) {
        return url.toLowerCase().endsWith('.svg') || url.toLowerCase().includes('image/svg');
    }

    // Function to load SVG as a DOM element
    async function loadSVGElement(url) {
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

    async function generatePDF(options, debug = false) {
        try {
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
                content = await fetchMarkdownContent();
                updateProgress(10, 'Content loaded, parsing...');
            } catch (error) {
                console.error('Error fetching Markdown content:', error);
                return;
            }
            
            const parsedContent = parseMarkdown(content);
            updateProgress(20, 'Content parsed, processing elements...');
            
            if (debug) {
                console.log("Parsed Content:", parsedContent);
                return;
            }

            // Set up PDF variables
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = parseFloat(options.margins);
            const contentWidth = pageWidth - (margin * 2);
            
            let yPosition = margin;
            let currentPage = 1;

            // Create a title page
            if (parsedContent.length > 0 && parsedContent[0].type === 'header' && parsedContent[0].level === 1) {
                const title = parsedContent[0].text;
                const centerY = pageHeight / 2;
                
                doc.setFontSize(24);
                doc.text(title, pageWidth / 2, centerY, { align: 'center' });
                
                // Add footer with date - position higher to avoid overlap with page numbers
                const today = new Date();
                const dateStr = today.toLocaleDateString();
                doc.setFontSize(10);
                doc.text(`Generated on ${dateStr}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
                
                doc.addPage();
                currentPage++;
                yPosition = margin;
            }
            
            // Create outline tracking
            const outlineEntries = {
                root: doc.outline.root,
                1: null,
                2: null,
                3: null,
                4: null,
                5: null,
                6: null
            };
            
            // Process content elements
            let alignment = 'left'; // Default alignment
            
            for (let i = 0; i < parsedContent.length; i++) {
                const element = parsedContent[i];
                const progress = 20 + (i / parsedContent.length * 70); // Progress from 20% to 90%
                updateProgress(progress, `Processing element ${i+1} of ${parsedContent.length}...`);
                
                // Handle LaTeX commands
                if (element.type === 'pagebreak' && options.respectPageBreaks) {
                    doc.addPage();
                    currentPage++;
                    yPosition = margin;
                    continue;
                }
                
                if (element.type === 'vspace') {
                    yPosition += element.size;
                    continue;
                }
                
                if (element.type === 'alignment') {
                    alignment = element.align;
                    continue;
                }
                
                if (element.type === 'styledText') {
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
                    
                    yPosition += 7;
                    continue;
                }
                
                // Check if we need to add a new page
                if (yPosition > pageHeight - margin * 2) {
                    doc.addPage();
                    currentPage++;
                    yPosition = margin;
                }
                
                switch (element.type) {
                    case 'header':
                        if (!options.includeHeader) continue;
                        
                        const fontSize = 24 - (element.level * 2);
                        const fontWeight = element.level <= 2 ? 'bold' : 'normal';
                        
                        doc.setFont('Helvetica', fontWeight);
                        doc.setFontSize(fontSize);
                        
                        // Calculate proper vertical position for text (baseline adjustment)
                        // This centers the text vertically in its line height
                        const lineHeight = fontSize * 0.5; // Adjust line height based on font size
                        const verticalTextPosition = yPosition + lineHeight/2;
                        
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
                            parent = doc.outline.root;
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
                                parent = doc.outline.root;
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
                        
                        // Adjust vertical position for next element - add appropriate space after header
                        yPosition += fontSize + 5; // More space after headers for better readability
                        break;
                        
                    case 'text':
                        doc.setFont('Helvetica', 'normal');
                        doc.setFontSize(12);
                        
                        // Process text with formatting (bold, italic)
                        const textLines = doc.splitTextToSize(element.text, contentWidth);
                        
                        // Apply current alignment
                        if (alignment === 'center') {
                            doc.text(textLines, pageWidth / 2, yPosition, { align: 'center' });
                        } else {
                            doc.text(textLines, margin, yPosition);
                        }
                        
                        // Move position based on the number of lines
                        yPosition += (textLines.length * 5) + 3;
                        break;
                        
                    case 'image':
                        if (!options.includeImages) continue;
                        
                        try {
                            // Check if this is an SVG image and vector option is selected
                            if (isSVG(element.url) && options.svgHandling === 'vector' && isSVG2PDFAvailable()) {
                                try {
                                    // Handle as vector SVG
                                    const svgElement = await loadSVGElement(element.url);
                                    
                                    // Calculate dimensions that maintain aspect ratio
                                    let svgWidth = parseFloat(svgElement.getAttribute('width') || 100);
                                    let svgHeight = parseFloat(svgElement.getAttribute('height') || 100);
                                    
                                    // Ensure positive dimensions
                                    svgWidth = Math.max(10, svgWidth);
                                    svgHeight = Math.max(10, svgHeight);
                                    
                                    // Calculate scaling to fit within content width
                                    let width = Math.min(svgWidth, contentWidth);
                                    let height = (width / svgWidth) * svgHeight;
                                    
                                    // Check if SVG will fit on current page
                                    if (yPosition + height > pageHeight - margin) {
                                        doc.addPage();
                                        currentPage++;
                                        yPosition = margin;
                                    }
                                    
                                    // Try direct svg2pdf instead of wrapper
                                    await svg2pdf(svgElement, doc, {
                                        x: margin,
                                        y: yPosition,
                                        width: width,
                                        height: height
                                    });
                                    
                                    yPosition += height + 10;
                                } catch (svgError) {
                                    console.error('SVG processing failed, falling back to raster:', svgError);
                                    // Fall back to raster approach
                                    const image = await loadImage(element.url);
                                    
                                    // ...existing raster handling code...
                                    const dims = getImageDimensions(
                                        image, 
                                        contentWidth, 
                                        pageHeight - margin * 3,
                                        options.imageQuality
                                    );
                                    
                                    // Check if image will fit on current page
                                    if (yPosition + dims.height > pageHeight - margin) {
                                        doc.addPage();
                                        currentPage++;
                                        yPosition = margin;
                                    }
                                    
                                    // Add the image with specified format
                                    doc.addImage(
                                        image, 
                                        options.imageFormat, 
                                        margin, 
                                        yPosition, 
                                        dims.width, 
                                        dims.height,
                                        '', // alias
                                        'MEDIUM' // compression level
                                    );
                                    
                                    yPosition += dims.height + 10;
                                }
                            } else {
                                // Handle as raster image with improved error handling
                                try {
                                    const image = await loadImage(element.url);
                                    
                                    // Get safe dimensions
                                    const dims = getImageDimensions(
                                        image, 
                                        contentWidth, 
                                        pageHeight - margin * 3,
                                        options.imageQuality
                                    );
                                    
                                    // Check if image will fit on current page
                                    if (yPosition + dims.height > pageHeight - margin) {
                                        doc.addPage();
                                        currentPage++;
                                        yPosition = margin;
                                    }
                                    
                                    // Add the image with safe dimensions and format
                                    doc.addImage(
                                        image, 
                                        options.imageFormat || 'JPEG', 
                                        margin, 
                                        yPosition, 
                                        dims.width, 
                                        dims.height,
                                        '', // alias
                                        'FAST' // Use a more compatible compression setting
                                    );
                                    
                                    yPosition += dims.height + 10;
                                } catch (imgError) {
                                    console.error('Error processing raster image:', imgError);
                                    // Add a placeholder for failed image
                                    doc.setFontSize(10);
                                    doc.setTextColor(150, 150, 150);
                                    doc.text(`[Image could not be loaded: ${element.url}]`, margin, yPosition);
                                    doc.setTextColor(0, 0, 0);
                                    yPosition += 10;
                                }
                            }
                        } catch (error) {
                            console.error('Error processing image:', error);
                            // Add a placeholder for failed image
                            doc.setFontSize(10);
                            doc.setTextColor(150, 150, 150);
                            doc.text(`[Image could not be loaded: ${element.url}]`, margin, yPosition);
                            doc.setTextColor(0, 0, 0);
                            yPosition += 10;
                        }
                        break;
                        
                    case 'list':
                        const listIndent = 5;
                        doc.setFontSize(12);
                        
                        for (let j = 0; j < element.items.length; j++) {
                            const item = element.items[j];
                            const itemIndent = margin + (item.level * listIndent);
                            
                            // If this item won't fit on the page, add a new page
                            if (yPosition > pageHeight - margin * 2) {
                                doc.addPage();
                                currentPage++;
                                yPosition = margin;
                            }
                            
                            // Bullet or number
                            if (element.listType === 'ul') {
                                doc.text('•', itemIndent, yPosition);
                                doc.text(item.text, itemIndent + 5, yPosition);
                            } else {
                                doc.text(`${j+1}.`, itemIndent, yPosition);
                                doc.text(item.text, itemIndent + 7, yPosition);
                            }
                            
                            yPosition += 7;
                        }
                        
                        yPosition += 3; // Add extra space after list
                        break;
                        
                    case 'codeBlock':
                        if (!options.includeCode) continue;
                        
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
                        break;
                        
                    case 'blockquote':
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
                        break;
                        
                    case 'hr':
                        // Draw horizontal rule
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.5);
                        doc.line(margin, yPosition, pageWidth - margin, yPosition);
                        
                        yPosition += 10;
                        break;

                    case 'table':
                        if (!options.includeTables) continue;
                        
                        try {
                            // Process table and get updated position
                            const tableResult = await renderTable(doc, element, {
                                pageWidth,
                                pageHeight,
                                margin,
                                contentWidth,
                                yPosition,
                                currentPage,
                                imageQuality: options.imageQuality,
                                imageFormat: options.imageFormat
                            });
                            
                            // Update current position and page based on the table rendering result
                            yPosition = tableResult.yPosition;
                            currentPage = tableResult.currentPage;
                        } catch (error) {
                            console.error('Error rendering table:', error);
                            yPosition += 10; // Add some space even if table fails
                        }
                        break;
                }
            }
            
            updateProgress(95, 'Finalizing PDF...');
            
            // Add footer with page numbers - position lower to avoid overlap with date
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
            }
            
            updateProgress(100, 'Done!');
            
            // Finalize document with proper metadata
            doc.setProperties({
                title: 'Docsify Generated PDF',
                subject: 'Generated from Markdown content',
                author: 'Docsify PDF Generator',
                keywords: 'pdf,docsify,markdown',
                creator: 'Docsify PDF Generator'
            });
            
            doc.save('docsify-document.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
            updateProgress(0, `Error: ${error.message}`);
        }
    }

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
                    console.error('Error estimating image in table header:', error);
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
                    const image = await loadImage(cell.url);
                    
                    // Calculate image dimensions to fit cell
                    const maxImgWidth = columnWidth - (cellPadding * 2);
                    const maxImgHeight = headerHeight - (cellPadding * 2);
                    
                    // Get appropriate dimensions
                    const dims = getImageDimensions(image, maxImgWidth, maxImgHeight, imageQuality);
                    
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
                    console.error('Error rendering image in table header:', error);
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
                        console.error('Error preprocessing image in table cell:', error);
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
            if (yPosition + rowHeight > pageHeight - margin) {
                doc.addPage();
                currentPage++;
                yPosition = margin;
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
                        if (isSVG(cellContent.url) && options.svgHandling === 'vector' && isSVG2PDFAvailable()) {
                            try {
                                // Handle as vector SVG
                                const svgElement = await loadSVGElement(cellContent.url);
                                
                                // Calculate available dimensions within cell
                                const maxWidth = columnWidth - (cellPadding * 2);
                                const maxHeight = rowHeight - (cellPadding * 2);
                                
                                // Ensure valid SVG dimensions
                                let svgWidth = parseFloat(svgElement.getAttribute('width') || 100);
                                let svgHeight = parseFloat(svgElement.getAttribute('height') || 100);
                                
                                // Ensure non-zero dimensions
                                svgWidth = Math.max(svgWidth, 1);
                                svgHeight = Math.max(svgHeight, 1);
                                
                                let width, height;
                                if (svgWidth / svgHeight > maxWidth / maxHeight) {
                                    // Width-constrained
                                    width = maxWidth;
                                    height = (width / svgWidth) * svgHeight;
                                } else {
                                    // Height-constrained
                                    height = maxHeight;
                                    width = (height / svgHeight) * svgWidth;
                                }
                                
                                // Ensure minimum dimensions
                                width = Math.max(width, 1);
                                height = Math.max(height, 1);
                                
                                // Center SVG within cell
                                const svgX = cellX + (columnWidth - width) / 2;
                                const svgY = yPosition + (rowHeight - height) / 2;
                                
                                // Convert SVG to PDF using our wrapper function
                                await processSVG(svgElement, doc, {
                                    x: svgX,
                                    y: svgY,
                                    width: width,
                                    height: height
                                });
                            } catch (svgError) {
                                console.error('SVG processing failed in table cell, falling back to raster:', svgError);
                                // Fall back to raster image handling
                                const image = await loadImage(cellContent.url);
                                
                                // Calculate dimensions and continue with regular image processing
                                const dims = getImageDimensions(
                                    image, 
                                    columnWidth - (cellPadding * 2), 
                                    rowHeight - (cellPadding * 2),
                                    imageQuality
                                );
                                
                                // Center image horizontally and vertically in cell
                                const imgX = cellX + (columnWidth - dims.width) / 2;
                                const imgY = yPosition + (rowHeight - dims.height) / 2;
                                
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
                            }
                        } else {
                            // Handle as raster image (original method)
                            const image = await loadImage(cellContent.url);
                            
                            // Calculate dimensions with safer error handling
                            try {
                                // Enhanced safety for dimensions calculation
                                const dims = getImageDimensions(
                                    image, 
                                    columnWidth - (cellPadding * 2), 
                                    rowHeight - (cellPadding * 2),
                                    imageQuality
                                );
                                
                                // Verify dimensions are valid before using them
                                if (!dims || typeof dims !== 'object' || !dims.width || !dims.height || 
                                    isNaN(dims.width) || isNaN(dims.height) || 
                                    dims.width <= 0 || dims.height <= 0) {
                                    throw new Error('Invalid image dimensions calculated');
                                }
                                
                                // Use Math.max to ensure minimum sizes
                                const safeWidth = Math.max(dims.width, 1);
                                const safeHeight = Math.max(dims.height, 1);
                                
                                // Center image horizontally and vertically in cell
                                const imgX = cellX + (columnWidth - safeWidth) / 2;
                                const imgY = yPosition + (rowHeight - safeHeight) / 2;
                                
                                // Add image with explicit dimensions
                                doc.addImage(
                                    image,
                                    imageFormat,
                                    imgX,
                                    imgY,
                                    safeWidth, // Use safe width
                                    safeHeight, // Use safe height
                                    null, // No alias
                                    'MEDIUM' // Compression
                                );
                            } catch (dimensionError) {
                                console.error('Error processing image dimensions:', dimensionError);
                                // Add a placeholder for failed image
                                doc.setFontSize(10);
                                doc.setTextColor(150, 150, 150);
                                doc.text(`[Image scaling error: ${cellContent.url}]`, cellX + cellPadding, yPosition + cellPadding);
                                doc.setTextColor(0, 0, 0);
                            }
                        }
                    } catch (error) {
                        console.error('Error rendering image in table cell:', error, cellContent.url);
                        // Add error text that's centered
                        const errorText = '[Image Error]';
                        const txtWidth = doc.getStringUnitWidth(errorText) * 10 / doc.internal.scaleFactor;
                        const centerX = cellX + (columnWidth - txtWidth) / 2;
                        const centerY = yPosition + rowHeight / 2;
                        doc.text(errorText, centerX, centerY);
                    }
                } else if (cellContent.type === 'error') {
                    // Display error message
                    const errorText = cellContent.message || '[Error]';
                    const txtWidth = doc.getStringUnitWidth(errorText) * 10 / doc.internal.scaleFactor;
                    const centerX = cellX + (columnWidth - txtWidth) / 2;
                    const centerY = yPosition + rowHeight / 2;
                    doc.text(errorText, centerX, centerY);
                }
            }
            
            // Move position down after row
            yPosition += rowHeight;
        }
        
        // Add extra space after table
        yPosition += 10;
        
        // Return updated position and page
        return { yPosition, currentPage };
    }

    function updateProgress(value, text) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressContainer = document.getElementById('progressContainer');
        
        if (!progressContainer) return;
        
        progressContainer.style.display = 'block';
        progressBar.value = value;
        
        if (text) {
            progressText.textContent = text;
        }
        
        if (value >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
        }
    }

    window.$docsify.plugins = [].concat(function(hook, vm) {
        hook.mounted(function() {
            // Load libraries in proper sequence with callbacks
            loadJSPDF(function() {
                console.log("jsPDF loaded");
                loadOutlinePlugin(function() {
                    console.log("Outline plugin loaded");
                    
                    // Initialize the UI first, so we don't block on SVG2PDF loading
                    const settingsDiv = createSettingsDiv();
                    setupPrintButton(settingsDiv);
                    
                    // Then try to load SVG2PDF in the background
                    loadSVG2PDF(function() {
                        const svg2pdfAvailable = isSVG2PDFAvailable();
                        console.log("SVG2PDF status: " + (svg2pdfAvailable ? "available" : "not available"));
                    });
                });
            });
        });
    }, window.$docsify.plugins);

    // Helper function to set up the print button and UI handlers
    function setupPrintButton(settingsDiv) {
        const printButton = document.createElement('button');
        printButton.innerText = 'Print to PDF';
        printButton.style.position = 'fixed';
        printButton.style.bottom = '20px';
        printButton.style.right = '20px';
        printButton.style.padding = '8px 15px';
        printButton.style.backgroundColor = '#42b983';
        printButton.style.color = 'white';
        printButton.style.border = 'none';
        printButton.style.borderRadius = '4px';
        printButton.style.cursor = 'pointer';
        printButton.style.zIndex = '100';
        printButton.onclick = function() {
            settingsDiv.style.display = 'block';
        };
        document.body.appendChild(printButton);
        
        // Set up event handlers
        document.getElementById('startPDF').onclick = () => {
            const options = {
                paperSize: document.getElementById('paperSize').value,
                orientation: document.getElementById('orientation').value,
                theme: document.getElementById('theme').value,
                margins: document.getElementById('margins').value,
                imageQuality: document.getElementById('imageQuality').value,
                pdfVersion: document.getElementById('pdfVersion').value,
                imageFormat: document.getElementById('imageFormat').value,
                includeHeader: document.getElementById('includeHeader').checked,
                includeImages: document.getElementById('includeImages').checked,
                includeCode: document.getElementById('includeCode').checked,
                includeTables: document.getElementById('includeTables').checked,
                respectPageBreaks: document.getElementById('respectPageBreaks').checked,
                svgHandling: document.getElementById('svgHandling').value
            };
            
            settingsDiv.style.display = 'none';
            document.getElementById('progressContainer').style.display = 'block';
            
            // Use setTimeout to allow the UI to update before starting the PDF generation
            setTimeout(() => {
                generatePDF(options);
            }, 100);
        };
        
        document.getElementById('cancelPDF').onclick = () => {
            settingsDiv.style.display = 'none';
        };
        
        document.getElementById('debugPDF').onclick = () => {
            const options = {
                paperSize: document.getElementById('paperSize').value,
                orientation: document.getElementById('orientation').value,
                theme: document.getElementById('theme').value,
                margins: document.getElementById('margins').value,
                imageQuality: document.getElementById('imageQuality').value,
                pdfVersion: document.getElementById('pdfVersion').value,
                imageFormat: document.getElementById('imageFormat').value,
                includeHeader: document.getElementById('includeHeader').checked,
                includeImages: document.getElementById('includeImages').checked,
                includeCode: document.getElementById('includeCode').checked,
                includeTables: document.getElementById('includeTables').checked,
                respectPageBreaks: document.getElementById('respectPageBreaks').checked,
                svgHandling: document.getElementById('svgHandling').value
            };
            
            settingsDiv.style.display = 'none';
            generatePDF(options, true);
        };
    }
})();
