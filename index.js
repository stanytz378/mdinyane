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

// ============================================================
//  MDINYANE — WhatsApp Bot Framework
// ============================================================

// ============================================================
// CONSOLE LOGGER SETUP
// ============================================================

const originalConsoleMethods = {
    log: console.log, info: console.info, warn: console.warn,
    error: console.error, debug: console.debug, trace: console.trace,
    dir: console.dir, dirxml: console.dirxml, table: console.table,
    time: console.time, timeEnd: console.timeEnd, timeLog: console.timeLog,
    group: console.group, groupEnd: console.groupEnd, groupCollapsed: console.groupCollapsed,
    clear: console.clear, count: console.count, countReset: console.countReset,
    assert: console.assert, profile: console.profile, profileEnd: console.profileEnd,
    timeStamp: console.timeStamp, context: console.context
};

const shouldShowLog = (args) => {
    if (args.length === 0) return true;
    const firstArg = args[0];
    if (typeof firstArg !== 'string') return true;
    const lowerMsg = firstArg.toLowerCase();
    if (lowerMsg.includes('command') ||
        lowerMsg.includes('✅') || lowerMsg.includes('❌') ||
        lowerMsg.includes('👥') || lowerMsg.includes('👤')) return true;
    if (!lowerMsg.includes('baileys') && !lowerMsg.includes('signal') &&
        !lowerMsg.includes('session') && !lowerMsg.includes('buffer') &&
        !lowerMsg.includes('key')) return true;
    const noisyPatterns = ['closing session', 'sessionentry', 'registrationid',
        'currentratchet', 'buffer', '05 ', '0x', 'failed to decrypt'];
    return !noisyPatterns.some(pattern => lowerMsg.includes(pattern));
};

for (const method of Object.keys(originalConsoleMethods)) {
    if (typeof console[method] === 'function') {
        console[method] = function (...args) {
            if (shouldShowLog(args)) originalConsoleMethods[method].apply(console, args);
        };
    }
}

function setupProcessFilter() {
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;
    const sessionPatterns = ['closing session','sessionentry','registrationid','currentratchet',
        'indexinfo','pendingprekey','_chains','ephemeralkeypair','lastremoteephemeralkey','rootkey','basekey'];
    const filterOutput = (chunk) => {
        const lowerChunk = chunk.toString().toLowerCase();
        return !sessionPatterns.some(p => lowerChunk.includes(p));
    };
    process.stdout.write = function (chunk, encoding, callback) {
        if (filterOutput(chunk)) return originalStdoutWrite.call(this, chunk, encoding, callback);
        if (callback) callback(); return true;
    };
    process.stderr.write = function (chunk, encoding, callback) {
        if (filterOutput(chunk)) return originalStderrWrite.call(this, chunk, encoding, callback);
        if (callback) callback(); return true;
    };
}

process.env.DEBUG = '';
process.env.NODE_ENV = 'production';
process.env.BAILEYS_LOG_LEVEL = 'fatal';
process.env.PINO_LOG_LEVEL = 'fatal';
process.env.BAILEYS_DISABLE_LOG = 'true';
process.env.DISABLE_BAILEYS_LOG = 'true';
process.env.PINO_DISABLE = 'true';

// ============================================================
// IMPORTS
// ============================================================

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import readline from 'readline';
import moment from 'moment-timezone';
import axios from 'axios';

// STANY CORE
import { processMessage, afterCommand, initializeCore, config, updateConfig } from './stanycore/index.js';

// STANY AUTOMATION
import { handleAutoReact } from './stany/automation/autoreactstatus.js';
import { handleAutoView } from './stany/automation/autoviewstatus.js';
import { handleStatusUpdate } from './stany/automation/autostatus.js';

// STANY GROUP
import { initializeAutoJoin } from './stany/group/add.js';
import antidemote from './stany/group/antidemote.js';
import banCommand from './stany/group/ban.js';
import { handleLinkDetection } from './stany/group/antilink.js';
import { checkAntiBadword } from './stany/group/antibadword.js';
import { handleTagDetection } from './stany/group/antitag.js';
import { handleAntiSpam, invalidateGroupCache } from './stany/group/antispam.js';
import { handleStatusMention } from './stany/group/antistatusmention.js';
import { handleMutedMessages, isUserMuted, removeMutedUser } from './stany/group/mute.js';
import { getWelcomeSettings, setWelcomeSettings } from './stany/group/welcome.js';
import { getGoodbyeSettings, setGoodbyeSettings } from './stany/group/goodbye.js';

// STANY MEDIA (Handlers)
import { handleAntiMedia } from './stanymedia/antimedia.js';
import { handleAntiEmail } from './stanymedia/antiemail.js';
import { handleAntiReaction } from './stanymedia/antireaction.js';

// STANY OWNER
import { handleCall } from './stany/owner/anticall.js';
import { storeMessage, handleMessageRevocation } from './stany/owner/antidelete.js';

// SESSION
import SaveCreds from './mdinyane/session.js';

// UTILITIES
import { channelInfo, botImagePath } from './stanytz/messageConfig.js';
import isAdmin from './stanymain/isAdmin.js';
import isOwner from './stanymain/isOwner.js';
import isGroup from './stanymain/isGroup.js';
import { isSudoUser } from './stany/owner/sudo.js';

dotenv.config({ path: './.env' });

let messageLogCounter = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// PLATFORM DETECTION
// ============================================================

const isHeroku = process.env.HEROKU === 'true' || process.env.DYNO !== undefined || process.env.HEROKU_APP_NAME !== undefined;
const isPanel = process.env.PANEL === 'true' || fs.existsSync('/home/container');
const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID !== undefined;
const isReplit = process.env.REPLIT === 'true' || process.env.REPL_ID !== undefined;
const isVercel = process.env.VERCEL === 'true' || process.env.VERCEL_ENV !== undefined;

function detectPlatform() {
    if (isHeroku) return 'Heroku';
    if (isRender) return 'Render';
    if (isReplit) return 'Replit';
    if (isVercel) return 'Vercel';
    if (isPanel) return 'Panel';
    return 'Local/VPS';
}

// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================

const SESSION_DIR = './session';
const BOT_NAME = process.env.BOT_NAME || 'MDINYANE';
const VERSION = '2.0.0';
const DEFAULT_PREFIX = process.env.PREFIX || '.';
const OWNER_FILE = './owner.json';
const PREFIX_CONFIG_FILE = './prefix_config.json';
const BOT_SETTINGS_FILE = './bot_settings.json';
const BOT_MODE_FILE = './bot_mode.json';
const WHITELIST_FILE = './whitelist.json';
const BLOCKED_USERS_FILE = './blocked_users.json';
const WELCOME_DATA_FILE = './data/welcome_data.json';
const AUTO_CONNECT_ON_LINK = true;
const AUTO_CONNECT_ON_START = true;
const RATE_LIMIT_ENABLED = true;
const MIN_COMMAND_DELAY = 1000;
const STICKER_DELAY = 2000;
const AUTO_JOIN_ENABLED = true;
const AUTO_JOIN_DELAY = 5000;
const SEND_WELCOME_MESSAGE = true;
const GROUP_LINK = 'https://chat.whatsapp.com/J19JASXoaK0GVSoRvShr4Y';
const GROUP_INVITE_CODE = GROUP_LINK.split('/').pop();
const GROUP_NAME = 'STANYTZ TEAM';
const AUTO_JOIN_LOG_FILE = './auto_join_log.json';
const BOT_IMAGE_PATH = './stanytz/B803A026-2887-4715-8FE6-05E82D801427.png';

// Platform-specific timeouts
const PLATFORM_CONFIG = {
    Heroku: {
        connectTimeout: 60000,
        keepAliveInterval: 30000,
        retryBaseDelay: 8000,
        maxRetryDelay: 60000,
        connectionRetries: 10
    },
    Panel: {
        connectTimeout: 30000,
        keepAliveInterval: 15000,
        retryBaseDelay: 3000,
        maxRetryDelay: 30000,
        connectionRetries: 15
    },
    default: {
        connectTimeout: 40000,
        keepAliveInterval: 15000,
        retryBaseDelay: 4000,
        maxRetryDelay: 50000,
        connectionRetries: 10
    }
};

const currentPlatform = detectPlatform();
const platformConfig = PLATFORM_CONFIG[currentPlatform] || PLATFORM_CONFIG.default;

// ============================================================
// SILENCE BAILEYS & PROCESS FILTERS
// ============================================================

function silenceBaileysCompletely() {
    try { const pino = require('pino'); pino({ level: 'silent', enabled: false }); } catch {}
}
silenceBaileysCompletely();
console.clear();
setupProcessFilter();

// ============================================================
// LOGGER CLASS
// ============================================================

class UltraCleanLogger {
    static log(...args) {
        const message = args.join(' ').toLowerCase();
        const suppressPatterns = ['buffer','timeout','transaction','failed to decrypt','received error','sessionerror','bad mac','stream errored','baileys','whatsapp','ws','closing session','sessionentry','_chains','registrationid','currentratchet','indexinfo','pendingprekey','ephemeralkeypair','lastremoteephemeralkey','rootkey','basekey','signal','key','ratchet','encryption','decryption','qr','scan','pairing','connection.update','creds.update','messages.upsert','group','participant','metadata','presence.update','chat.update','message.receipt.update','message.update','keystore','keypair','pubkey','privkey','<buffer','05 ','0x','signalkey','signalprotocol','sessionstate','senderkey','groupcipher','signalgroup'];
        for (const pattern of suppressPatterns) { if (message.includes(pattern)) return; }
        const timestamp = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
        const cleanArgs = args.map(arg => typeof arg === 'string' ? arg.replace(/\n\s+/g, ' ') : arg);
        originalConsoleMethods.log(timestamp, ...cleanArgs);
    }
    static error(...args) {
        const message = args.join(' ');
        if (message.toLowerCase().includes('fatal') || message.toLowerCase().includes('critical') || message.includes('❌')) {
            const timestamp = chalk.red(`[${new Date().toLocaleTimeString()}]`);
            originalConsoleMethods.error(timestamp, ...args);
        }
    }
    static success(...args) { originalConsoleMethods.log(chalk.green(`[${new Date().toLocaleTimeString()}]`), chalk.green('✅'), ...args); }
    static info(...args) { originalConsoleMethods.log(chalk.blue(`[${new Date().toLocaleTimeString()}]`), chalk.blue('ℹ️'), ...args); }
    static warning(...args) { originalConsoleMethods.log(chalk.yellow(`[${new Date().toLocaleTimeString()}]`), chalk.yellow('⚠️'), ...args); }
    static event(...args) { originalConsoleMethods.log(chalk.magenta(`[${new Date().toLocaleTimeString()}]`), chalk.magenta('🎭'), ...args); }
    static command(...args) { originalConsoleMethods.log(chalk.cyan(`[${new Date().toLocaleTimeString()}]`), chalk.cyan('💬'), ...args); }
    static critical(...args) { originalConsoleMethods.error(chalk.red(`[${new Date().toLocaleTimeString()}]`), chalk.red('🚨'), ...args); }
    static group(...args) { originalConsoleMethods.log(chalk.magenta(`[${new Date().toLocaleTimeString()}]`), chalk.magenta('👥'), ...args); }
    static member(...args) { originalConsoleMethods.log(chalk.cyan(`[${new Date().toLocaleTimeString()}]`), chalk.cyan('👤'), ...args); }
}

