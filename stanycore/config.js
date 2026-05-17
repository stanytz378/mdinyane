/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const CONFIG_FILE = path.join(DATA_DIR, 'bot_config.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default configuration
const defaultConfig = {
    ownerNumber: '',
    ownerName: 'STANY TZ',
    prefix: '.',
    mode: 'public',  // public, private, groups, self
    sessionId: '',
    // Auto Typing settings
    autoTyping: false,
    autoTypingLocation: 'both',  // both, private, groups
    // Auto Recording settings
    autoRecording: false,
    autoRecordingLocation: 'both',  // both, private, groups
    // Auto Read settings
    autoRead: false,
    autoReadGroups: true,
    autoReadPrivate: true,
    // Always Online
    alwaysOnline: false,
    updatedAt: new Date().toISOString()
};

let config = { ...defaultConfig };

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            config = { ...defaultConfig, ...saved };
        } else {
            saveConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return config;
}

function saveConfig() {
    try {
        config.updatedAt = new Date().toISOString();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

function updateConfig(updates) {
    config = { ...config, ...updates };
    saveConfig();
    return config;
}

loadConfig();

export { config, loadConfig, saveConfig, updateConfig };