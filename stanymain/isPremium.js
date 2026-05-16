import { premiumDB } from '../stanydata/index.js';

/**
 * Check if a user is premium
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} { isPremium, expiryDate, daysLeft, plan }
 */
async function isPremium(userId) {
    try {
        if (!userId) return { isPremium: false, expiryDate: null, daysLeft: 0 };
        
        const result = premiumDB.isPremium(userId);
        
        if (!result.isPremium) {
            return { isPremium: false, expiryDate: null, daysLeft: 0 };
        }
        
        const expiryDate = result.data.expiryDate ? new Date(result.data.expiryDate) : null;
        let daysLeft = 0;
        
        if (expiryDate) {
            daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) {
                premiumDB.remove(userId);
                return { isPremium: false, expiryDate: null, daysLeft: 0 };
            }
        }
        
        return {
            isPremium: true,
            expiryDate: result.data.expiryDate,
            daysLeft,
            plan: result.data.plan || 'basic',
            addedAt: result.data.addedAt,
            addedBy: result.data.addedBy
        };
    }
    catch (err) {
        console.error('❌ Error checking premium:', err);
        return { isPremium: false, expiryDate: null, daysLeft: 0, error: err.message };
    }
}

/**
 * Add premium user
 * @param {string} userId - User ID
 * @param {number} days - Number of days
 * @param {string} plan - Premium plan
 * @param {string} addedBy - Who added the user
 * @returns {Promise<Object>} Added user data
 */
async function addPremium(userId, days = 30, plan = 'basic', addedBy = 'system') {
    return premiumDB.add(userId, { days, plan, addedBy });
}

/**
 * Remove premium from user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function removePremium(userId) {
    return premiumDB.remove(userId);
}

/**
 * Get premium stats
 * @returns {Promise<Object>} Premium statistics
 */
async function getPremiumStats() {
    return premiumDB.getStats();
}

export { isPremium as default, addPremium, removePremium, getPremiumStats };
