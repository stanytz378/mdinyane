import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BANNED_USERS_FILE = path.join(__dirname, '..', 'banned_users.json');
const BLOCKED_USERS_FILE = path.join(__dirname, '..', 'blocked_users.json');

/**
 * Check if a user is banned or blocked
 * @param {string} userId - User ID to check
 * @param {string} type - 'banned', 'blocked', or 'both' (default: 'both')
 * @returns {Promise<Object>} { isBanned, isBlocked, banInfo, blockInfo }
 */
async function isBanned(userId, type = 'both') {
    try {
        if (!userId) return { isBanned: false, isBlocked: false };
        
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        let result = { isBanned: false, isBlocked: false, banInfo: null, blockInfo: null };
        
        // Check banned users
        if (type === 'both' || type === 'banned') {
            if (fs.existsSync(BANNED_USERS_FILE)) {
                const data = JSON.parse(fs.readFileSync(BANNED_USERS_FILE, 'utf8'));
                const bannedUsers = data.users || [];
                
                const isUserBanned = bannedUsers.some(user => {
                    const userClean = user.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                    return userClean === cleanId || user === userId;
                });
                
                if (isUserBanned) {
                    result.isBanned = true;
                    result.banInfo = {
                        reason: data.reason || 'No reason provided',
                        bannedAt: data.bannedAt || new Date().toISOString(),
                        bannedBy: data.bannedBy || 'system'
                    };
                }
            }
        }
        
        // Check blocked users
        if (type === 'both' || type === 'blocked') {
            if (fs.existsSync(BLOCKED_USERS_FILE)) {
                const data = JSON.parse(fs.readFileSync(BLOCKED_USERS_FILE, 'utf8'));
                const blockedUsers = data.users || [];
                
                const isUserBlocked = blockedUsers.some(user => {
                    const userClean = user.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                    return userClean === cleanId || user === userId;
                });
                
                if (isUserBlocked) {
                    result.isBlocked = true;
                    result.blockInfo = {
                        reason: data.reason || 'No reason provided',
                        blockedAt: data.blockedAt || new Date().toISOString(),
                        blockedBy: data.blockedBy || 'system'
                    };
                }
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
    try {
        let data = { users: [], reason: '', bannedAt: '', bannedBy: '' };
        
        if (fs.existsSync(BANNED_USERS_FILE)) {
            data = JSON.parse(fs.readFileSync(BANNED_USERS_FILE, 'utf8'));
        }
        
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (!data.users.includes(userId) && !data.users.includes(cleanId)) {
            data.users.push(userId);
            data.reason = reason;
            data.bannedAt = new Date().toISOString();
            data.bannedBy = bannedBy;
            fs.writeFileSync(BANNED_USERS_FILE, JSON.stringify(data, null, 2));
        }
        
        return true;
    }
    catch (err) {
        console.error('❌ Error banning user:', err);
        return false;
    }
}

/**
 * Unban a user
 * @param {string} userId - User ID to unban
 * @returns {Promise<boolean>} Success status
 */
async function unbanUser(userId) {
    try {
        if (!fs.existsSync(BANNED_USERS_FILE)) return false;
        
        const data = JSON.parse(fs.readFileSync(BANNED_USERS_FILE, 'utf8'));
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        
        data.users = data.users.filter(user => {
            const userClean = user.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            return userClean !== cleanId && user !== userId;
        });
        
        fs.writeFileSync(BANNED_USERS_FILE, JSON.stringify(data, null, 2));
        return true;
    }
    catch (err) {
        console.error('❌ Error unbanning user:', err);
        return false;
    }
}

export { isBanned as default, banUser, unbanUser };
