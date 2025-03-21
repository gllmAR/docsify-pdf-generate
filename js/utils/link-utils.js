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
    
    return {
        findHeaderPage
    };
})();