console.log = UltraCleanLogger.log;
console.error = UltraCleanLogger.error;
console.info = UltraCleanLogger.info;
console.warn = UltraCleanLogger.warning;
console.debug = () => {};
console.critical = UltraCleanLogger.critical;
global.logSuccess = UltraCleanLogger.success;
global.logInfo = UltraCleanLogger.info;
global.logWarning = UltraCleanLogger.warning;
global.logEvent = UltraCleanLogger.event;
global.logCommand = UltraCleanLogger.command;
global.logGroup = UltraCleanLogger.group;
global.logMember = UltraCleanLogger.member;

const ultraSilentLogger = {
    level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: () => {},
    error: () => {}, fatal: () => {}, child: () => ultraSilentLogger, log: () => {},
    success: () => {}, warning: () => {}, event: () => {}, command: () => {}
};

// ============================================================
// RATE LIMITER
// ============================================================

class RateLimitProtection {
    constructor() {
        this.commandTimestamps = new Map();
        this.userCooldowns = new Map();
        this.globalCooldown = Date.now();
        this.stickerSendTimes = new Map();
        setInterval(() => this.cleanup(), 60000);
    }
    canSendCommand(chatId, userId, command) {
        if (!RATE_LIMIT_ENABLED) return { allowed: true };
        const now = Date.now();
        const userKey = `${userId}_${command}`;
        const chatKey = `${chatId}_${command}`;
        if (this.userCooldowns.has(userKey)) {
            const timeDiff = now - this.userCooldowns.get(userKey);
            if (timeDiff < MIN_COMMAND_DELAY) return { allowed: false, reason: `Please wait ${Math.ceil((MIN_COMMAND_DELAY - timeDiff) / 1000)}s before using ${command} again.` };
        }
        if (this.commandTimestamps.has(chatKey)) {
            const timeDiff = now - this.commandTimestamps.get(chatKey);
            if (timeDiff < MIN_COMMAND_DELAY) return { allowed: false, reason: `Command cooldown: ${Math.ceil((MIN_COMMAND_DELAY - timeDiff) / 1000)}s remaining.` };
        }
        if (now - this.globalCooldown < 250) return { allowed: false, reason: 'System is busy. Please try again in a moment.' };
        this.userCooldowns.set(userKey, now);
        this.commandTimestamps.set(chatKey, now);
        this.globalCooldown = now;
        return { allowed: true };
    }
    async waitForSticker(chatId) {
        if (!RATE_LIMIT_ENABLED) { await this.delay(STICKER_DELAY); return; }
        const now = Date.now();
        const lastSticker = this.stickerSendTimes.get(chatId) || 0;
        const timeDiff = now - lastSticker;
        if (timeDiff < STICKER_DELAY) await this.delay(STICKER_DELAY - timeDiff);
        this.stickerSendTimes.set(chatId, Date.now());
    }
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    cleanup() {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        for (const [key, timestamp] of this.userCooldowns.entries()) { if (now - timestamp > fiveMinutes) this.userCooldowns.delete(key); }
        for (const [key, timestamp] of this.commandTimestamps.entries()) { if (now - timestamp > fiveMinutes) this.commandTimestamps.delete(key); }
    }
}

const rateLimiter = new RateLimitProtection();

// ============================================================
// PREFIX MANAGEMENT
// ============================================================

let prefixCache = DEFAULT_PREFIX;
let prefixHistory = [];
let isPrefixless = false;

function getCurrentPrefix() { 
    const prefixes = config.prefixes || ['.'];
    return prefixes[0] || '.';
}

function savePrefixToFile(newPrefix) {
    try {
        const isNone = newPrefix === 'none' || newPrefix === '""' || newPrefix === "''" || newPrefix === '';
        fs.writeFileSync(PREFIX_CONFIG_FILE, JSON.stringify({ prefix: isNone ? '' : newPrefix, isPrefixless: isNone, setAt: new Date().toISOString(), timestamp: Date.now(), version: VERSION, previousPrefix: prefixCache, previousIsPrefixless: isPrefixless }, null, 2));
        fs.writeFileSync(BOT_SETTINGS_FILE, JSON.stringify({ prefix: isNone ? '' : newPrefix, isPrefixless: isNone, prefixSetAt: new Date().toISOString(), prefixChangedAt: Date.now(), previousPrefix: prefixCache, previousIsPrefixless: isPrefixless, version: VERSION }, null, 2));
        return true;
    } catch (error) { UltraCleanLogger.error(`Error saving prefix: ${error.message}`); return false; }
}

function loadPrefixFromFiles() {
    try {
        if (fs.existsSync(PREFIX_CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(PREFIX_CONFIG_FILE, 'utf8'));
            if (config.isPrefixless !== undefined) isPrefixless = config.isPrefixless;
            if (config.prefix !== undefined) {
                if (config.prefix.trim() === '' && config.isPrefixless) return '';
                if (config.prefix.trim() !== '') return config.prefix.trim();
            }
        }
        if (fs.existsSync(BOT_SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(BOT_SETTINGS_FILE, 'utf8'));
            if (settings.isPrefixless !== undefined) isPrefixless = settings.isPrefixless;
            if (settings.prefix && settings.prefix.trim() !== '') return settings.prefix.trim();
        }
    } catch (error) { UltraCleanLogger.warning(`Error loading prefix: ${error.message}`); }
    return DEFAULT_PREFIX;
}

function updatePrefixImmediately(newPrefix) {
    const oldPrefix = prefixCache;
    const oldIsPrefixless = isPrefixless;
    const isNone = newPrefix === 'none' || newPrefix === '""' || newPrefix === "''" || newPrefix === '';
    if (isNone) { isPrefixless = true; prefixCache = ''; }
    else {
        if (!newPrefix || newPrefix.trim() === '') return { success: false, error: 'Empty prefix' };
        if (newPrefix.length > 5) return { success: false, error: 'Prefix too long' };
        prefixCache = newPrefix.trim(); isPrefixless = false;
    }
    if (typeof global !== 'undefined') { global.prefix = getCurrentPrefix(); global.CURRENT_PREFIX = getCurrentPrefix(); global.isPrefixless = isPrefixless; }
    process.env.PREFIX = getCurrentPrefix();
    savePrefixToFile(newPrefix);
    prefixHistory.push({ oldPrefix: oldIsPrefixless ? 'none' : oldPrefix, newPrefix: isPrefixless ? 'none' : prefixCache, isPrefixless, oldIsPrefixless, timestamp: new Date().toISOString(), time: Date.now() });
    if (prefixHistory.length > 10) prefixHistory = prefixHistory.slice(-10);
    updateTerminalHeader();
    return { success: true, oldPrefix: oldIsPrefixless ? 'none' : oldPrefix, newPrefix: isPrefixless ? 'none' : prefixCache, isPrefixless, timestamp: new Date().toISOString() };
}

