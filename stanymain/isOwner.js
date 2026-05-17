/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OWNER_FILE = path.join(process.cwd(), 'owner.json');

// Cache owner data for better performance
let cachedOwnerData = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Load owner data from file
 * @returns {Object|null} Owner data
 */
function loadOwnerDataFromFile() {
    try {
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            return {
                rawJid: data.OWNER_JID || null,
                cleanJid: data.OWNER_CLEAN_JID || data.OWNER_JID || null,
                cleanNumber: data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER || null,
                lid: data.ownerLID || null,
                linkedAt: data.linkedAt || null
            };
        }
        return null;
    } catch (error) {
        console.error('❌ Error loading owner.json:', error.message);
        return null;
    }
}

/**
 * Get owner data with caching
 * @returns {Object|null} Owner data
 */
function getOwnerData() {
    const now = Date.now();
    if (cachedOwnerData && (now - lastCacheTime) < CACHE_TTL) {
        return cachedOwnerData;
    }
    cachedOwnerData = loadOwnerDataFromFile();
    lastCacheTime = now;
    return cachedOwnerData;
}

/**
 * Clean JID to get just the phone number
 * @param {string} jid - JID to clean
 * @returns {string} Clean phone number
 */
function cleanNumber(jid) {
    if (!jid) return '';
    // Remove @s.whatsapp.net, @lid, @g.us, etc.
    let clean = jid.split('@')[0];
    // Remove device ID suffix (e.g., :5)
    clean = clean.split(':')[0];
    // Remove all non-numeric characters
    clean = clean.replace(/[^0-9]/g, '');
    return clean;
}

/**
 * Check if user is the bot owner
 * @param {string} userId - User ID to check (can be JID, LID, or phone number)
 * @param {Object} jidManager - JID Manager instance (optional)
 * @returns {Promise<Object>} { isOwner, ownerInfo, source }
 */
async function isOwner(userId, jidManager = null) {
    try {
        if (!userId) return { isOwner: false, ownerInfo: null, source: null };
        
        // Clean the user ID to get just the phone number
        const userCleanNumber = cleanNumber(userId);
        
        if (!userCleanNumber) {
            return { isOwner: false, ownerInfo: null, source: null };
        }
        
        // ============================================================
        // METHOD 1: Check via jidManager (from index.js)
        // ============================================================
        if (jidManager) {
            // Try getOwnerInfo method
            if (typeof jidManager.getOwnerInfo === 'function') {
                const ownerInfo = jidManager.getOwnerInfo();
                if (ownerInfo) {
                    const ownerNumber = ownerInfo.ownerNumber || ownerInfo.cleanNumber;
                    const ownerJid = ownerInfo.ownerJid || ownerInfo.cleanJid;
                    
                    if (ownerNumber === userCleanNumber) {
                        return { 
                            isOwner: true, 
                            ownerInfo: { number: ownerNumber, jid: ownerJid },
                            source: 'jidManager'
                        };
                    }
                    
                    if (ownerJid === userId || cleanNumber(ownerJid) === userCleanNumber) {
                        return { 
                            isOwner: true, 
                            ownerInfo: { number: ownerNumber, jid: ownerJid },
                            source: 'jidManager'
                        };
                    }
                }
            }
            
            // Try direct owner property
            if (jidManager.owner) {
                const ownerNumber = jidManager.owner.cleanNumber;
                if (ownerNumber === userCleanNumber) {
                    return { 
                        isOwner: true, 
                        ownerInfo: { number: ownerNumber, jid: jidManager.owner.cleanJid },
                        source: 'jidManager'
                    };
                }
            }
            
            // Try ownerJids Set
            if (jidManager.ownerJids) {
                for (const ownerJid of jidManager.ownerJids) {
                    if (cleanNumber(ownerJid) === userCleanNumber) {
                        return { 
                            isOwner: true, 
                            ownerInfo: { number: userCleanNumber, jid: ownerJid },
                            source: 'jidManager'
                        };
                    }
                }
            }
        }
        
        // ============================================================
        // METHOD 2: Check via owner.json file
        // ============================================================
        const ownerData = getOwnerData();
        
        if (ownerData) {
            // Check by clean number
            if (ownerData.cleanNumber === userCleanNumber) {
                return { 
                    isOwner: true, 
                    ownerInfo: {
                        number: ownerData.cleanNumber,
                        jid: ownerData.cleanJid,
                        lid: ownerData.lid
                    },
                    source: 'file'
                };
            }
            
            // Check by raw JID
            if (ownerData.rawJid === userId) {
                return { 
                    isOwner: true, 
                    ownerInfo: {
                        number: ownerData.cleanNumber,
                        jid: ownerData.cleanJid,
                        lid: ownerData.lid
                    },
                    source: 'file'
                };
            }
            
            // Check by clean JID
            if (ownerData.cleanJid === userId) {
                return { 
                    isOwner: true, 
                    ownerInfo: {
                        number: ownerData.cleanNumber,
                        jid: ownerData.cleanJid,
                        lid: ownerData.lid
                    },
                    source: 'file'
                };
            }
            
            // Check by LID
            if (ownerData.lid) {
                if (ownerData.lid === userId || cleanNumber(ownerData.lid) === userCleanNumber) {
                    return { 
                        isOwner: true, 
                        ownerInfo: {
                            number: ownerData.cleanNumber,
                            jid: ownerData.cleanJid,
                            lid: ownerData.lid
                        },
                        source: 'file'
                    };
                }
            }
        }
        
        return { isOwner: false, ownerInfo: null, source: null };
        
    } catch (err) {
        console.error('❌ Error in isOwner:', err.message);
        return { isOwner: false, ownerInfo: null, source: null, error: err.message };
    }
}

/**
 * Force refresh owner cache
 */
function refreshOwnerCache() {
    cachedOwnerData = loadOwnerDataFromFile();
    lastCacheTime = Date.now();
    return cachedOwnerData;
}

/**
 * Get owner information directly
 * @returns {Object|null} Owner information
 */
function getOwnerInfo() {
    return getOwnerData();
}

export default isOwner;
export { cleanNumber, refreshOwnerCache, getOwnerInfo };