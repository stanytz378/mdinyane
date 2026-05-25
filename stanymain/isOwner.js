/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OWNER_FILE = path.join(process.cwd(), 'owner.json');

// Cache for owner data
let ownerCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

function getOwnerFromFile() {
    try {
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            return {
                number: data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER,
                jid: data.OWNER_CLEAN_JID || data.OWNER_JID,
                lid: data.ownerLID || null
            };
        }
    } catch (err) {
        console.error('Error reading owner file:', err.message);
    }
    return null;
}

async function isOwner(userId, jidManager = null, sock = null) {
    try {
        if (!userId) return { isOwner: false };
        
        // Clean the user ID - remove @s.whatsapp.net, @g.us, @lid, etc.
        let cleanUserId = userId;
        if (cleanUserId.includes('@')) {
            cleanUserId = cleanUserId.split('@')[0];
        }
        if (cleanUserId.includes(':')) {
            cleanUserId = cleanUserId.split(':')[0];
        }
        // Remove non-numeric characters for number comparison
        const cleanNumber = cleanUserId.replace(/[^0-9]/g, '');
        
        // ============================================================
        // METHOD 1: Check jidManager (most reliable)
        // ============================================================
        if (jidManager && typeof jidManager.isOwner === 'function') {
            try {
                // Create a fake message object for jidManager check
                const mockMsg = {
                    key: {
                        participant: userId,
                        remoteJid: userId,
                        fromMe: false
                    }
                };
                if (jidManager.isOwner(mockMsg)) {
                    return { isOwner: true, method: 'jidManager', ownerInfo: jidManager.getOwnerInfo?.() };
                }
            } catch (e) {}
        }
        
        // ============================================================
        // METHOD 2: Check via sock (connected device)
        // ============================================================
        if (sock && sock.user && sock.user.id) {
            const botOwnerId = sock.user.id;
            let botOwnerNumber = botOwnerId;
            if (botOwnerNumber.includes('@')) {
                botOwnerNumber = botOwnerNumber.split('@')[0];
            }
            botOwnerNumber = botOwnerNumber.replace(/[^0-9]/g, '');
            
            if (cleanNumber === botOwnerNumber) {
                // Save to owner.json if not already saved
                if (!fs.existsSync(OWNER_FILE) || Date.now() - lastCacheUpdate > CACHE_TTL) {
                    const ownerData = {
                        OWNER_JID: sock.user.id,
                        OWNER_NUMBER: botOwnerNumber,
                        OWNER_CLEAN_JID: sock.user.id,
                        OWNER_CLEAN_NUMBER: botOwnerNumber,
                        linkedAt: new Date().toISOString(),
                        method: 'auto-detected'
                    };
                    fs.writeFileSync(OWNER_FILE, JSON.stringify(ownerData, null, 2));
                    lastCacheUpdate = Date.now();
                }
                return { isOwner: true, method: 'sock', ownerInfo: { number: botOwnerNumber } };
            }
        }
        
        // ============================================================
        // METHOD 3: Check owner.json file
        // ============================================================
        const ownerFromFile = getOwnerFromFile();
        if (ownerFromFile && ownerFromFile.number) {
            if (cleanNumber === ownerFromFile.number) {
                return { isOwner: true, method: 'file', ownerInfo: ownerFromFile };
            }
        }
        
        // ============================================================
        // METHOD 4: Check environment variable
        // ============================================================
        const envOwner = process.env.OWNER_NUMBER;
        if (envOwner) {
            const cleanEnvOwner = envOwner.replace(/[^0-9]/g, '');
            if (cleanNumber === cleanEnvOwner) {
                return { isOwner: true, method: 'env', ownerInfo: { number: cleanEnvOwner } };
            }
        }
        
        return { isOwner: false };
        
    } catch (err) {
        console.error('isOwner error:', err);
        return { isOwner: false };
    }
}

// Function to force set owner
export async function forceSetOwner(ownerJid, ownerNumber) {
    try {
        const cleanNumber = ownerNumber?.replace(/[^0-9]/g, '') || ownerJid?.split('@')[0]?.replace(/[^0-9]/g, '');
        const ownerData = {
            OWNER_JID: ownerJid,
            OWNER_NUMBER: cleanNumber,
            OWNER_CLEAN_JID: ownerJid,
            OWNER_CLEAN_NUMBER: cleanNumber,
            forceSetAt: new Date().toISOString(),
            method: 'force-set'
        };
        fs.writeFileSync(OWNER_FILE, JSON.stringify(ownerData, null, 2));
        ownerCache = ownerData;
        lastCacheUpdate = Date.now();
        console.log(`✅ Owner force set to: ${cleanNumber}`);
        return true;
    } catch (err) {
        console.error('Failed to force set owner:', err);
        return false;
    }
}

// Function to get current owner info
export function getOwnerInfo() {
    try {
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            return {
                number: data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER,
                jid: data.OWNER_CLEAN_JID || data.OWNER_JID,
                linkedAt: data.linkedAt || data.forceSetAt,
                method: data.method || 'unknown'
            };
        }
    } catch (err) {
        console.error('Error getting owner info:', err.message);
    }
    return null;
}

// Function to check if current user is owner (simple version)
export function isOwnerSimple(userId) {
    if (!userId) return false;
    
    const cleanNumber = userId.split('@')[0].replace(/[^0-9]/g, '');
    const ownerFromFile = getOwnerFromFile();
    
    if (ownerFromFile && ownerFromFile.number) {
        return cleanNumber === ownerFromFile.number;
    }
    
    const envOwner = process.env.OWNER_NUMBER;
    if (envOwner) {
        const cleanEnvOwner = envOwner.replace(/[^0-9]/g, '');
        return cleanNumber === cleanEnvOwner;
    }
    
    return false;
}

export default isOwner;