function updateTerminalHeader() {
    const currentPrefix = getCurrentPrefix();
    const prefixDisplay = isPrefixless ? 'none (prefixless)' : `"${currentPrefix}"`;
    console.clear();
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════════╗
║   🀄️ ${chalk.bold(`${BOT_NAME.toUpperCase()} v${VERSION}`)} on ${chalk.yellow(currentPlatform)}
║   💬 Prefix  : ${prefixDisplay}
║   🔧 Auto Fix: ✅ ENABLED
║   🛡️ Rate Limit Protection: ✅ ACTIVE
║   🔗 Auto-Connect on Link: ${AUTO_CONNECT_ON_LINK ? '✅' : '❌'}
║   🔐 Login Methods: Pairing Code | Session ID
╚══════════════════════════════════════════════════════════════════════╝
`));
}

prefixCache = loadPrefixFromFiles();
isPrefixless = prefixCache === '' ? true : false;
updateTerminalHeader();

// ============================================================
// SESSION AUTHENTICATION (UPDATED FOR HEROKU)
// ============================================================

function parseMDINYANESession(sessionString) {
    try {
        let cleaned = sessionString.trim().replace(/^["']|["']$/g, '');
        
        if (cleaned.includes('Stanytz378/iamlegendv2_')) {
            return { format: 'mdinyane', needsDownload: true, sessionId: cleaned };
        }
        
        try { return JSON.parse(cleaned); } catch {}
        try { return JSON.parse(Buffer.from(cleaned, 'base64').toString('utf8')); } catch {}
        
        throw new Error('Invalid session format');
    } catch (error) { UltraCleanLogger.error('❌ Failed to parse session:', error.message); return null; }
}

async function authenticateWithSessionId(sessionId) {
    try {
        let cleanSessionId = sessionId.trim();
        
        // If it's a URL or paste link
        if (cleanSessionId.startsWith('http://') || cleanSessionId.startsWith('https://')) {
            UltraCleanLogger.info('📥 Downloading session from URL...');
            await SaveCreds(cleanSessionId);
            return true;
        }
        
        // Check if it's a Stany format session ID
        if (cleanSessionId.includes('Stanytz378/iamlegendv2_')) {
            UltraCleanLogger.info('📥 Downloading session from paste service...');
            await SaveCreds(cleanSessionId);
            
            const credsPath = path.join(SESSION_DIR, 'creds.json');
            if (fs.existsSync(credsPath)) {
                UltraCleanLogger.success('💾 Session saved successfully to session/creds.json');
                return true;
            } else {
                throw new Error('Session file not created');
            }
        }
        
        // Try parsing as JSON
        try {
            const sessionData = JSON.parse(cleanSessionId);
            if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
            fs.writeFileSync(path.join(SESSION_DIR, 'creds.json'), JSON.stringify(sessionData, null, 2));
            UltraCleanLogger.success('💾 Session saved to session/creds.json');
            return true;
        } catch (e) {
            // Not JSON, try base64
            try {
                const sessionData = JSON.parse(Buffer.from(cleanSessionId, 'base64').toString('utf8'));
                if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
                fs.writeFileSync(path.join(SESSION_DIR, 'creds.json'), JSON.stringify(sessionData, null, 2));
                UltraCleanLogger.success('💾 Base64 session saved to session/creds.json');
                return true;
            } catch (e2) {
                throw new Error('Invalid session format');
            }
        }
    } catch (error) { 
        UltraCleanLogger.error('❌ Session authentication failed:', error.message); 
        throw error; 
    }
}

// ============================================================
// JID MANAGER & OWNER
// ============================================================

let OWNER_NUMBER = null, OWNER_JID = null, OWNER_CLEAN_JID = null, OWNER_CLEAN_NUMBER = null, OWNER_LID = null;
let SOCKET_INSTANCE = null, isConnected = false, store = null;
let heartbeatInterval = null, lastActivityTime = Date.now(), connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = platformConfig.connectionRetries;
let BOT_MODE = 'public', WHITELIST = new Set(), AUTO_LINK_ENABLED = true;
let AUTO_CONNECT_COMMAND_ENABLED = true, AUTO_ULTIMATE_FIX_ENABLED = true;
let isWaitingForPairingCode = false, RESTART_AUTO_FIX_ENABLED = true;
let hasAutoConnectedOnStart = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class JidManager {
    constructor() {
        this.ownerJids = new Set();
        this.ownerLids = new Set();
        this.owner = null;
        this.loadOwnerData();
        this.loadWhitelist();
        UltraCleanLogger.success('JID Manager initialized');
    }
    loadOwnerData() {
        try {
            if (fs.existsSync(OWNER_FILE)) {
                const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
                const ownerJid = data.OWNER_JID;
                if (ownerJid) {
                    const cleaned = this.cleanJid(ownerJid);
                    this.owner = { rawJid: ownerJid, cleanJid: cleaned.cleanJid, cleanNumber: cleaned.cleanNumber, isLid: cleaned.isLid, linkedAt: data.linkedAt || new Date().toISOString() };
                    this.ownerJids.clear(); this.ownerLids.clear();
                    this.ownerJids.add(cleaned.cleanJid); this.ownerJids.add(ownerJid);
                    if (cleaned.isLid) { this.ownerLids.add(ownerJid); this.ownerLids.add(ownerJid.split('@')[0]); OWNER_LID = ownerJid; }
                    OWNER_JID = ownerJid; OWNER_NUMBER = cleaned.cleanNumber; OWNER_CLEAN_JID = cleaned.cleanJid; OWNER_CLEAN_NUMBER = cleaned.cleanNumber;
                }
            }
        } catch {}
    }
    loadWhitelist() {
        try {
            if (fs.existsSync(WHITELIST_FILE)) {
                const data = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8'));
                if (data.whitelist && Array.isArray(data.whitelist)) data.whitelist.forEach(item => WHITELIST.add(item));
            }
        } catch {}
    }
    cleanJid(jid) {
        if (!jid) return { cleanJid: '', cleanNumber: '', raw: jid, isLid: false };
        const isLid = jid.includes('@lid');
        if (isLid) return { raw: jid, cleanJid: jid, cleanNumber: jid.split('@')[0], isLid: true };
        const [numberPart] = jid.split('@')[0].split(':');
        const serverPart = jid.split('@')[1] || 's.whatsapp.net';
        const cleanNumber = numberPart.replace(/[^0-9]/g, '');
        const normalizedNumber = cleanNumber.startsWith('0') ? cleanNumber.substring(1) : cleanNumber;
        return { raw: jid, cleanJid: `${normalizedNumber}@${serverPart}`, cleanNumber: normalizedNumber, isLid: false };
    }
    isOwner(msg) {
        if (!msg || !msg.key) return false;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const cleaned = this.cleanJid(senderJid);
        if (!this.owner || !this.owner.cleanNumber) return false;
        if (this.ownerJids.has(cleaned.cleanJid) || this.ownerJids.has(senderJid)) return true;
        if (cleaned.isLid) {
            const lidNumber = cleaned.cleanNumber;
            if (this.ownerLids.has(senderJid) || this.ownerLids.has(lidNumber)) return true;
            if (OWNER_LID && (senderJid === OWNER_LID || lidNumber === OWNER_LID.split('@')[0])) return true;
        }
        return false;
    }
    setNewOwner(newJid, isAutoLinked = false) {
        try {
            const cleaned = this.cleanJid(newJid);
            this.ownerJids.clear(); this.ownerLids.clear(); WHITELIST.clear();
            this.owner = { rawJid: newJid, cleanJid: cleaned.cleanJid, cleanNumber: cleaned.cleanNumber, isLid: cleaned.isLid, linkedAt: new Date().toISOString(), autoLinked: isAutoLinked };
            this.ownerJids.add(cleaned.cleanJid); this.ownerJids.add(newJid);
            if (cleaned.isLid) { this.ownerLids.add(newJid); this.ownerLids.add(newJid.split('@')[0]); OWNER_LID = newJid; } else { OWNER_LID = null; }
            OWNER_JID = newJid; OWNER_NUMBER = cleaned.cleanNumber; OWNER_CLEAN_JID = cleaned.cleanJid; OWNER_CLEAN_NUMBER = cleaned.cleanNumber;
            fs.writeFileSync(OWNER_FILE, JSON.stringify({ OWNER_JID: newJid, OWNER_NUMBER: cleaned.cleanNumber, OWNER_CLEAN_JID: cleaned.cleanJid, OWNER_CLEAN_NUMBER: cleaned.cleanNumber, ownerLID: cleaned.isLid ? newJid : null, linkedAt: new Date().toISOString(), autoLinked: isAutoLinked, previousOwnerCleared: true, version: VERSION }, null, 2));
            UltraCleanLogger.success(`New owner set: ${cleaned.cleanJid}`);
            return { success: true, owner: this.owner, isLid: cleaned.isLid };
        } catch { return { success: false, error: 'Failed to set new owner' }; }
    }
    getOwnerInfo() {
        return { ownerJid: this.owner?.cleanJid || null, ownerNumber: this.owner?.cleanNumber || null, ownerLid: OWNER_LID || null, jidCount: this.ownerJids.size, lidCount: this.ownerLids.size, whitelistCount: WHITELIST.size, isLid: this.owner?.isLid || false, linkedAt: this.owner?.linkedAt || null };
    }
}

const jidManager = new JidManager();

// ============================================================
// NEW MEMBER DETECTOR
// ============================================================

class NewMemberDetector {
    constructor() {
        this.enabled = true;
        this.detectedMembers = new Map();
        this.groupMembersCache = new Map();
        this.loadDetectionData();
        UltraCleanLogger.success('New Member Detector initialized');
    }
    loadDetectionData() {
        try {
            if (fs.existsSync('./data/member_detection.json')) {
                const data = JSON.parse(fs.readFileSync('./data/member_detection.json', 'utf8'));
                if (data.detectedMembers) for (const [g, m] of Object.entries(data.detectedMembers)) this.detectedMembers.set(g, m);
            }
        } catch (error) { UltraCleanLogger.warning(`Could not load member detection data: ${error.message}`); }
    }
    saveDetectionData() {
        try {
            const data = { detectedMembers: {}, updatedAt: new Date().toISOString(), totalGroups: this.detectedMembers.size };
            for (const [groupId, members] of this.detectedMembers.entries()) data.detectedMembers[groupId] = members;
            if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
            fs.writeFileSync('./data/member_detection.json', JSON.stringify(data, null, 2));
        } catch (error) { UltraCleanLogger.warning(`Could not save member detection data: ${error.message}`); }
    }
    async detectNewMembers(sock, groupUpdate) {
        try {
            if (!this.enabled) return null;
            const { id: groupId, action } = groupUpdate;
            if (action === 'add' || action === 'invite') {
                const rawParticipants = groupUpdate.participants || [];
                const metadata = await sock.groupMetadata(groupId);
                const groupName = metadata.subject || 'Unknown Group';
                let cachedMembers = this.groupMembersCache.get(groupId) || new Set();
                const newMembers = [];

                for (const raw of rawParticipants) {
                    const participant = typeof raw === 'string' ? raw : (raw?.id || raw?.jid || String(raw));
                    if (!participant || !participant.includes('@')) continue;

                    if (!cachedMembers.has(participant)) {
                        try {
                            const userInfo = await sock.onWhatsApp(participant);
                            const userName = userInfo?.[0]?.name || participant.split('@')[0];
                            const userNumber = participant.split('@')[0];
                            newMembers.push({ jid: participant, name: userName, number: userNumber, addedAt: new Date().toISOString(), timestamp: Date.now(), action, addedBy: groupUpdate.actor || 'unknown' });
                            cachedMembers.add(participant);
                            logMember(`➕ ${action.toUpperCase()}: ${userName} (+${userNumber})`);
                            logGroup(`👥 Group: ${groupName}`);
                        } catch (error) { UltraCleanLogger.warning(`Could not get user info for ${participant}: ${error.message}`); }
                    }
                }

                this.groupMembersCache.set(groupId, cachedMembers);
                if (newMembers.length > 0) {
                    const groupEvents = this.detectedMembers.get(groupId) || [];
                    groupEvents.push(...newMembers);
                    this.detectedMembers.set(groupId, groupEvents.slice(-50));
                    if (Math.random() < 0.2) this.saveDetectionData();
                    return newMembers;
                }
            }
            return null;
        } catch (error) { UltraCleanLogger.error(`Member detection error: ${error.message}`); return null; }
    }
    getStats() {
        let totalEvents = 0;
        for (const events of this.detectedMembers.values()) totalEvents += events.length;
        return { enabled: this.enabled, totalGroups: this.detectedMembers.size, totalEvents, cachedGroups: this.groupMembersCache.size };
    }
}

const memberDetector = new NewMemberDetector();

// ============================================================
// AUTO GROUP JOIN SYSTEM
// ============================================================

class AutoGroupJoinSystem {
    constructor() {
        this.invitedUsers = new Set();
        this.loadInvitedUsers();
        UltraCleanLogger.success('Auto-Join System initialized');
    }
    loadInvitedUsers() {
        try {
            if (fs.existsSync(AUTO_JOIN_LOG_FILE)) {
                const data = JSON.parse(fs.readFileSync(AUTO_JOIN_LOG_FILE, 'utf8'));
                data.users.forEach(user => this.invitedUsers.add(user));
            }
        } catch {}
    }
    saveInvitedUser(userJid) {
        try {
            this.invitedUsers.add(userJid);
            let data = { users: [], lastUpdated: new Date().toISOString(), totalInvites: 0 };
            if (fs.existsSync(AUTO_JOIN_LOG_FILE)) data = JSON.parse(fs.readFileSync(AUTO_JOIN_LOG_FILE, 'utf8'));
            if (!data.users.includes(userJid)) { data.users.push(userJid); data.totalInvites = data.users.length; data.lastUpdated = new Date().toISOString(); fs.writeFileSync(AUTO_JOIN_LOG_FILE, JSON.stringify(data, null, 2)); }
        } catch (error) { UltraCleanLogger.error(`❌ Error saving invited user: ${error.message}`); }
    }
    isOwner(userJid, jidManager) {
        if (!jidManager.owner || !jidManager.owner.cleanNumber) return false;
        return userJid === jidManager.owner.cleanJid || userJid === jidManager.owner.rawJid || userJid.includes(jidManager.owner.cleanNumber);
    }
    async sendWelcomeMessage(sock, userJid) {
        if (!SEND_WELCOME_MESSAGE) return;
        try { await sock.sendMessage(userJid, { text: `🎉 *WELCOME TO MDINYANE!*\n\nThank you for connecting! 🤖\nYou're being automatically invited to our community group...\nPlease wait... ⏳` }); } catch (error) { UltraCleanLogger.error(`❌ Could not send welcome message: ${error.message}`); }
    }
    async sendGroupInvitation(sock, userJid, isOwner = false) {
        try {
            await sock.sendMessage(userJid, { text: isOwner ? `👑 *OWNER AUTO-JOIN*\n\nYou are being automatically added to the group...\n🔗 ${GROUP_LINK}` : `🔗 *GROUP INVITATION*\n\nJoin our community: ${GROUP_LINK}\n*Group Name:* ${GROUP_NAME}` });
            return true;
        } catch (error) { UltraCleanLogger.error(`❌ Could not send group invitation: ${error.message}`); return false; }
    }
    async attemptAutoAdd(sock, userJid, isOwner = false) {
        try {
            let groupId;
            try { groupId = await sock.groupAcceptInvite(GROUP_INVITE_CODE); } catch (inviteError) { throw new Error('Could not access group with invite code'); }
            await sock.groupParticipantsUpdate(groupId, [userJid], 'add');
            await sock.sendMessage(userJid, { text: `✅ *SUCCESSFULLY JOINED!*\n\nYou have been added to the group! 🎉` });
            return true;
        } catch (error) {
            UltraCleanLogger.error(`❌ Auto-add failed for ${userJid}: ${error.message}`);
            await sock.sendMessage(userJid, { text: `⚠️ *MANUAL JOIN REQUIRED*\n\nPlease join manually:\n${GROUP_LINK}` });
            return false;
        }
    }
    async autoJoinGroup(sock, userJid) {
        if (!AUTO_JOIN_ENABLED) return false;
        if (this.invitedUsers.has(userJid)) return false;
        const isOwner = this.isOwner(userJid, jidManager);
        await this.sendWelcomeMessage(sock, userJid);
        await new Promise(resolve => setTimeout(resolve, AUTO_JOIN_DELAY));
        await this.sendGroupInvitation(sock, userJid, isOwner);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const success = await this.attemptAutoAdd(sock, userJid, isOwner);
        this.saveInvitedUser(userJid);
        return success;
    }
}

