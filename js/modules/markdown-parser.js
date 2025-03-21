/**
 * Markdown parser module for Docsify PDF Generator
 */
const MarkdownParser = (function() {
    // Fetch Markdown content from the given path
    async function fetchMarkdownContent(path = 'README.md') {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        } catch (error) {
            Logger.error('Error fetching Markdown content:', error);
            throw error;
        }
    }
    
    // Parse Markdown content into structured data
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

            // Check for headers - ensure IDs are generated consistently
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
                
                // Generate a normalized ID for the header that will match TOC links
                // This uses the same algorithm that Docsify uses for auto IDs
                const headerText = headerMatch[2];
                const headerId = headerText.toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove special characters
                    .replace(/\s+/g, '-')     // Replace spaces with hyphens
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
                
                parsedContent.push({
                    type: 'header',
                    level: headerMatch[1].length,
                    text: headerMatch[2],
                    id: headerId // Normalized ID for linking
                });
                
                Logger.debug(`Header parsed: "${headerMatch[2]}" → ID: "${headerId}"`);
                
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
                
                // Get the indentation level
                const indentLevel = ulMatch[1].length;
                
                // Check for links in the list item text - improved regex to better match brackets
                const itemText = ulMatch[2];
                const linkRegex = /\[(.*?)\]\((.*?)\)/;
                const linkMatch = itemText.match(linkRegex);
                
                if (linkMatch) {
                    // Process the link in the list item
                    const linkText = linkMatch[1];
                    let linkUrl = linkMatch[2];
                    
                    // Process internal links - preserve hash for TOC links
                    if (linkUrl.startsWith('#')) {
                        Logger.debug(`Table of Contents link found in list: text="${linkText}", url="${linkUrl}"`);
                        
                        // Create a list item with link - store exact text to ensure proper width calculation
                        const fullItem = {
                            text: itemText.replace(linkMatch[0], linkText), // Replace link with just the text
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl,
                            originalText: itemText
                        };
                        
                        // Debug the link parsing
                        Logger.debug(`Parsed TOC link item - text="${fullItem.text}", linkText="${fullItem.linkText}", url="${fullItem.linkUrl}"`);
                        
                        listItems.push(fullItem);
                    } else if (linkUrl.endsWith('.md')) {
                        // Convert relative markdown links
                        linkUrl = '#';
                        Logger.debug(`Converting .md link in list item to: ${linkUrl}`);
                        
                        listItems.push({
                            text: itemText.replace(linkMatch[0], linkText),
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl,
                            originalText: itemText
                        });
                    } else {
                        // External link
                        listItems.push({
                            text: itemText.replace(linkMatch[0], linkText),
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl,
                            originalText: itemText
                        });
                    }
                } else {
                    // Regular list item without link
                    listItems.push({
                        text: itemText,
                        level: Math.floor(indentLevel / 2)
                    });
                }
                
                i++;
                continue;
            }

            // Similar change for ordered lists
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
                
                // Get the indentation level
                const indentLevel = olMatch[1].length;
                
                // Check for links in the list item text
                const itemText = olMatch[2];
                const linkRegex = /\[(.*?)\]\((.*?)\)/;
                const linkMatch = itemText.match(linkRegex);
                
                if (linkMatch) {
                    // Process the link in the list item
                    const linkText = linkMatch[1];
                    let linkUrl = linkMatch[2];
                    
                    // Process internal links - preserve hash for TOC links
                    if (linkUrl.startsWith('#')) {
                        Logger.debug(`TOC link in ordered list item: ${linkUrl}`);
                        
                        // Create a list item with link
                        listItems.push({
                            text: itemText.replace(linkMatch[0], linkText), // Replace link with just the text
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl
                        });
                    } else if (linkUrl.endsWith('.md')) {
                        // Convert relative markdown links
                        linkUrl = '#';
                        Logger.debug(`Converting .md link in ordered list item to: ${linkUrl}`);
                        
                        listItems.push({
                            text: itemText.replace(linkMatch[0], linkText),
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl
                        });
                    } else {
                        // External link
                        listItems.push({
                            text: itemText.replace(linkMatch[0], linkText),
                            level: Math.floor(indentLevel / 2),
                            hasLink: true,
                            linkText: linkText,
                            linkUrl: linkUrl
                        });
                    }
                } else {
                    // Regular list item without link
                    listItems.push({
                        text: itemText,
                        level: Math.floor(indentLevel / 2)
                    });
                }
                
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

            // Process regular text with enhanced formatting support
            if (line.trim() !== '') {
                // Process links - both external and internal
                let processedText = line;
                const linkRegex = /\[(.*?)\]\((.*?)\)/g;
                const linkMatches = [...processedText.matchAll(linkRegex)];
                
                let textWithLinks = processedText;
                let links = [];
                
                // When processing links, make sure we handle both types of links:
                // TOC links: [Text](#id) and regular links
                if (linkMatches.length > 0) {
                    // Extract all links and replace with placeholders
                    linkMatches.forEach((match, index) => {
                        const linkText = match[1];
                        let linkUrl = match[2];
                        
                        // Specific handling for TOC links that start with #
                        if (linkUrl.startsWith('#')) {
                            // No changes needed - keep the # for proper ID matching
                            Logger.debug(`TOC link found: ${linkText} → ${linkUrl}`);
                        }
                        // Relative links to markdown files
                        else if (linkUrl.endsWith('.md')) {
                            linkUrl = '#'; // Set as link to first page
                            Logger.debug(`Markdown file link converted: ${match[2]} → #`);
                        }
                        // Other links
                        else if (!linkUrl.startsWith('http')) {
                            // Handle as external URL
                            try {
                                const baseUrl = window.location.origin + window.location.pathname;
                                const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
                                linkUrl = new URL(linkUrl, basePath).href;
                                Logger.debug(`Relative link converted to absolute: ${linkUrl}`);
                            } catch (e) {
                                Logger.warn(`Failed to resolve URL: ${linkUrl}`, e);
                            }
                        }
                        
                        const placeholder = `{{LINK_${index}}}`;
                        
                        links.push({
                            text: linkText,
                            url: linkUrl,
                            placeholder
                        });
                        
                        textWithLinks = textWithLinks.replace(match[0], placeholder);
                    });
                }
                
                // Process emphasis formatting
                const formattedSegments = [];
                let remainingText = textWithLinks;
                
                // Bold and Italic
                const boldItalicRegex = /\*\*\*(.*?)\*\*\*/g;
                const boldItalicMatches = [...remainingText.matchAll(boldItalicRegex)];
                
                if (boldItalicMatches.length > 0) {
                    let lastIndex = 0;
                    
                    boldItalicMatches.forEach(match => {
                        // Add text before this match
                        if (match.index > lastIndex) {
                            formattedSegments.push({
                                text: remainingText.substring(lastIndex, match.index),
                                format: 'normal'
                            });
                        }
                        
                        // Add the bold-italic text
                        formattedSegments.push({
                            text: match[1],
                            format: 'bolditalic'
                        });
                        
                        lastIndex = match.index + match[0].length;
                    });
                    
                    // Add any text after the last match
                    if (lastIndex < remainingText.length) {
                        formattedSegments.push({
                            text: remainingText.substring(lastIndex),
                            format: 'normal'
                        });
                    }
                    
                    // Update remaining text by joining segments
                    remainingText = formattedSegments.map(seg => seg.text).join('');
                    
                } else {
                    // If no bold-italic, start with the whole text as normal
                    formattedSegments.push({
                        text: remainingText,
                        format: 'normal'
                    });
                }
                
                // Process Bold
                const processedSegments = [];
                
                formattedSegments.forEach(segment => {
                    if (segment.format !== 'normal') {
                        processedSegments.push(segment);
                        return;
                    }
                    
                    const boldRegex = /\*\*(.*?)\*\*/g;
                    const boldMatches = [...segment.text.matchAll(boldRegex)];
                    
                    if (boldMatches.length > 0) {
                        let lastIndex = 0;
                        
                        boldMatches.forEach(match => {
                            // Add text before this match
                            if (match.index > lastIndex) {
                                processedSegments.push({
                                    text: segment.text.substring(lastIndex, match.index),
                                    format: 'normal'
                                });
                            }
                            
                            // Add the bold text
                            processedSegments.push({
                                text: match[1],
                                format: 'bold'
                            });
                            
                            lastIndex = match.index + match[0].length;
                        });
                        
                        // Add any text after the last match
                        if (lastIndex < segment.text.length) {
                            processedSegments.push({
                                text: segment.text.substring(lastIndex),
                                format: 'normal'
                            });
                        }
                    } else {
                        processedSegments.push(segment);
                    }
                });
                
                // Process Italic
                const finalSegments = [];
                
                processedSegments.forEach(segment => {
                    if (segment.format !== 'normal') {
                        finalSegments.push(segment);
                        return;
                    }
                    
                    const italicRegex = /\*(.*?)\*/g;
                    const italicMatches = [...segment.text.matchAll(italicRegex)];
                    
                    if (italicMatches.length > 0) {
                        let lastIndex = 0;
                        
                        italicMatches.forEach(match => {
                            // Add text before this match
                            if (match.index > lastIndex) {
                                finalSegments.push({
                                    text: segment.text.substring(lastIndex, match.index),
                                    format: 'normal'
                                });
                            }
                            
                            // Add the italic text
                            finalSegments.push({
                                text: match[1],
                                format: 'italic'
                            });
                            
                            lastIndex = match.index + match[0].length;
                        });
                        
                        // Add any text after the last match
                        if (lastIndex < segment.text.length) {
                            finalSegments.push({
                                text: segment.text.substring(lastIndex),
                                format: 'normal'
                            });
                        }
                    } else {
                        finalSegments.push(segment);
                    }
                });
                
                // Process Strikethrough
                const strikethroughSegments = [];
                
                finalSegments.forEach(segment => {
                    if (segment.format !== 'normal') {
                        strikethroughSegments.push(segment);
                        return;
                    }
                    
                    const strikeRegex = /~~(.*?)~~/g;
                    const strikeMatches = [...segment.text.matchAll(strikeRegex)];
                    
                    if (strikeMatches.length > 0) {
                        let lastIndex = 0;
                        
                        strikeMatches.forEach(match => {
                            // Add text before this match
                            if (match.index > lastIndex) {
                                strikethroughSegments.push({
                                    text: segment.text.substring(lastIndex, match.index),
                                    format: 'normal'
                                });
                            }
                            
                            // Add the strikethrough text
                            strikethroughSegments.push({
                                text: match[1],
                                format: 'strikethrough'
                            });
                            
                            lastIndex = match.index + match[0].length;
                        });
                        
                        // Add any text after the last match
                        if (lastIndex < segment.text.length) {
                            strikethroughSegments.push({
                                text: segment.text.substring(lastIndex),
                                format: 'normal'
                            });
                        }
                    } else {
                        strikethroughSegments.push(segment);
                    }
                });
                
                // Process Inline Code
                const codeSegments = [];
                
                strikethroughSegments.forEach(segment => {
                    if (segment.format !== 'normal') {
                        codeSegments.push(segment);
                        return;
                    }
                    
                    const codeRegex = /`([^`]+)`/g;
                    const codeMatches = [...segment.text.matchAll(codeRegex)];
                    
                    if (codeMatches.length > 0) {
                        let lastIndex = 0;
                        
                        codeMatches.forEach(match => {
                            // Add text before this match
                            if (match.index > lastIndex) {
                                codeSegments.push({
                                    text: segment.text.substring(lastIndex, match.index),
                                    format: 'normal'
                                });
                            }
                            
                            // Add the inline code
                            codeSegments.push({
                                text: match[1],
                                format: 'inlinecode'
                            });
                            
                            lastIndex = match.index + match[0].length;
                        });
                        
                        // Add any text after the last match
                        if (lastIndex < segment.text.length) {
                            codeSegments.push({
                                text: segment.text.substring(lastIndex),
                                format: 'normal'
                            });
                        }
                    } else {
                        codeSegments.push(segment);
                    }
                });
                
                // Restore links
                if (links.length > 0) {
                    const segmentsWithLinks = [];
                    
                    codeSegments.forEach(segment => {
                        let segText = segment.text;
                        let hasLinks = false;
                        
                        // Check if this segment contains any link placeholders
                        links.forEach(link => {
                            if (segText.includes(link.placeholder)) {
                                hasLinks = true;
                            }
                        });
                        
                        if (hasLinks) {
                            // Process each link placeholder
                            links.forEach(link => {
                                if (segText.includes(link.placeholder)) {
                                    const parts = segText.split(link.placeholder);
                                    
                                    // Add text before link
                                    if (parts[0]) {
                                        segmentsWithLinks.push({
                                            text: parts[0],
                                            format: segment.format
                                        });
                                    }
                                    
                                    // Add the link
                                    segmentsWithLinks.push({
                                        text: link.text,
                                        format: segment.format,
                                        link: link.url
                                    });
                                    
                                    // Update remaining text
                                    segText = parts.slice(1).join(link.placeholder);
                                }
                            });
                            
                            // Add any remaining text
                            if (segText) {
                                segmentsWithLinks.push({
                                    text: segText,
                                    format: segment.format
                                });
                            }
                        } else {
                            // No links in this segment
                            segmentsWithLinks.push(segment);
                        }
                    });
                    
                    // Use the segments with links
                    parsedContent.push({
                        type: 'formattedText',
                        segments: segmentsWithLinks
                    });
                } else {
                    // No links, use the segments as is
                    parsedContent.push({
                        type: 'formattedText',
                        segments: codeSegments
                    });
                }
                
                i++;
                continue;
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

        // At the end of parseMarkdown, add a debug log for any list items with links
        if (listItems.length > 0) {
            const linksInList = listItems.filter(item => item.hasLink);
            if (linksInList.length > 0) {
                Logger.debug(`Found ${linksInList.length} list items with links:`);
                linksInList.forEach(item => 
                    Logger.debug(`  - Link: "${item.linkText}" to "${item.linkUrl}"`));
            }
        }

        return parsedContent;
    }
    
    return {
        fetchMarkdownContent,
        parseMarkdown
    };
})();