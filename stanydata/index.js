/**
 * STANY DATA - Database Management System
 * Auto-creates and manages all JSON databases
 */

import {
    premiumDB,
    bannedDB,
    blockedDB,
    whitelistDB,
    settingsDB,
    usageDB
} from './database.js';

export {
    premiumDB,
    bannedDB,
    blockedDB,
    whitelistDB,
    settingsDB,
    usageDB
};

// Helper function to check user status (banned, blocked, premium)
export async function checkUserStatus(userId) {
    const premium = premiumDB.isPremium(userId);
    const banned = bannedDB.isBanned(userId);
    const blocked = blockedDB.isBlocked(userId);
    const whitelisted = whitelistDB.isWhitelisted(userId);
    
    return {
        userId,
        isPremium: premium.isPremium,
        premiumData: premium.data,
        isBanned: banned.isBanned,
        banData: banned.data,
        isBlocked: blocked.isBlocked,
        blockData: blocked.data,
        isWhitelisted: whitelisted
    };
}

// Auto-reset daily usage at midnight
setInterval(() => {
    const now = new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = night - now;
    
    setTimeout(() => {
        usageDB.resetDaily();
        setInterval(() => usageDB.resetDaily(), 86400000);
    }, msUntilMidnight);
}, 1000);