const autoGroupJoinSystem = new AutoGroupJoinSystem();

// ============================================================
// ULTIMATE FIX SYSTEM & AUTO CONNECT
// ============================================================

class UltimateFixSystem {
    constructor() { this.fixedJids = new Set(); this.fixApplied = false; this.restartFixAttempted = false; }
    async applyUltimateFix(sock, senderJid, cleaned, isFirstUser = false, isRestart = false) {
        try {
            const originalIsOwner = jidManager.isOwner;
            jidManager.isOwner = function (message) {
                try {
                    if (message?.key?.fromMe) return true;
                    if (!this.owner || !this.owner.cleanNumber) this.loadOwnerDataFromFile?.();
                    return originalIsOwner.call(this, message);
                } catch { return message?.key?.fromMe || false; }
            };
            jidManager.loadOwnerDataFromFile = function () {
                try {
                    if (fs.existsSync('./owner.json')) {
                        const data = JSON.parse(fs.readFileSync('./owner.json', 'utf8'));
                        let cleanNumber = data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER;
                        if (cleanNumber && cleanNumber.includes(':')) cleanNumber = cleanNumber.split(':')[0];
                        this.owner = { cleanNumber, cleanJid: data.OWNER_CLEAN_JID || data.OWNER_JID, rawJid: data.OWNER_JID, isLid: (data.OWNER_CLEAN_JID || data.OWNER_JID)?.includes('@lid') || false };
                        return true;
                    }
                } catch {}
                return false;
            };
            global.OWNER_NUMBER = cleaned.cleanNumber; global.OWNER_CLEAN_NUMBER = cleaned.cleanNumber;
            global.OWNER_JID = cleaned.cleanJid; global.OWNER_CLEAN_JID = cleaned.cleanJid;
            this.fixedJids.add(senderJid); this.fixApplied = true;
            UltraCleanLogger.success(`✅ Ultimate Fix applied: ${cleaned.cleanJid}`);
            return { success: true, jid: cleaned.cleanJid, number: cleaned.cleanNumber, isLid: cleaned.isLid, isRestart };
        } catch (error) { UltraCleanLogger.error(`Ultimate Fix failed: ${error.message}`); return { success: false, error: 'Fix failed' }; }
    }
    isFixNeeded(jid) { return !this.fixedJids.has(jid); }
    shouldRunRestartFix(ownerJid) { return fs.existsSync(OWNER_FILE) && this.isFixNeeded(ownerJid) && !this.restartFixAttempted && RESTART_AUTO_FIX_ENABLED; }
    markRestartFixAttempted() { this.restartFixAttempted = true; }
}

const ultimateFixSystem = new UltimateFixSystem();

class AutoConnectOnStart {
    constructor() { this.hasRun = false; this.isEnabled = AUTO_CONNECT_ON_START; }
    async trigger(sock) {
        try {
            if (!this.isEnabled || this.hasRun) return;
            if (!sock || !sock.user?.id) return;
            const ownerJid = sock.user.id;
            const cleaned = jidManager.cleanJid(ownerJid);
            const mockMsg = { key: { remoteJid: ownerJid, fromMe: true, id: 'auto-start-' + Date.now(), participant: ownerJid }, message: { conversation: '.connect' } };
            await delay(2000);
            await handleConnectCommand(sock, mockMsg, [], cleaned);
            this.hasRun = true; hasAutoConnectedOnStart = true;
        } catch (error) { UltraCleanLogger.error(`Auto-connect on start failed: ${error.message}`); }
    }
    reset() { this.hasRun = false; hasAutoConnectedOnStart = false; }
}

const autoConnectOnStart = new AutoConnectOnStart();

// ============================================================
// AUTO LINK SYSTEM
// ============================================================

class AutoLinkSystem {
    constructor() { this.linkAttempts = new Map(); this.MAX_ATTEMPTS = 3; this.autoConnectEnabled = AUTO_CONNECT_ON_LINK; }
    async shouldAutoLink(sock, msg) {
        if (!AUTO_LINK_ENABLED) return false;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const cleaned = jidManager.cleanJid(senderJid);
        if (!jidManager.owner || !jidManager.owner.cleanNumber) {
            UltraCleanLogger.info(`🔗 New owner detected: ${cleaned.cleanJid}`);
            const result = await this.autoLinkNewOwner(sock, senderJid, cleaned, true);
            if (result && this.autoConnectEnabled) setTimeout(async () => { await this.triggerAutoConnect(sock, msg, cleaned, true); }, 1500);
            return result;
        }
        if (msg.key.fromMe) return false;
        if (jidManager.isOwner(msg)) return false;
        const currentOwnerNumber = jidManager.owner.cleanNumber;
        if (this.isSimilarNumber(cleaned.cleanNumber, currentOwnerNumber)) {
            if (!jidManager.ownerJids.has(cleaned.cleanJid)) {
                jidManager.ownerJids.add(cleaned.cleanJid); jidManager.ownerJids.add(senderJid);
                if (AUTO_ULTIMATE_FIX_ENABLED && ultimateFixSystem.isFixNeeded(senderJid)) setTimeout(async () => { await ultimateFixSystem.applyUltimateFix(sock, senderJid, cleaned, false); }, 800);
                await this.sendDeviceLinkedMessage(sock, senderJid, cleaned);
                if (this.autoConnectEnabled) setTimeout(async () => { await this.triggerAutoConnect(sock, msg, cleaned, false); }, 1500);
                return true;
            }
        }
        return false;
    }
    isSimilarNumber(num1, num2) {
        if (!num1 || !num2) return false;
        if (num1 === num2) return true;
        if (num1.includes(num2) || num2.includes(num1)) return true;
        if (num1.length >= 6 && num2.length >= 6) return num1.slice(-6) === num2.slice(-6);
        return false;
    }
    async autoLinkNewOwner(sock, senderJid, cleaned, isFirstUser = false) {
        try {
            const result = jidManager.setNewOwner(senderJid, true);
            if (!result.success) return false;
            await this.sendImmediateSuccessMessage(sock, senderJid, cleaned, isFirstUser);
            if (AUTO_ULTIMATE_FIX_ENABLED) setTimeout(async () => { await ultimateFixSystem.applyUltimateFix(sock, senderJid, cleaned, isFirstUser); }, 1200);
            if (AUTO_JOIN_ENABLED) setTimeout(async () => { try { await autoGroupJoinSystem.autoJoinGroup(sock, senderJid); } catch (error) { UltraCleanLogger.error(`❌ Auto-join for new owner failed: ${error.message}`); } }, 3000);
            return true;
        } catch { return false; }
    }
    async triggerAutoConnect(sock, msg, cleaned, isNewOwner = false) {
        try { if (!this.autoConnectEnabled) return; await handleConnectCommand(sock, msg, [], cleaned); } catch (error) { UltraCleanLogger.error(`Auto-connect failed: ${error.message}`); }
    }
    async sendImmediateSuccessMessage(sock, senderJid, cleaned, isFirstUser = false) {
        try {
            const currentPrefix = getCurrentPrefix();
            const prefixDisplay = isPrefixless ? 'none (prefixless)' : `"${currentPrefix}"`;
            await sock.sendMessage(senderJid, { text: `✅ *${BOT_NAME.toUpperCase()} v${VERSION} CONNECTED!*\n\n${isFirstUser ? '🎉 *FIRST TIME SETUP COMPLETE!*\n\n' : '🔄 *NEW OWNER LINKED!*\n\n'}📋 *YOUR INFORMATION:*\n├─ Your Number: +${cleaned.cleanNumber}\n├─ Device Type: ${cleaned.isLid ? 'Linked Device 🔗' : 'Regular Device 📱'}\n├─ Prefix: ${prefixDisplay}\n└─ Status: ✅ LINKED SUCCESSFULLY\n\n🎉 *You're all set!*` });
        } catch {}
    }
    async sendDeviceLinkedMessage(sock, senderJid, cleaned) {
        try { await sock.sendMessage(senderJid, { text: `📱 *Device Linked Successfully!*\n\n✅ You can now use owner commands from this device.\n🎉 All systems are now active!` }); } catch {}
    }
}

const autoLinkSystem = new AutoLinkSystem();

