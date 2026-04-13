export const config = {
    // Default WebSocket debugging address, can be overridden when calling Tool
    defaultHost: "127.0.0.1",
    defaultPort: 9222,
    // Memory queue configuration
    maxRecords: 500, // LRU to prevent memory leak
    // Host input validation: only allow IP addresses and hostnames, block malicious URLs
    hostValidationPattern: /^[a-zA-Z0-9.\-_]+$/,
    // Page load wait timeout (ms) for Ruishu feature detection after reload
    pageLoadTimeoutMs: 5000,
    // Ruishu universal detection parameters - Universal fingerprint extracted based on cross-site analysis
    ruishu: {
        // Dynamic token URL parameter feature: 5-12 alphanumeric Key + 40+ chars ciphertext Value
        tokenKeyPattern: /^[A-Za-z0-9]{5,12}$/,
        tokenMinValueLength: 40,
        // Ruishu 412 challenge page marker
        challengeMetaAttr: 'r', // <meta r='m'> / <script r='m'>
        challengeMetaValue: 'm',
        // Global variable name
        globalTsVar: '$_ts',
    }
};
