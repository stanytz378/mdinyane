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

// Data directory for antilink settings
const DATA_DIR = join(process.cwd(), 'stanydata');
const antilinkFilePath = join(DATA_DIR, 'antilinkSettings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load antilink settings from file
 * @returns {Promise<Object>} Antilink settings
 */
async function loadAntilinkSettings() {
    try {
        if (fs.existsSync(antilinkFilePath)) {
            const data = fs.readFileSync(antilinkFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('❌ Error loading antilink settings:', error.message);
        return {};
    }
}

/**
 * Save antilink settings to file
 * @param {Object} settings - Antilink settings to save
 * @returns {Promise<boolean>}
 */
async function saveAntilinkSettings(settings) {
    try {
        fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving antilink settings:', error.message);
        return false;
    }
}

/**
 * Set antilink setting for a group
 * @param {string} groupId - Group ID
 * @param {string} type - 'on', 'off', 'delete', 'kick', 'warn'
 * @returns {Promise<boolean>}
 */
async function setAntilinkSetting(groupId, type) {
    try {
        const settings = await loadAntilinkSettings();
        settings[groupId] = {
            enabled: type !== 'off',
            action: type === 'on' ? 'delete' : type,
            updatedAt: new Date().toISOString()
        };
        await saveAntilinkSettings(settings);
        return true;
    } catch (error) {
        console.error('❌ Error setting antilink:', error.message);
        return false;
    }
}

/**
 * Get antilink setting for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} { enabled, action }
 */
async function getAntilinkSetting(groupId) {
    try {
        const settings = await loadAntilinkSettings();
        const setting = settings[groupId];
        if (!setting || !setting.enabled) {
            return { enabled: false, action: null };
        }
        return { enabled: true, action: setting.action || 'delete' };
    } catch (error) {
        console.error('❌ Error getting antilink:', error.message);
        return { enabled: false, action: null };
    }
}

/**
 * Remove antilink setting for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>}
 */
async function removeAntilinkSetting(groupId) {
    try {
        const settings = await loadAntilinkSettings();
        delete settings[groupId];
        await saveAntilinkSettings(settings);
        return true;
    } catch (error) {
        console.error('❌ Error removing antilink:', error.message);
        return false;
    }
}

export { 
    setAntilinkSetting, 
    getAntilinkSetting, 
    loadAntilinkSettings, 
    saveAntilinkSettings,
    removeAntilinkSetting
};