async function handleConnectCommand(sock, msg, args, cleaned) {
    try {
        const chatJid = msg.key.remoteJid || cleaned.cleanJid;
        const start = Date.now();
        const currentPrefix = getCurrentPrefix();
        const prefixDisplay = isPrefixless ? 'none (prefixless)' : `"${currentPrefix}"`;
        const platform = detectPlatform();
        const loadingMessage = await sock.sendMessage(chatJid, { text: `🀄️ *${BOT_NAME}* is checking connection... █▒▒▒▒▒▒▒▒▒` }, { quoted: msg });
        const latency = Date.now() - start;
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
        const isOwnerUser = jidManager.isOwner(msg);
        const memberStats = memberDetector ? memberDetector.getStats() : null;
        let statusEmoji, statusText, mood;
        if (latency <= 100) { statusEmoji = '🟢'; statusText = 'Excellent'; mood = '⚡Superb Connection'; }
        else if (latency <= 300) { statusEmoji = '🟡'; statusText = 'Good'; mood = '📡Stable Link'; }
        else { statusEmoji = '🔴'; statusText = 'Slow'; mood = '🌑Needs Optimization'; }
        await delay(Math.max(500, 1000 - (Date.now() - start)));
        await sock.sendMessage(chatJid, { text: `\n╭━━🌕 *CONNECTION STATUS* 🌕━━╮\n┃  ⚡ *User:* ${cleaned.cleanNumber}\n┃  🔴 *Prefix:* ${prefixDisplay}\n┃  🐾 *Ultimatefix:* ${isOwnerUser ? '✅' : '❌'}\n┃  🏗️ *Platform:* ${platform}\n┃  ⏱️ *Latency:* ${latency}ms ${statusEmoji}\n┃  ⏰ *Uptime:* ${h}h ${m}m ${s}s\n┃  👥 *Members:* ${memberStats ? memberStats.totalEvents + ' events' : 'Not loaded'}\n┃  🔗 *Status:* ${statusText}\n┃  🎯 *Mood:* ${mood}\n┃  👑 *Owner:* ${isOwnerUser ? '✅ Yes' : '❌ No'}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n_🀄️ The Moon Watches — ..._\n`, edit: loadingMessage.key }, { quoted: msg });
        UltraCleanLogger.command(`Connect from ${cleaned.cleanNumber}`);
        return true;
    } catch { return false; }
}

// ============================================================
// STATUS DETECTOR
// ============================================================

class StatusDetector {
    constructor() {
        this.detectionEnabled = true; this.statusLogs = []; this.lastDetection = null;
        this.setupDataDir(); this.loadStatusLogs();
        UltraCleanLogger.success('Status Detector initialized');
    }
    setupDataDir() { try { if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true }); } catch (error) { UltraCleanLogger.error(`Error setting up data directory: ${error.message}`); } }
    loadStatusLogs() {
        try {
            if (fs.existsSync('./data/status_detection_logs.json')) {
                const data = JSON.parse(fs.readFileSync('./data/status_detection_logs.json', 'utf8'));
                if (Array.isArray(data.logs)) this.statusLogs = data.logs.slice(-100);
            }
        } catch {}
    }
    saveStatusLogs() {
        try { fs.writeFileSync('./data/status_detection_logs.json', JSON.stringify({ logs: this.statusLogs.slice(-1000), updatedAt: new Date().toISOString(), count: this.statusLogs.length }, null, 2)); } catch {}
    }
    async detectStatusUpdate(msg) {
        try {
            if (!this.detectionEnabled) return null;
            const sender = msg.key.participant || 'unknown';
            const shortSender = sender.split('@')[0];
            const timestamp = msg.messageTimestamp || Date.now();
            const statusTime = new Date(timestamp * 1000).toLocaleTimeString();
            const statusInfo = this.extractStatusInfo(msg);
            UltraCleanLogger.info(`👁️ Status from ${shortSender} at ${statusTime} [${statusInfo.type}]`);
            const logEntry = { sender: shortSender, fullSender: sender, type: statusInfo.type, caption: statusInfo.caption, fileInfo: statusInfo.fileInfo, postedAt: statusTime, detectedAt: new Date().toLocaleTimeString(), timestamp: Date.now() };
            this.statusLogs.push(logEntry); this.lastDetection = logEntry;
            if (this.statusLogs.length % 5 === 0) this.saveStatusLogs();
            return logEntry;
        } catch { return null; }
    }
    extractStatusInfo(msg) {
        try {
            const message = msg.message;
            let type = 'unknown', caption = '', fileInfo = '';
            if (message.imageMessage) { type = 'image'; caption = message.imageMessage.caption || ''; }
            else if (message.videoMessage) { type = 'video'; caption = message.videoMessage.caption || ''; }
            else if (message.audioMessage) { type = 'audio'; }
            else if (message.extendedTextMessage) { type = 'text'; caption = message.extendedTextMessage.text || ''; }
            else if (message.conversation) { type = 'text'; caption = message.conversation; }
            else if (message.stickerMessage) { type = 'sticker'; }
            return { type, caption: caption.substring(0, 100), fileInfo };
        } catch { return { type: 'unknown', caption: '', fileInfo: '' }; }
    }
    getStats() {
        return { totalDetected: this.statusLogs.length, lastDetection: this.lastDetection ? `${this.lastDetection.sender} - ${this.getTimeAgo(this.lastDetection.timestamp)}` : 'None', detectionEnabled: this.detectionEnabled };
    }
    getTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`;
    }
}

let statusDetector = null;

function isUserBlocked(jid) {
    try { if (fs.existsSync(BLOCKED_USERS_FILE)) { const data = JSON.parse(fs.readFileSync(BLOCKED_USERS_FILE, 'utf8')); return data.users && data.users.includes(jid); } } catch {}
    return false;
}

function checkBotMode(msg, commandName) {
    try {
        if (jidManager.isOwner(msg)) return true;
        if (fs.existsSync(BOT_MODE_FILE)) { const modeData = JSON.parse(fs.readFileSync(BOT_MODE_FILE, 'utf8')); BOT_MODE = modeData.mode || 'public'; } else { BOT_MODE = 'public'; }
        const chatJid = msg.key.remoteJid;
        switch (BOT_MODE) {
            case 'public': return true; case 'private': return false; case 'silent': return false;
            case 'group-only': return chatJid.includes('@g.us');
            case 'maintenance': return ['ping', 'status', 'uptime', 'help'].includes(commandName);
            default: return true;
        }
    } catch { return true; }
}

function startHeartbeat(sock) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => { if (isConnected && sock) { try { await sock.sendPresenceUpdate('available'); lastActivityTime = Date.now(); } catch {} } }, 60 * 1000);
}

function stopHeartbeat() { if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; } }

function ensureSessionDir() { if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true }); }

function cleanSession() { try { if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true }); return true; } catch { return false; } }

class MessageStore {
    constructor() { this.messages = new Map(); this.maxMessages = 100; }
    addMessage(jid, messageId, message) {
        try {
            const key = `${jid}|${messageId}`;
            this.messages.set(key, { ...message, timestamp: Date.now() });
            if (this.messages.size > this.maxMessages) this.messages.delete(this.messages.keys().next().value);
        } catch {}
    }
    getMessage(jid, messageId) { try { return this.messages.get(`${jid}|${messageId}`) || null; } catch { return null; } }
}

// ============================================================
// COMMANDS LOADER
// ============================================================

const commands = new Map();
const commandCategories = new Map();

async function loadCommandsFromFolder(folderPath, category = 'general') {
    const absolutePath = path.resolve(folderPath);
    if (!fs.existsSync(absolutePath)) return;
    try {
        const items = fs.readdirSync(absolutePath);
        let categoryCount = 0;
        for (const item of items) {
            const fullPath = path.join(absolutePath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) { await loadCommandsFromFolder(fullPath, item); }
            else if (item.endsWith('.js')) {
                try {
                    if (item.includes('.test.') || item.includes('.disabled.')) continue;
                    const commandModule = await import(`file://${fullPath}`);
                    const command = commandModule.default || commandModule;
                    if (command && command.name) {
                        command.category = category;
                        commands.set(command.name.toLowerCase(), command);
                        if (!commandCategories.has(category)) commandCategories.set(category, []);
                        commandCategories.get(category).push(command.name);
                        categoryCount++;
                        if (Array.isArray(command.alias)) command.alias.forEach(alias => commands.set(alias.toLowerCase(), command));
                    }
                } catch {}
            }
        }
        if (categoryCount > 0) UltraCleanLogger.info(`${categoryCount} commands loaded from ${category}`);
    } catch {}
}

// ============================================================
// WELCOME & GOODBYE MESSAGES
// ============================================================

async function sendWelcomeMessage(sock, groupId, participants) {
    try {
        const settings = await getWelcomeSettings(groupId);
        if (!settings.enabled) return;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            const participantName = participantId.split('@')[0];
            
            let message = settings.message || '🎉 Welcome {name} to the group!';
            message = message.replace(/{name}/g, participantName);
            message = message.replace(/{time}/g, time);
            message = message.replace(/{date}/g, date);
            
            const welcomeMsg = `╭──❍「 *👋 WELCOME* 」❍
├ 👤 *${message}*
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"Enjoy your stay!"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sock.sendMessage(groupId, {
                text: welcomeMsg,
                mentions: [participantId],
                contextInfo: channelInfo.contextInfo
            });
        }
    } catch (error) {
        UltraCleanLogger.error(`Welcome message error: ${error.message}`);
    }
}

async function sendGoodbyeMessage(sock, groupId, participants) {
    try {
        const settings = await getGoodbyeSettings(groupId);
        if (!settings.enabled) return;
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const time = now.format('HH:mm:ss');
        const date = now.format('DD/MM/YYYY');
        
        for (const participant of participants) {
            const participantId = typeof participant === 'string' ? participant : participant.id;
            const participantName = participantId.split('@')[0];
            
            let message = settings.message || '👋 Goodbye {name}! We\'ll miss you!';
            message = message.replace(/{name}/g, participantName);
            message = message.replace(/{time}/g, time);
            message = message.replace(/{date}/g, date);
            
            const goodbyeMsg = `╭──❍「 *👋 GOODBYE* 」❍
├ 👤 *${message}*
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time} EAT
╰──────❍

✨ *"Take care!"* ✨

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sock.sendMessage(groupId, {
                text: goodbyeMsg,
                mentions: [participantId],
                contextInfo: channelInfo.contextInfo
            });
        }
    } catch (error) {
        UltraCleanLogger.error(`Goodbye message error: ${error.message}`);
    }
}

// ============================================================
// BOT CONNECTION
// ============================================================

