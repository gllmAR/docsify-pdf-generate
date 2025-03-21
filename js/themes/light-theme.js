/**
 * Light Theme for Docsify PDF Generator
 */
const LightTheme = {
    name: 'Light',
    description: 'Clean light theme with subtle colors',
    
    // Page settings
    page: {
        backgroundColor: 'transparent', // No background by default
        margins: 10
    },
    
    // Text settings
    text: {
        color: [0, 0, 0], // Black text
        linkColor: [41, 182, 246], // Light blue for links
        headingColor: [25, 118, 210], // Darker blue for headings
        codeColor: [33, 33, 33] // Dark gray for code
    },
    
    // Element settings
    elements: {
        // Headers
        header: {
            h1: {
                fontSize: 24,
                fontWeight: 'bold',
                color: [25, 118, 210], // Darker blue
                marginBottom: 8
            },
            h2: {
                fontSize: 20,
                fontWeight: 'bold',
                color: [30, 136, 229], // Slightly lighter blue
                marginBottom: 6
            },
            h3: {
                fontSize: 16,
                fontWeight: 'bold',
                color: [66, 165, 245], // Even lighter blue
                marginBottom: 4
            },
            h4: {
                fontSize: 14,
                fontWeight: 'bold',
                color: [0, 0, 0], // Black
                marginBottom: 3
            },
            h5: {
                fontSize: 12,
                fontWeight: 'bold',
                color: [0, 0, 0], // Black
                marginBottom: 2
            },
            h6: {
                fontSize: 11,
                fontWeight: 'bold',
                color: [0, 0, 0], // Black
                marginBottom: 2
            }
        },
        
        // Code blocks
        codeBlock: {
            backgroundColor: [240, 240, 240], // Light gray
            borderColor: [220, 220, 220], // Lighter gray
            color: [33, 33, 33] // Dark gray text
        },
        
        // Blockquotes
        blockquote: {
            backgroundColor: [245, 245, 245], // Very light gray
            borderColor: [224, 224, 224], // Light gray
            color: [97, 97, 97] // Medium gray text
        },
        
        // Tables
        table: {
            headerBackgroundColor: [240, 240, 240], // Light gray
            headerTextColor: [0, 0, 0], // Black
            rowBackgroundColor: [255, 255, 255], // White
            alternateRowBackgroundColor: [248, 248, 248], // Very light gray
            borderColor: [224, 224, 224] // Light gray
        },
        
        // Horizontal rule
        horizontalRule: {
            color: [224, 224, 224], // Light gray
            width: 0.5
        }
    }
};
