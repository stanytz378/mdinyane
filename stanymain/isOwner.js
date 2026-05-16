import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OWNER_FILE = path.join(__dirname, '..', 'owner.json');

/**
 * Check if user is the bot owner
 * @param {string} userId - User ID to check
 * @param {Object} jidManager - JID Manager instance (optional)
 * @returns {Promise<Object>} { isOwner, ownerInfo }
 */
async function isOwner(userId, jidManager = null) {
    try {
        if (!userId) return { isOwner: false, ownerInfo: null };
        
        // Clean the user ID
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        
        // Try to get owner from jidManager first
        if (jidManager && jidManager.getOwnerInfo) {
            const ownerInfo = jidManager.getOwnerInfo();
            const ownerNumber = ownerInfo?.ownerNumber || ownerInfo?.cleanNumber;
            const ownerJid = ownerInfo?.ownerJid || ownerInfo?.cleanJid;
            
            const isMatch = (cleanId === ownerNumber) || 
                           (userId === ownerJid) ||
                           (cleanId === ownerJid?.split('@')[0]);
            
            if (isMatch) {
                return { isOwner: true, ownerInfo, source: 'jidManager' };
            }
        }
        
        // Fallback: Read from owner.json
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            const ownerNumber = data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER;
            const ownerJid = data.OWNER_CLEAN_JID || data.OWNER_JID;
            
            const isMatch = (cleanId === ownerNumber) || 
                           (userId === ownerJid) ||
                           (cleanId === ownerJid?.split('@')[0]);
            
            if (isMatch) {
                return { 
                    isOwner: true, 
                    ownerInfo: {
                        number: ownerNumber,
                        jid: ownerJid,
                        lid: data.ownerLID || null
                    },
                    source: 'file'
                };
            }
        }
        
        return { isOwner: false, ownerInfo: null };
    }
    catch (err) {
        console.error('❌ Error in isOwner:', err);
        return { isOwner: false, ownerInfo: null, error: err.message };
    }
}

export default isOwner;