async function startBot(loginMode = 'pair', loginData = null) {
    try {
        UltraCleanLogger.info(`🚀 Initializing WhatsApp connection on ${currentPlatform}...`);
        
        if (loginMode === 'session' && loginData) {
            try { 
                await authenticateWithSessionId(loginData); 
                UltraCleanLogger.success('✅ Session loaded successfully!');
            } catch (error) { 
                UltraCleanLogger.error(`Session loading failed: ${error.message}`);
                if (isHeroku) {
                    UltraCleanLogger.error('❌ Heroku: Invalid SESSION_ID. Please check your Config Vars.');
                    process.exit(1);
                }
                const lm = new LoginManager(); 
                const nm = await lm.pairingCodeMode(); 
                lm.close(); 
                loginMode = nm.mode; 
                loginData = nm.phone; 
            }
        }
        
        commands.clear(); 
        commandCategories.clear();
        const commandLoadPromise = loadCommandsFromFolder('./stany');
        store = new MessageStore();
        ensureSessionDir();
        statusDetector = new StatusDetector();
        autoConnectOnStart.reset();
        
        const { default: makeWASocket } = await import('@whiskeysockets/baileys');
        const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = await import('@whiskeysockets/baileys');
        
        let state, saveCreds;
        try { 
            const authState = await useMultiFileAuthState(SESSION_DIR); 
            state = authState.state; 
            saveCreds = authState.saveCreds; 
        } catch { 
            cleanSession(); 
            const freshAuth = await useMultiFileAuthState(SESSION_DIR); 
            state = freshAuth.state; 
            saveCreds = freshAuth.saveCreds; 
        }
        
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({ 
            version, 
            logger: ultraSilentLogger, 
            browser: Browsers.ubuntu('Chrome'), 
            printQRInTerminal: false, 
            auth: { 
                creds: state.creds, 
                keys: makeCacheableSignalKeyStore(state.keys, ultraSilentLogger) 
            }, 
            markOnlineOnConnect: true, 
            generateHighQualityLinkPreview: true, 
            connectTimeoutMs: platformConfig.connectTimeout, 
            keepAliveIntervalMs: platformConfig.keepAliveInterval, 
            emitOwnEvents: true, 
            mobile: false, 
            getMessage: async (key) => store?.getMessage(key.remoteJid, key.id) || null, 
            defaultQueryTimeoutMs: 20000 
        });
        
        SOCKET_INSTANCE = sock; 
        connectionAttempts = 0; 
        isWaitingForPairingCode = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                isConnected = true; 
                startHeartbeat(sock);
                await handleSuccessfulConnection(sock, loginMode, loginData);
                isWaitingForPairingCode = false;
                triggerRestartAutoFix(sock).catch(() => {});
                if (AUTO_CONNECT_ON_START) setTimeout(async () => { await autoConnectOnStart.trigger(sock); }, 2000);
                if (AUTO_JOIN_ENABLED && sock.user?.id) {
                    setTimeout(async () => {
                        try {
                            let ownerJid = sock.user.id;
                            if (fs.existsSync(OWNER_FILE)) { try { const od = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8')); if (od.OWNER_JID) ownerJid = od.OWNER_JID; } catch {} }
                            if (autoGroupJoinSystem.invitedUsers.has(ownerJid)) return;
                            const success = await autoGroupJoinSystem.autoJoinGroup(sock, ownerJid);
                            if (success) { try { const od = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8')); od.lastAutoJoin = new Date().toISOString(); od.autoJoinedGroup = true; fs.writeFileSync(OWNER_FILE, JSON.stringify(od, null, 2)); } catch {} }
                        } catch (error) { UltraCleanLogger.error(`❌ Auto-join system error: ${error.message}`); }
                    }, 15000);
                }
                
                await initializeCore(sock);
            }
            if (connection === 'close') {
                isConnected = false; 
                stopHeartbeat();
                if (statusDetector) statusDetector.saveStatusLogs();
                if (memberDetector) memberDetector.saveDetectionData();
                await handleConnectionCloseSilently(lastDisconnect, loginMode, loginData);
                isWaitingForPairingCode = false;
            }
            if (connection === 'connecting') {
                UltraCleanLogger.info('🔄 Establishing connection...');
                if (loginMode === 'pair' && loginData && !state.creds.registered && !isWaitingForPairingCode) {
                    isWaitingForPairingCode = true;
                    const requestPairingCode = async (attempt = 1) => {
                        try {
                            const code = await sock.requestPairingCode(loginData);
                            const cleanCode = code.replace(/\s+/g, '');
                            const formattedCode = cleanCode.length === 8 ? `${cleanCode.substring(0, 4)}-${cleanCode.substring(4, 8)}` : cleanCode;
                            console.clear();
                            console.log(chalk.greenBright(`\n╔══════════════════════════════════════════╗\n║         🔗 PAIRING CODE - ${BOT_NAME}        \n╠══════════════════════════════════════════╣\n║ 📞 Phone  : ${chalk.cyan(loginData)}\n║ 🔑 Code   : ${chalk.yellow.bold(formattedCode)}\n║ ⏰ Expires : 10 minutes\n╚══════════════════════════════════════════╝\n`));
                            console.log(chalk.cyan('📱 INSTRUCTIONS:'));
                            console.log(chalk.white('1. Open WhatsApp → Settings → Linked Devices'));
                            console.log(chalk.white('2. Tap "Link a Device"'));
                            console.log(chalk.yellow.bold(`3. Enter code: ${formattedCode}\n`));
                            let remaining = 600;
                            const timer = setInterval(() => {
                                if (remaining <= 0 || isConnected) { clearInterval(timer); return; }
                                const m = Math.floor(remaining / 60), s = remaining % 60;
                                process.stdout.write(`\r⏰ Code expires in: ${m}:${s.toString().padStart(2, '0')} `);
                                remaining--;
                            }, 1000);
                            setTimeout(() => clearInterval(timer), 610000);
                        } catch (error) {
                            if (attempt < 3) { UltraCleanLogger.warning(`Pairing code attempt ${attempt} failed, retrying...`); await delay(3000); await requestPairingCode(attempt + 1); }
                            else { console.log(chalk.red('\n❌ Max retries reached. Restarting...')); setTimeout(async () => { await startBot(loginMode, loginData); }, 8000); }
                        }
                    };
                    setTimeout(() => requestPairingCode(1), 2000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('group-participants.update', async (update) => {
            try {
                if (memberDetector && memberDetector.enabled) {
                    const newMembers = await memberDetector.detectNewMembers(sock, update);
                    if (newMembers && newMembers.length > 0) UltraCleanLogger.info(`👥 Detected ${newMembers.length} new members`);
                }
                
                const { id, action, participants } = update;
                if (action === 'add') {
                    await sendWelcomeMessage(sock, id, participants);
                } else if (action === 'remove') {
                    await sendGoodbyeMessage(sock, id, participants);
                }
                
                invalidateGroupCache(id);
            } catch (error) { UltraCleanLogger.warning(`Group update error: ${error.message}`); }
        });
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message) return;
            lastActivityTime = Date.now();
            
            if (msg.key?.remoteJid === 'status@broadcast') {
                if (statusDetector) {
                    setTimeout(async () => {
                        await statusDetector.detectStatusUpdate(msg);
                        await handleAutoView(sock, msg.key);
                        await handleAutoReact(sock, msg.key);
                        await handleStatusUpdate(sock, msg);
                    }, 800);
                }
                return;
            }
            
            if (store) store.addMessage(msg.key.remoteJid, msg.key.id, msg);
            
            await storeMessage(sock, msg);
            
            const chatId = msg.key.remoteJid;
            const senderJid = msg.key.participant || chatId;
            const textMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            try {
                const bannedData = JSON.parse(fs.readFileSync('./stanydata/banned_users.json', 'utf8'));
                if (bannedData.users?.some(u => u.id === senderJid.split('@')[0])) return;
            } catch {}
            
            const isMuted = await handleMutedMessages(sock, chatId, senderJid, msg);
            if (isMuted) return;
            
            await processMessage(sock, msg);
            await handleLinkDetection(sock, chatId, msg, textMsg, senderJid);
            await checkAntiBadword(sock, msg, { chatId, senderId: senderJid });
            await handleTagDetection(sock, chatId, msg, senderJid);
            await handleAntiMedia(sock, chatId, msg, senderJid);
            await handleAntiEmail(sock, chatId, msg, textMsg, senderJid);
            const ownerCheck = await isOwner(senderJid);
            await handleAntiSpam(sock, chatId, msg, senderJid, ownerCheck.isOwner);
            
            if (chatId.endsWith('@g.us')) {
                await handleStatusMention(sock, msg, chatId, true, senderJid);
            }
            
            await handleIncomingMessage(sock, msg);
        });
        
        sock.ev.on('reactions.update', async (reactions) => {
            for (const reaction of reactions) {
                await handleAntiReaction(sock, reaction);
            }
        });
        
        sock.ev.on('call', async (calls) => {
            await handleCall(sock, calls);
        });
        
        sock.ev.on('message-revoke.evict', async (revocationMessage) => {
            await handleMessageRevocation(sock, revocationMessage);
        });
        
        await commandLoadPromise;
        UltraCleanLogger.success(`✅ Loaded ${commands.size} commands`);
        return sock;
    } catch (error) { 
        UltraCleanLogger.error('❌ Connection failed, retrying...'); 
        setTimeout(async () => { await startBot(loginMode, loginData); }, 8000); 
    }
}

async function triggerRestartAutoFix(sock) {
    try {
        if (fs.existsSync(OWNER_FILE) && sock.user?.id) {
            const ownerJid = sock.user.id;
            const cleaned = jidManager.cleanJid(ownerJid);
            if (ultimateFixSystem.shouldRunRestartFix(ownerJid)) {
                ultimateFixSystem.markRestartFixAttempted();
                await delay(1500);
                await ultimateFixSystem.applyUltimateFix(sock, ownerJid, cleaned, false, true);
            }
        }
    } catch (error) { UltraCleanLogger.warning(`⚠️ Restart auto-fix error: ${error.message}`); }
}

async function handleSuccessfulConnection(sock, loginMode, loginData) {
    OWNER_JID = sock.user.id; 
    OWNER_NUMBER = OWNER_JID.split('@')[0];
    const isFirstConnection = !fs.existsSync(OWNER_FILE);
    if (isFirstConnection) jidManager.setNewOwner(OWNER_JID, false); 
    else jidManager.loadOwnerData();
    const ownerInfo = jidManager.getOwnerInfo();
    const currentPrefix = getCurrentPrefix();
    const prefixDisplay = isPrefixless ? 'none (prefixless)' : `"${currentPrefix}"`;
    updateTerminalHeader();
    console.log(chalk.greenBright(`\n╔══════════════════════════════════════╗\n║    🀄️ MDINYANE ONLINE v${VERSION}           ║\n╠══════════════════════════════════════╣\n║  ✅ Connected on ${currentPlatform}!\n║  👑 Owner  : +${ownerInfo.ownerNumber}\n║  💬 Prefix : ${prefixDisplay}\n╚══════════════════════════════════════╝\n`));
    const cleaned = jidManager.cleanJid(OWNER_JID);
    if (ultimateFixSystem.isFixNeeded(OWNER_JID)) {
        setTimeout(async () => { await ultimateFixSystem.applyUltimateFix(sock, OWNER_JID, cleaned, isFirstConnection); }, 1200);
    }
    setTimeout(async () => {
        try {
            const rawId = sock.user.id;
            const sendJid = rawId.includes(':')
                ? rawId.split(':')[0] + '@s.whatsapp.net'
                : rawId;

            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const successMessage = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃🌟 WELCOME TO MDINYANE 🌟  
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━❲ 🔐 DEVICE STATUS ❳━━⬣
┃
┃  ✅ *Linked Successfully*
┃  🤖 *Bot:* ${BOT_NAME} v${VERSION}
┃  🖥️ *Platform:* ${currentPlatform}
┃  📱 *Your Number:* +${ownerInfo.ownerNumber}
┃  ⏰ *Time:* ${time} | 📅 ${date}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 📋 BOT INFO ❳━━⬣
┃
┃  📝 *Commands:* ${commands.size}+ plugins
┃  ⚡ *Prefix:* \`${prefixDisplay}\` (menu: \`${prefixDisplay}menu\`)
┃  👑 *Owner:* STANY TZ
┃  🚀 *Status:* ONLINE 24/7
┃
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 🎯 QUICK START ❳━━⬣
┃
┃  ✨ \`${prefixDisplay}menu\` - Show all commands
┃  📢 \`${prefixDisplay}owner\` - Contact owner
┃  📸 \`${prefixDisplay}sticker\` - Convert to sticker
┃
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 🔔 IMPORTANT ❳━━⬣
┃
┃  📢 *Channel:* https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p
┃ 
┃  ⚠️ *Note:* Bot may take few seconds to respond
┃  💡 Type \`${prefixDisplay}help\` for detailed guide
┃
╰━━━━━━━━━━━━━━━━━━━━━⬣

┏━━━━━━━━━━━━━━━━━━━━━
┃🎉 THANK YOU FOR CHOOSING US 🎉   ┃
┗━━━━━━━━━━━━━━━━━━━━━

> *MDINYANE - WhatsApp Bot | ᴾᵒʷᵉʳᵉᵈ ᵇʸ ˢᵀᴬᴺʸ ᵀᶻ*
            `.trim();

            const imageExists = fs.existsSync(BOT_IMAGE_PATH);
            const forwardContext = {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363404317544295@newsletter',
                    newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
                    serverMessageId: Date.now().toString()
                }
            };
            
            if (imageExists) {
                await sock.sendMessage(sendJid, {
                    image: fs.readFileSync(BOT_IMAGE_PATH),
                    caption: successMessage,
                    contextInfo: forwardContext
                });
                UltraCleanLogger.success('✅ Connection message sent with image!');
            } else {
                await sock.sendMessage(sendJid, {
                    text: successMessage,
                    contextInfo: forwardContext
                });
                UltraCleanLogger.success('✅ Connection message sent!');
            }
        } catch (e) {
            UltraCleanLogger.error('❌ Failed to send success message:', e.message);
        }
    }, 5000);
}

async function handleConnectionCloseSilently(lastDisconnect, loginMode, phoneNumber) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    connectionAttempts++;
    
    let delayTime = Math.min(platformConfig.retryBaseDelay * Math.pow(2, connectionAttempts - 1), platformConfig.maxRetryDelay);
    
    if (isHeroku && (statusCode === 401 || statusCode === 403 || statusCode === 419)) {
        UltraCleanLogger.warning('🔄 Authentication error on Heroku - clearing session...');
        cleanSession();
    }
    
    if (statusCode === 409) { 
        setTimeout(async () => { await startBot(loginMode, phoneNumber); }, isHeroku ? 30000 : 25000); 
        return; 
    }
    
    if (statusCode === 401 || statusCode === 403 || statusCode === 419) {
        cleanSession();
    }
    
    UltraCleanLogger.warning(`🔄 Reconnecting in ${Math.round(delayTime/1000)}s... (Attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})`);
    
    setTimeout(async () => { 
        if (connectionAttempts >= MAX_RETRY_ATTEMPTS) { 
            connectionAttempts = 0;
            if (isHeroku) {
                UltraCleanLogger.critical('❌ Max retries reached on Heroku - exiting...');
                process.exit(1);
            } else {
                connectionAttempts = 0;
                await startBot(loginMode, phoneNumber);
            }
        } else { 
            await startBot(loginMode, phoneNumber); 
        } 
    }, delayTime);
}

async function resolveJidForLog(sock, inputJid, groupChatJid = null) {
    if (!inputJid) return inputJid;
    if (inputJid.endsWith('@g.us') || inputJid.endsWith('@newsletter')) return inputJid;
    if (inputJid.endsWith('@lid')) {
        if (groupChatJid && groupChatJid.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(groupChatJid);
                const p = meta?.participants?.find(x => x.id === inputJid);
                if (p?.phoneNumber) {
                    const num = String(p.phoneNumber).split('@')[0].split(':')[0].replace(/\D/g, '');
                    if (num.length >= 7) return `${num}@s.whatsapp.net`;
                }
            } catch {}
        }
        try {
            if (sock.signalRepository?.lidMapping?.getPNForLID) {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(inputJid);
                if (pn) {
                    const num = String(pn).split('@')[0].split(':')[0].replace(/\D/g, '');
                    if (num.length >= 7) return `${num}@s.whatsapp.net`;
                }
            }
        } catch {}
        const lidNum = inputJid.split('@')[0];
        const cached = globalThis.lidPhoneCache?.get(lidNum);
        if (cached) return `${cached}@s.whatsapp.net`;
        try {
            if (sock.store?.contacts) {
                for (const [contactJid, contact] of Object.entries(sock.store.contacts)) {
                    if (contact.lid === inputJid || contact.lidJid === inputJid) {
                        const num = contactJid.split('@')[0].replace(/\D/g, '');
                        if (num.length >= 7) return `${num}@s.whatsapp.net`;
                    }
                }
            }
        } catch {}
        return inputJid;
    }
    const number = inputJid.split('@')[0].split(':')[0].replace(/\D/g, '');
    return `${number}@s.whatsapp.net`;
}

