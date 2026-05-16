import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PREMIUM_FILE = path.join(__dirname, '..', 'premium_users.json');

/**
 * Check if a user is premium
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} { isPremium, expiryDate, daysLeft }
 */
async function isPremium(userId) {
    try {
        if (!userId) return { isPremium: false, expiryDate: null, daysLeft: 0 };
        
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        
        if (!fs.existsSync(PREMIUM_FILE)) {
            return { isPremium: false, expiryDate: null, daysLeft: 0 };
        }
        
        const data = JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf8'));
        const premiumUsers = data.users || [];
        
        const userPremium = premiumUsers.find(user => {
            const userClean = user.id?.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            return userClean === cleanId || user.id === userId;
        });
        
        if (!userPremium) {
            return { isPremium: false, expiryDate: null, daysLeft: 0 };
        }
        
        const expiryDate = new Date(userPremium.expiryDate);
        const now = new Date();
        
        if (expiryDate < now) {
            return { isPremium: false, expiryDate: null, daysLeft: 0, expired: true };
        }
        
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        return {
            isPremium: true,
            expiryDate: userPremium.expiryDate,
            daysLeft,
            plan: userPremium.plan || 'basic',
            activatedAt: userPremium.activatedAt
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
 * @returns {Promise<boolean>}
 */
async function addPremium(userId, days = 30, plan = 'basic') {
    try {
        let data = { users: [] };
        
        if (fs.existsSync(PREMIUM_FILE)) {
            data = JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf8'));
        }
        
        const cleanId = userId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        // Remove existing if any
        data.users = data.users.filter(user => {
            const userClean = user.id?.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            return userClean !== cleanId;
        });
        
        data.users.push({
            id: userId,
            cleanId,
            plan,
            days,
            activatedAt: new Date().toISOString(),
            expiryDate: expiryDate.toISOString()
        });
        
        fs.writeFileSync(PREMIUM_FILE, JSON.stringify(data, null, 2));
        return true;
    }
    catch (err) {
        console.error('❌ Error adding premium:', err);
        return false;
    }
}

export { isPremium as default, addPremium };
