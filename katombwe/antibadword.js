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

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Data directory
const DATA_DIR = join(process.cwd(), 'stanydata');
const antibadwordFilePath = join(DATA_DIR, 'antibadwordSettings.json');
const warningsFilePath = join(DATA_DIR, 'antibadwordWarnings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Bad words list
const BAD_WORDS = [
    // English profanity
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap', 'piss',
    'dick', 'cock', 'pussy', 'cunt', 'twat', 'wanker', 'whore', 'slut', 
    'motherfucker', 'asshole', 'son of a bitch', 'bullshit', 'horseshit',
    'goddamn', 'dammit', 'fucking', 'bloody', 'bugger', 'arse', 'arsehole',
    
    // Variations with numbers/letters
    'fck', 'fuk', 'fack', 'phuck', 'f*ck', 'f@ck', 'sh!t', 'sh*t', 'b!tch',
    'b1tch', 'b*tch', 'd!ck', 'd1ck', 'c0ck', 'c*nt', 'a$$', 'a$$hole',
    
    // African/Swahili offensive words (common in Tanzania)
    'mbwa', 'mbwa mwitu', 'kafiri', 'mnafiki', 'mwizi', 'jambazi', 'pumbavu',
    'mjinga', 'mpumbavu', 'shemeji', 'mlaghai', 'mhalifu', 'mkorofi', 
    'mshenzi', 'mnyama', 'nyoka', 'fala', 'dahalo', 'shenzi', 'joka',
    
    // Additional profanity
    'nigga', 'nigger', 'retard', 'moron', 'idiot', 'stupid', 'dumb',
    'loser', 'jerk', 'douche', 'douchebag', 'scumbag', 'trash',
    'garbage', 'rubbish', 'pathetic', 'worthless', 'useless'
];

/**
 * Load antibadword settings
 * @returns {Promise<Object>}
 */
async function loadAntibadwordSettings() {
    try {
        if (fs.existsSync(antibadwordFilePath)) {
            const data = fs.readFileSync(antibadwordFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('❌ Error loading antibadword settings:', error.message);
        return {};
    }
}

/**
 * Save antibadword settings
 * @param {Object} settings
 * @returns {Promise<boolean>}
 */
async function saveAntibadwordSettings(settings) {
    try {
        fs.writeFileSync(antibadwordFilePath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving antibadword settings:', error.message);
        return false;
    }
}

/**
 * Load warnings data
 * @returns {Promise<Object>}
 */
async function loadWarnings() {
    try {
        if (fs.existsSync(warningsFilePath)) {
            const data = fs.readFileSync(warningsFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('❌ Error loading warnings:', error.message);
        return {};
    }
}

/**
 * Save warnings data
 * @param {Object} warnings
 * @returns {Promise<boolean>}
 */
async function saveWarnings(warnings) {
    try {
        fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving warnings:', error.message);
        return false;
    }
}

/**
 * Get antibadword config for a group
 * @param {string} groupId
 * @returns {Promise<Object>}
 */
async function getAntiBadword(groupId) {
    try {
        const settings = await loadAntibadwordSettings();
        const config = settings[groupId];
        if (!config || !config.enabled) {
            return { enabled: false, action: null };
        }
        return { enabled: true, action: config.action || 'delete' };
    } catch (error) {
        console.error('❌ Error getting antibadword:', error.message);
        return { enabled: false, action: null };
    }
}

/**
 * Set antibadword for a group
 * @param {string} groupId
 * @param {boolean} enabled
 * @param {string} action
 * @returns {Promise<boolean>}
 */
async function setAntiBadword(groupId, enabled, action = 'delete') {
    try {
        const settings = await loadAntibadwordSettings();
        settings[groupId] = {
            enabled: enabled,
            action: action,
            updatedAt: new Date().toISOString()
        };
        await saveAntibadwordSettings(settings);
        return true;
    } catch (error) {
        console.error('❌ Error setting antibadword:', error.message);
        return false;
    }
}

/**
 * Remove antibadword for a group
 * @param {string} groupId
 * @returns {Promise<boolean>}
 */
async function removeAntiBadword(groupId) {
    try {
        const settings = await loadAntibadwordSettings();
        delete settings[groupId];
        await saveAntibadwordSettings(settings);
        return true;
    } catch (error) {
        console.error('❌ Error removing antibadword:', error.message);
        return false;
    }
}

/**
 * Increment warning count for a user
 * @param {string} groupId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function incrementWarningCount(groupId, userId) {
    try {
        const warnings = await loadWarnings();
        if (!warnings[groupId]) {
            warnings[groupId] = {};
        }
        if (!warnings[groupId][userId]) {
            warnings[groupId][userId] = 0;
        }
        warnings[groupId][userId]++;
        await saveWarnings(warnings);
        return warnings[groupId][userId];
    } catch (error) {
        console.error('❌ Error incrementing warning:', error.message);
        return 0;
    }
}

/**
 * Reset warning count for a user
 * @param {string} groupId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function resetWarningCount(groupId, userId) {
    try {
        const warnings = await loadWarnings();
        if (warnings[groupId] && warnings[groupId][userId]) {
            delete warnings[groupId][userId];
            await saveWarnings(warnings);
        }
        return true;
    } catch (error) {
        console.error('❌ Error resetting warning:', error.message);
        return false;
    }
}

/**
 * Get warning count for a user
 * @param {string} groupId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getWarningCount(groupId, userId) {
    try {
        const warnings = await loadWarnings();
        return warnings[groupId]?.[userId] || 0;
    } catch (error) {
        console.error('❌ Error getting warning count:', error.message);
        return 0;
    }
}

/**
 * Check if message contains bad words
 * @param {string} message
 * @returns {boolean}
 */
function containsBadWord(message) {
    if (!message || typeof message !== 'string') return false;
    
    const cleanMessage = message.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const words = cleanMessage.split(' ');
    
    for (const word of words) {
        if (word.length < 2) continue;
        
        // Direct match
        if (BAD_WORDS.includes(word)) return true;
        
        // Check if word contains any bad word
        for (const badWord of BAD_WORDS) {
            if (badWord.includes(' ')) {
                if (cleanMessage.includes(badWord)) return true;
            } else if (word.includes(badWord) || badWord.includes(word)) {
                if (Math.abs(word.length - badWord.length) <= 2) return true;
            }
        }
    }
    
    return false;
}

export {
    loadAntibadwordSettings,
    saveAntibadwordSettings,
    getAntiBadword,
    setAntiBadword,
    removeAntiBadword,
    incrementWarningCount,
    resetWarningCount,
    getWarningCount,
    containsBadWord,
    BAD_WORDS
};