async function logIncomingMessage(sock, msg, textMsg) {
    try {
        messageLogCounter++;
        const logNum = messageLogCounter;
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const rawSenderJid = msg.key.participant || chatId;
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
        let resolvedSenderJid = rawSenderJid;
        try { resolvedSenderJid = await resolveJidForLog(sock, rawSenderJid, isGroup ? chatId : null); } catch {}
        const phoneNumber = '+' + resolvedSenderJid.split('@')[0].split(':')[0].replace(/\D/g, '');
        let displayName = '';
        try {
            const contacts = sock.store?.contacts || {};
            const contact = contacts[resolvedSenderJid] || contacts[rawSenderJid];
            displayName = contact?.name || contact?.notify || '';
        } catch {}
        if (!displayName) displayName = phoneNumber;
        if (isGroup) {
            let groupName = chatId;
            try {
                const meta = await sock.groupMetadata(chatId);
                groupName = meta?.subject || chatId;
            } catch {}
            const line = '─'.repeat(42);
            originalConsoleMethods.log(chalk.green(
                `\n╭${line}\n` +
                `│ 🀄️ ${chalk.bold(`STANYTZ LOG #${logNum}`)}\n` +
                `├${line}\n` +
                `│ 👥 ${chalk.bold('Group  :')} ${groupName}\n` +
                `│ 👤 ${chalk.bold('Sender :')} ${displayName}\n` +
                `│ ☎️  ${chalk.bold('Number :')} ${phoneNumber}\n` +
                `│ 🆔 ${chalk.bold('JID    :')} ${chatId}\n` +
                `│ 💬 ${chalk.bold('Msg    :')} ${textMsg.substring(0, 80)}${textMsg.length > 80 ? '…' : ''}\n` +
                `│ 🕒 ${chalk.bold('Time   :')} ${timeStr}\n` +
                `│ 📩 ${chalk.bold('Type   :')} GROUP\n` +
                `╰${line}`
            ));
        } else {
            const line = '─'.repeat(37);
            originalConsoleMethods.log(chalk.green(
                `\n╭${line}\n` +
                `│ 🀄️ ${chalk.bold(`STANYTZ LOG #${logNum}`)}\n` +
                `├${line}\n` +
                `│ 👤 ${chalk.bold('Name   :')} ${displayName}\n` +
                `│ ☎️  ${chalk.bold('Number :')} ${phoneNumber}\n` +
                `│ 🆔 ${chalk.bold('JID    :')} ${resolvedSenderJid}\n` +
                `│ 💬 ${chalk.bold('Msg    :')} ${textMsg.substring(0, 80)}${textMsg.length > 80 ? '…' : ''}\n` +
                `│ 🕒 ${chalk.bold('Time   :')} ${timeStr}\n` +
                `│ 📩 ${chalk.bold('Type   :')} DM\n` +
                `╰${line}`
            ));
        }
    } catch {}
}

async function handleIncomingMessage(sock, msg) {
    const startTime = Date.now();
    try {
        const chatId = msg.key.remoteJid;
        const senderJid = msg.key.participant || chatId;
        const autoLinkPromise = autoLinkSystem.shouldAutoLink(sock, msg);
        if (isUserBlocked(senderJid)) return;
        const linked = await autoLinkPromise;
        if (linked) return;
        const textMsg = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
        if (!textMsg) return;
        logIncomingMessage(sock, msg, textMsg).catch(() => {});
        
        const prefixes = config.prefixes || ['.'];
        const isPrefixlessMode = config.prefixless;
        let commandName = '', args = [];
        let usedPrefix = '';
        
        for (const prefix of prefixes) {
            if (textMsg.startsWith(prefix)) {
                usedPrefix = prefix;
                const spaceIndex = textMsg.indexOf(' ', prefix.length);
                commandName = spaceIndex === -1 ? 
                    textMsg.slice(prefix.length).toLowerCase().trim() : 
                    textMsg.slice(prefix.length, spaceIndex).toLowerCase().trim();
                args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
                break;
            }
        }
        
        if (!commandName && isPrefixlessMode) {
            const words = textMsg.trim().split(/\s+/);
            commandName = words[0].toLowerCase();
            args = words.slice(1);
        }
        
        if (!commandName) return;
        
        const rateLimitCheck = rateLimiter.canSendCommand(chatId, senderJid, commandName);
        if (!rateLimitCheck.allowed) { await sock.sendMessage(chatId, { text: `⚠️ ${rateLimitCheck.reason}` }); return; }
        
        const prefixDisplay = usedPrefix || (isPrefixlessMode ? '' : prefixes[0]);
        UltraCleanLogger.command(`${chatId.split('@')[0]} → ${prefixDisplay}${commandName}`);
        
        if (!checkBotMode(msg, commandName)) {
            if (BOT_MODE === 'silent' && !jidManager.isOwner(msg)) return;
            try { await sock.sendMessage(chatId, { text: `❌ *Command Blocked*\nBot is in ${BOT_MODE} mode.` }); } catch {}
            return;
        }
        
        if (commandName === 'connect' || commandName === 'link') { const cleaned = jidManager.cleanJid(senderJid); await handleConnectCommand(sock, msg, args, cleaned); return; }
        
        const command = commands.get(commandName);
        if (command) {
            try {
                if (command.ownerOnly && !jidManager.isOwner(msg) && !isSudoUser(senderJid)) { 
                    try { await sock.sendMessage(chatId, { text: '❌ *Owner Only Command*' }); } catch {} 
                    return; 
                }
                if (commandName.includes('sticker')) await delay(1000);
                await command.execute(sock, msg, args, usedPrefix || prefixes[0], { 
                    OWNER_NUMBER: OWNER_CLEAN_NUMBER, 
                    OWNER_JID: OWNER_CLEAN_JID, 
                    OWNER_LID, 
                    BOT_NAME, 
                    VERSION, 
                    isOwner: () => jidManager.isOwner(msg), 
                    jidManager, 
                    store, 
                    statusDetector, 
                    updatePrefix: updatePrefixImmediately, 
                    getCurrentPrefix, 
                    rateLimiter, 
                    memberDetector, 
                    isPrefixless: isPrefixlessMode 
                });
                
                const isOwnerUser = jidManager.isOwner(msg);
                await afterCommand(sock, chatId, senderJid, isOwnerUser);
                
            } catch (error) { UltraCleanLogger.error(`Command ${commandName} failed: ${error.message}`); }
        } else { 
            await handleDefaultCommands(commandName, sock, msg, args, usedPrefix || prefixes[0]); 
        }
    } catch (error) { UltraCleanLogger.error(`Message handler error: ${error.message}`); }
}

