/**
 * Link utilities for PDF Generator
 */
const LinkUtils = (function() {
    // Find the page number for a header by ID
    function findHeaderPage(headerId, headerPageMap) {
        if (!headerId) return null;
        
        Logger.debug(`Looking up header ID: "${headerId}"`);
        
        // Try exact match first
        if (headerPageMap.has(headerId)) {
            Logger.debug(`Found exact match for "${headerId}" → Page ${headerPageMap.get(headerId)}`);
            return headerPageMap.get(headerId);
        }
        
        // If it starts with #, try without the hash
        if (headerId.startsWith('#')) {
            const idWithoutHash = headerId.substring(1);
            if (headerPageMap.has(idWithoutHash)) {
                Logger.debug(`Found match for "${headerId}" without hash → Page ${headerPageMap.get(idWithoutHash)}`);
                return headerPageMap.get(idWithoutHash);
            }
        } 
        // If it doesn't have a #, try with a hash
        else if (!headerId.startsWith('#')) {
            const idWithHash = '#' + headerId;
            if (headerPageMap.has(idWithHash)) {
                Logger.debug(`Found match for "${headerId}" with hash → Page ${headerPageMap.get(idWithHash)}`);
                return headerPageMap.get(idWithHash);
            }
        }
        
        // For hash-only link (#), go to first page
        if (headerId === '#') {
            Logger.debug('Empty hash link going to first page');
            return 1;
        }
        
        // Special case: normalize slug - convert spaces to dashes, lowercase
        const normalizedId = headerId.replace('#', '').toLowerCase().replace(/\s+/g, '-');
        if (headerPageMap.has(normalizedId)) {
            Logger.debug(`Found normalized match for "${headerId}" → "${normalizedId}" → Page ${headerPageMap.get(normalizedId)}`);
            return headerPageMap.get(normalizedId);
        }
        
        // Try kebab-case version for anchor links (common in markdown docs)
        // This converts "Heading Text" to "heading-text"
        const kebabCaseId = headerId.replace('#', '')
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-'); // Replace spaces with dashes
        
        if (headerPageMap.has(kebabCaseId)) {
            Logger.debug(`Found kebab-case match: "${headerId}" → "${kebabCaseId}" → Page ${headerPageMap.get(kebabCaseId)}`);
            return headerPageMap.get(kebabCaseId);
        }
        
        // Handle common variations of kebab case (with or without special chars)
        const simplifiedId = headerId.replace(/[^a-z0-9]/gi, '').toLowerCase();
        for (const [key, value] of headerPageMap.entries()) {
            const simplifiedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (simplifiedKey === simplifiedId) {
                Logger.debug(`Found simplified match: "${headerId}" ~ "${key}" → Page ${value}`);
                return value;
            }
        }
        
        // Last resort: try looser matching
        for (const [key, value] of headerPageMap.entries()) {
            const cleanKey = key.replace(/[#-]/g, '').toLowerCase();
            const cleanId = headerId.replace(/[#-]/g, '').toLowerCase();
            if (cleanKey === cleanId) {
                Logger.debug(`Found loose match: "${headerId}" ~ "${key}" → Page ${value}`);
                return value;
            }
        }
        
        // Log all keys in the map to help debug
        Logger.debug(`No page found for header ID: "${headerId}" - Available IDs: ${Array.from(headerPageMap.keys()).join(', ')}`);
        return null;
    }
    
    // Generate a standardized ID from heading text (to match what Markdown processors typically do)
    function generateIdFromText(text) {
        if (!text) return '';
        
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')    // Replace spaces with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    
    // Process a Markdown link to extract its URL and text
    function processMarkdownLink(linkText) {
        const linkMatch = linkText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (!linkMatch) return null;
        
        return {
            text: linkMatch[1],
            url: linkMatch[2]
        };
    }
    
    return {
        findHeaderPage,
        generateIdFromText,
        processMarkdownLink
    };
})();
