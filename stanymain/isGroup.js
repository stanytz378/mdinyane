/**
 * Check if a chat is a group
 * @param {string} chatId - Chat ID to check
 * @returns {Object} { isGroup, isNewsletter, isPrivate, jidType }
 */
function isGroup(chatId) {
    if (!chatId) return { isGroup: false, isNewsletter: false, isPrivate: false, jidType: 'unknown' };
    
    const result = {
        isGroup: false,
        isNewsletter: false,
        isPrivate: false,
        jidType: 'unknown'
    };
    
    if (chatId.endsWith('@g.us')) {
        result.isGroup = true;
        result.jidType = 'group';
    }
    else if (chatId.endsWith('@newsletter')) {
        result.isNewsletter = true;
        result.jidType = 'newsletter';
    }
    else if (chatId.includes('@s.whatsapp.net') || chatId.includes('@lid')) {
        result.isPrivate = true;
        result.jidType = 'private';
    }
    
    return result;
}

/**
 * Get group metadata with caching
 * @param {Object} sock - WhatsApp socket connection
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Group metadata
 */
const groupCache = new Map();

async function getGroupMetadata(sock, groupId) {
    try {
        if (!groupId.endsWith('@g.us')) return null;
        
        // Check cache (5 minutes)
        if (groupCache.has(groupId)) {
            const cached = groupCache.get(groupId);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }
        
        const metadata = await sock.groupMetadata(groupId);
        groupCache.set(groupId, { data: metadata, timestamp: Date.now() });
        return metadata;
    }
    catch (err) {
        console.error('❌ Error getting group metadata:', err);
        return null;
    }
}

export { isGroup as default, getGroupMetadata };