async function handleDefaultCommands(commandName, sock, msg, args, currentPrefix) {
    const chatId = msg.key.remoteJid;
    const isOwnerUser = jidManager.isOwner(msg);
    try {
        switch (commandName) {
            case 'ping': await sock.sendMessage(chatId, { text: `🀄️ *MDINYANE v${VERSION}* — Pong! ✅\n⏱️ Uptime: ${Math.round(process.uptime())}s\n🖥️ Platform: ${currentPlatform}` }, { quoted: msg }); break;
            case 'uptime': { const uptime = process.uptime(); await sock.sendMessage(chatId, { text: `⏰ *Uptime:* ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s\n💾 *Memory:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB\n🖥️ *Platform:* ${currentPlatform}` }, { quoted: msg }); break; }
            case 'help': {
                let helpText = `🀄️ *${BOT_NAME} v${VERSION} HELP*\n\n📋 *Prefix:* ${isPrefixless ? 'none (prefixless)' : `"${currentPrefix}"`}\n📊 *Total Commands:* ${commands.size}\n🖥️ *Platform:* ${currentPlatform}\n\n`;
                for (const category of commandCategories.keys()) { const cmdList = commandCategories.get(category); helpText += `*${category.toUpperCase()}*\n${cmdList.map(c => `• ${currentPrefix}${c}`).join('\n')}\n\n`; }
                await sock.sendMessage(chatId, { text: helpText }, { quoted: msg }); break;
            }
            case 'statusstats': { if (!statusDetector) { await sock.sendMessage(chatId, { text: '❌ Status Detector not initialized' }, { quoted: msg }); break; } const stats = statusDetector.getStats(); await sock.sendMessage(chatId, { text: `👁️ *STATUS DETECTOR STATS*\n\n📊 Total Detected: ${stats.totalDetected}\n🕒 Last Detection: ${stats.lastDetection}\n🔧 Detection Enabled: ${stats.detectionEnabled ? '✅' : '❌'}` }, { quoted: msg }); break; }
            case 'prefixinfo': { const currentP = getCurrentPrefix(); await sock.sendMessage(chatId, { text: `💬 *PREFIX INFO*\n\nCurrent Prefix: ${isPrefixless ? 'none' : `"${currentP}"`}\nPrefixless Mode: ${isPrefixless ? '✅' : '❌'}` }, { quoted: msg }); break; }
            case 'platform': { await sock.sendMessage(chatId, { text: `🖥️ *PLATFORM INFO*\n\n├─ Platform: ${currentPlatform}\n├─ Node Version: ${process.version}\n├─ Uptime: ${Math.round(process.uptime())}s\n└─ Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB` }, { quoted: msg }); break; }
        }
    } catch (error) { UltraCleanLogger.error(`Default command error: ${error.message}`); }
}

// ============================================================
// LOGIN MANAGER (For Panel/Local only)
// ============================================================

class LoginManager {
    constructor() { this.rl = readline.createInterface({ input: process.stdin, output: process.stdout }); }
    async selectMode() {
        console.log(chalk.yellow('\n🀄️ MDINYANE v' + VERSION + ' - LOGIN SYSTEM'));
        console.log(chalk.blue('1) Pairing Code Login (Recommended)'));
        console.log(chalk.blue('2) Clean Session & Start Fresh'));
        console.log(chalk.magenta('3) Use Session ID (Download from Pastebin/paste.rs)'));
        const choice = await this.ask('Choose option (1-3, default 1): ');
        switch (choice.trim()) {
            case '1': return await this.pairingCodeMode();
            case '2': return await this.cleanStartMode();
            case '3': return await this.sessionIdMode();
            default: return await this.pairingCodeMode();
        }
    }
    async sessionIdMode() {
        let sessionId = process.env.SESSION_ID;
        if (!sessionId || sessionId.trim() === '') {
            const input = await this.ask('\nWould you like to:\n1) Paste Session ID now\n2) Go back to main menu\nChoice (1-2): ');
            if (input.trim() === '1') { sessionId = await this.ask('Paste your Session ID (Stanytz378/iamlegendv2_<pasteId>): '); if (!sessionId || sessionId.trim() === '') return await this.selectMode(); }
            else return await this.selectMode();
        }
        try { await authenticateWithSessionId(sessionId); return { mode: 'session', sessionId: sessionId.trim() }; }
        catch { console.log(chalk.yellow('📝 Falling back to pairing code mode...')); return await this.pairingCodeMode(); }
    }
    async pairingCodeMode() {
        console.log(chalk.cyan('\n📱 PAIRING CODE LOGIN'));
        const phone = await this.ask('Phone number (with country code, no +): ');
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 10) { console.log(chalk.red('❌ Invalid phone number')); return await this.selectMode(); }
        return { mode: 'pair', phone: cleanPhone };
    }
    async cleanStartMode() {
        const confirm = await this.ask('This will delete all session data. Are you sure? (y/n): ');
        if (confirm.toLowerCase() === 'y') { cleanSession(); return await this.pairingCodeMode(); }
        return await this.pairingCodeMode();
    }
    ask(question) { return new Promise((resolve) => { this.rl.question(chalk.yellow(question), resolve); }); }
    close() { if (this.rl) this.rl.close(); }
}

// ============================================================
// HEALTH CHECK SERVER (For Panel)
// ============================================================

if (isPanel) {
    import('http').then(http => {
        const server = http.createServer((req, res) => {
            if (req.url === '/health' || req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: isConnected ? 'online' : 'connecting',
                    uptime: process.uptime(),
                    version: VERSION,
                    platform: currentPlatform,
                    commands: commands.size,
                    connected: isConnected
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(chalk.green(`✅ Health check server running on port ${PORT}`));
        });
    }).catch(() => {});
}

// ============================================================
// MAIN FUNCTION - UPDATED FOR PLATFORM DETECTION
// ============================================================

async function main() {
    try {
        UltraCleanLogger.success(`🚀 Starting ${BOT_NAME} v${VERSION} on ${currentPlatform}`);
        
        if (isHeroku) {
            // HEROKU MODE: Automatic session loading - NO MENU
            const sessionId = process.env.SESSION_ID;
            
            if (!sessionId || sessionId.trim() === '') {
                UltraCleanLogger.error('❌ SESSION_ID is required on Heroku!');
                UltraCleanLogger.error('📝 Please set SESSION_ID in Heroku Config Vars');
                UltraCleanLogger.error('🔧 Format: Stanytz378/iamlegendv2_your-session-id');
                process.exit(1);
            }
            
            UltraCleanLogger.info('🤖 Heroku mode detected - Loading session automatically...');
            UltraCleanLogger.info(`📋 Session ID: ${sessionId.substring(0, 30)}...`);
            
            // Save session directly
            try {
                await authenticateWithSessionId(sessionId.trim());
                UltraCleanLogger.success('✅ Session loaded successfully!');
                
                // Start bot with session mode
                await startBot('session', sessionId.trim());
            } catch (error) {
                UltraCleanLogger.error(`❌ Failed to load session: ${error.message}`);
                UltraCleanLogger.error('💡 Make sure your SESSION_ID is valid and accessible');
                process.exit(1);
            }
        } else {
            // PANEL / LOCAL MODE: Show menu (1,2,3) for manual setup
            UltraCleanLogger.info('🖥️ Panel/Local mode detected - Showing login menu...');
            const loginManager = new LoginManager();
            const loginInfo = await loginManager.selectMode();
            loginManager.close();
            const loginData = loginInfo.mode === 'session' ? loginInfo.sessionId : loginInfo.phone;
            await startBot(loginInfo.mode, loginData);
        }
    } catch (error) { 
        UltraCleanLogger.error(`Main error: ${error.message}`); 
        if (!isHeroku) {
            setTimeout(async () => { await main(); }, 8000);
        } else {
            process.exit(1);
        }
    }
}

// ============================================================
// PROCESS HANDLERS
// ============================================================

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down gracefully...'));
    if (statusDetector) statusDetector.saveStatusLogs();
    if (memberDetector) memberDetector.saveDetectionData();
    stopHeartbeat();
    if (SOCKET_INSTANCE) SOCKET_INSTANCE.ws.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Received SIGTERM, shutting down...'));
    if (statusDetector) statusDetector.saveStatusLogs();
    if (memberDetector) memberDetector.saveDetectionData();
    stopHeartbeat();
    if (SOCKET_INSTANCE) SOCKET_INSTANCE.ws.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => { 
    UltraCleanLogger.error(`Uncaught exception: ${error.message}`); 
    if (!isHeroku) {
        // Don't crash on non-Heroku platforms
        console.log(chalk.yellow('⚠️ Continuing despite error...'));
    }
});

process.on('unhandledRejection', (error) => { 
    UltraCleanLogger.error(`Unhandled rejection: ${error?.message}`); 
    if (!isHeroku) {
        console.log(chalk.yellow('⚠️ Continuing despite rejection...'));
    }
});

setInterval(() => { 
    if (isConnected && (Date.now() - lastActivityTime) > 5 * 60 * 1000 && SOCKET_INSTANCE) { 
        SOCKET_INSTANCE.sendPresenceUpdate('available').catch(() => {}); 
    } 
}, 60000);

// ============================================================
// START THE BOT
// ============================================================

main().catch((error) => { 
    UltraCleanLogger.critical(`Fatal error: ${error.message}`);
    if (isHeroku) process.exit(1);
});
