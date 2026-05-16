import { bannedDB, blockedDB } from '../stanydata/index.js';

/**
 * Check if a user is banned or blocked
 * @param {string} userId - User ID to check
 * @param {string} type - 'banned', 'blocked', or 'both' (default: 'both')
 * @returns {Promise<Object>} { isBanned, isBlocked, banInfo, blockInfo }
 */
async function isBanned(userId, type = 'both') {
    try {
        if (!userId) return { isBanned: false, isBlocked: false };
        
        let result = { isBanned: false, isBlocked: false, banInfo: null, blockInfo: null };
        
        if (type === 'both' || type === 'banned') {
            const banned = bannedDB.isBanned(userId);
            if (banned.isBanned) {
                result.isBanned = true;
                result.banInfo = banned.data;
            }
        }
        
        if (type === 'both' || type === 'blocked') {
            const blocked = blockedDB.isBlocked(userId);
            if (blocked.isBlocked) {
                result.isBlocked = true;
                result.blockInfo = blocked.data;
            }
        }
        
        return result;
    }
    catch (err) {
        console.error('❌ Error in isBanned:', err);
        return { isBanned: false, isBlocked: false, error: err.message };
    }
}

/**
 * Ban a user
 * @param {string} userId - User ID to ban
 * @param {string} reason - Ban reason
 * @param {string} bannedBy - Who banned the user
 * @returns {Promise<boolean>} Success status
 */
async function banUser(userId, reason = 'No reason', bannedBy = 'system') {
    return bannedDB.add(userId, reason, bannedBy);
}

/**
 * Unban a user
 * @param {string} userId - User ID to unban
 * @returns {Promise<boolean>} Success status
 */
async function unbanUser(userId) {
    return bannedDB.remove(userId);
}

/**
 * Block a user
 * @param {string} userId - User ID to block
 * @param {string} reason - Block reason
 * @param {string} blockedBy - Who blocked the user
 * @returns {Promise<boolean>} Success status
 */
async function blockUser(userId, reason = 'No reason', blockedBy = 'system') {
    return blockedDB.add(userId, reason, blockedBy);
}

/**
 * Unblock a user
 * @param {string} userId - User ID to unblock
 * @returns {Promise<boolean>} Success status
 */
async function unblockUser(userId) {
    return blockedDB.remove(userId);
}

export { isBanned as default, banUser, unbanUser, blockUser, unblockUser };
