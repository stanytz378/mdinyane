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
 *    Description: MDINYANE WhatsApp Bot - 24/7 Mode                        *
 *                 All features use @whiskeysockets/baileys only            *
 *                                                                           *
 *****************************************************************************/

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import readline from 'readline';
import moment from 'moment-timezone';
import SaveCreds from './mdinyane/session.js';
import { settingsDB, usageDB } from './mdinyane/database.js';
import { 
    handleMessages, 
    handleGroupParticipantUpdate, 
    handleStatus, 
    handleCall,
    printLog,
    isAdmin,
    isOwnerOrSudo
} from './stz/messagehandler.js';

dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
//  MDINYANE BOT CONFIGURATION
// ============================================================

const BOT_NAME = process.env.BOT_NAME || 'MDINYANE';
const VERSION = '2.0.0';
const DEFAULT_PREFIX = '.';
const OWNER_FILE = './owner.json';
const SESSION_DIR = './session';
const STANY_DIR = './stany';
const BOT_IMAGE_PATH = join(process.cwd(), 'stanytz', 'B803A026-2887-4715-8FE6-05E82D801427.png');

// Auto-join configuration
const AUTO_JOIN_ENABLED = true;
const GROUP_LINK = 'https://chat.whatsapp.com/J19JASXoaK0GVSoRvShr4Y';
const GROUP_INVITE_CODE = GROUP_LINK.split('/').pop();
const GROUP_NAME = 'STANYTZ TEAM';

let SOCKET_INSTANCE = null;
let isConnected = false;
let store = null;
let heartbeatInterval = null;
let lastActivityTime = Date.now();
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 10;
let BOT_MODE = 'public';
let isWaitingForPairingCode = false;

// Rate limiting
const RATE_LIMIT_ENABLED = true;
const MIN_COMMAND_DELAY = 1000;
const STICKER_DELAY = 2000;

// Commands storage
const commands = new Map();
const commandCategories = new Map();

// ============================================================
//  CLEAN CONSOLE LOGGER
// ============================================================

const originalConsoleMethods = {
    log: console.log, info: console.info, warn: console.warn,
    error: console.error, debug: console.debug, trace: console.trace
};

const shouldShowLog = (args) => {
    if (args.length === 0) return true;
    const firstArg = args[0];
    if (typeof firstArg !== 'string') return true;
    const lowerMsg = firstArg.toLowerCase();
    const allowPatterns = ['command', '✅', '❌', '👥', '👤', 'menu', 'ping', 'owner', 'mdinyane'];
    if (allowPatterns.some(p => lowerMsg.includes(p))) return true;
    const noisyPatterns = ['baileys', 'signal', 'session', 'buffer', 'key', 'closing session', 'decrypt'];
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
    const sessionPatterns = ['closing session', 'sessionentry', 'registrationid', 'currentratchet'];
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

setupProcessFilter();

class MDINYANELogger {
    static log(...args) {
        const timestamp = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
        originalConsoleMethods.log(timestamp, ...args);
    }
    static error(...args) {
        const timestamp = chalk.red(`[${new Date().toLocaleTimeString()}]`);
        originalConsoleMethods.error(timestamp, ...args);
    }
    static success(...args) {
        originalConsoleMethods.log(chalk.green(`[${new Date().toLocaleTimeString()}]`), chalk.green('✅'), ...args);
    }
    static info(...args) {
        originalConsoleMethods.log(chalk.blue(`[${new Date().toLocaleTimeString()}]`), chalk.blue('ℹ️'), ...args);
    }
    static warning(...args) {
        originalConsoleMethods.log(chalk.yellow(`[${new Date().toLocaleTimeString()}]`), chalk.yellow('⚠️'), ...args);
    }
    static command(...args) {
        originalConsoleMethods.log(chalk.cyan(`[${new Date().toLocaleTimeString()}]`), chalk.cyan('💬'), ...args);
    }
    static group(...args) {
        originalConsoleMethods.log(chalk.magenta(`[${new Date().toLocaleTimeString()}]`), chalk.magenta('👥'), ...args);
    }
}

console.log = MDINYANELogger.log;
console.error = MDINYANELogger.error;
console.info = MDINYANELogger.info;
console.warn = MDINYANELogger.warning;

global.logSuccess = MDINYANELogger.success;
global.logInfo = MDINYANELogger.info;
global.logWarning = MDINYANELogger.warning;
global.logCommand = MDINYANELogger.command;
global.logGroup = MDINYANELogger.group;

// ============================================================
//  RATE LIMITER
// ============================================================

class RateLimitProtection {
    constructor() {
        this.commandTimestamps = new Map();
        this.userCooldowns = new Map();
        this.globalCooldown = Date.now();
        setInterval(() => this.cleanup(), 60000);
    }
    canSendCommand(chatId, userId, command) {
        if (!RATE_LIMIT_ENABLED) return { allowed: true };
        const now = Date.now();
        const userKey = `${userId}_${command}`;
        if (this.userCooldowns.has(userKey)) {
            const timeDiff = now - this.userCooldowns.get(userKey);
            if (timeDiff < MIN_COMMAND_DELAY) {
                return { allowed: false, reason: `Please wait ${Math.ceil((MIN_COMMAND_DELAY - timeDiff) / 1000)}s` };
            }
        }
        this.userCooldowns.set(userKey, now);
        this.commandTimestamps.set(`${chatId}_${command}`, now);
        return { allowed: true };
    }
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    cleanup() {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        for (const [key, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > fiveMinutes) this.userCooldowns.delete(key);
        }
    }
}

const rateLimiter = new RateLimitProtection();

// ============================================================
//  PREFIX MANAGEMENT
// ============================================================

let prefixCache = settingsDB.get().prefix || DEFAULT_PREFIX;
let isPrefixless = settingsDB.get().isPrefixless || false;

function getCurrentPrefix() { return isPrefixless ? '' : prefixCache; }

function updatePrefixImmediately(newPrefix) {
    const isNone = newPrefix === 'none' || newPrefix === '';
    if (isNone) {
        isPrefixless = true;
        prefixCache = '';
    } else {
        prefixCache = newPrefix.trim();
        isPrefixless = false;
    }
    settingsDB.update({ prefix: prefixCache, isPrefixless, updatedAt: new Date().toISOString() });
    updateTerminalHeader();
    return { success: true, newPrefix: isPrefixless ? 'none' : prefixCache };
}

function updateTerminalHeader() {
    const prefixDisplay = isPrefixless ? 'none (prefixless)' : `"${prefixCache}"`;
    console.clear();
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════════╗
║   🀄️ ${chalk.bold(`${BOT_NAME} v${VERSION}`)}
║   💬 Prefix  : ${prefixDisplay}
║   🛡️ Rate Limit: ✅ ACTIVE
║   🔗 Auto-Join: ${AUTO_JOIN_ENABLED ? '✅' : '❌'}
║   📡 Status   : ${isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}
╚══════════════════════════════════════════════════════════════════════╝
`));
}

updateTerminalHeader();

// ============================================================
//  JID MANAGER & OWNER
// ============================================================

let OWNER_NUMBER = null, OWNER_JID = null;

class JidManager {
    constructor() {
        this.owner = null;
        this.loadOwnerData();
    }
    loadOwnerData() {
        try {
            if (fs.existsSync(OWNER_FILE)) {
                const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
                this.owner = {
                    cleanNumber: data.OWNER_CLEAN_NUMBER || data.OWNER_NUMBER,
                    cleanJid: data.OWNER_CLEAN_JID || data.OWNER_JID,
                    rawJid: data.OWNER_JID
                };
                OWNER_NUMBER = this.owner.cleanNumber;
                OWNER_JID = this.owner.cleanJid;
            }
        } catch (error) {
            MDINYANELogger.warning(`Error loading owner: ${error.message}`);
        }
    }
    cleanJid(jid) {
        if (!jid) return { cleanJid: '', cleanNumber: '' };
        const cleanNumber = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return { cleanJid: `${cleanNumber}@s.whatsapp.net`, cleanNumber };
    }
    isOwner(msg) {
        if (!msg || !msg.key) return false;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const cleaned = this.cleanJid(senderJid);
        if (!this.owner || !this.owner.cleanNumber) return false;
        return cleaned.cleanNumber === this.owner.cleanNumber;
    }
    setNewOwner(jid) {
        const cleaned = this.cleanJid(jid);
        this.owner = { cleanNumber: cleaned.cleanNumber, cleanJid: cleaned.cleanJid, rawJid: jid };
        fs.writeFileSync(OWNER_FILE, JSON.stringify({
            OWNER_JID: jid,
            OWNER_NUMBER: cleaned.cleanNumber,
            OWNER_CLEAN_JID: cleaned.cleanJid,
            OWNER_CLEAN_NUMBER: cleaned.cleanNumber,
            linkedAt: new Date().toISOString()
        }, null, 2));
        OWNER_NUMBER = cleaned.cleanNumber;
        OWNER_JID = cleaned.cleanJid;
        return { success: true };
    }
    getOwnerInfo() {
        return {
            ownerNumber: this.owner?.cleanNumber || null,
            ownerJid: this.owner?.cleanJid || null,
            rawJid: this.owner?.rawJid || null
        };
    }
}

const jidManager = new JidManager();

// ============================================================
//  COMMANDS MANAGEMENT
// ============================================================

async function loadCommandsFromStany() {
    const stanyPath = path.join(process.cwd(), 'stany');
    
    if (!fs.existsSync(stanyPath)) {
        MDINYANELogger.warning('stany folder not found! Creating...');
        fs.mkdirSync(stanyPath, { recursive: true });
        return;
    }
    
    const scanDirectory = async (dir, category = 'general') => {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                await scanDirectory(fullPath, item);
            } else if (item.endsWith('.js')) {
                try {
                    const commandModule = await import(`file://${fullPath}`);
                    const command = commandModule.default || commandModule;
                    
                    if (command && command.name) {
                        command.category = command.category || category;
                        commands.set(command.name.toLowerCase(), command);
                        
                        if (!commandCategories.has(command.category)) {
                            commandCategories.set(command.category, []);
                        }
                        commandCategories.get(command.category).push(command.name);
                        
                        if (Array.isArray(command.alias)) {
                            command.alias.forEach(alias => commands.set(alias.toLowerCase(), command));
                        }
                        
                        MDINYANELogger.info(`Loaded: ${command.name} [${command.category}]`);
                    }
                } catch (error) {
                    MDINYANELogger.error(`Error loading ${item}: ${error.message}`);
                }
            }
        }
    };
    
    await scanDirectory(stanyPath);
    MDINYANELogger.success(`✅ Loaded ${commands.size} commands from stany folder`);
}

// ============================================================
//  MESSAGE HANDLER WITH COMMANDS
// ============================================================

class MessageStore {
    constructor() {
        this.messages = new Map();
        this.maxMessages = 100;
    }
    addMessage(jid, messageId, message) {
        const key = `${jid}|${messageId}`;
        this.messages.set(key, { ...message, timestamp: Date.now() });
        if (this.messages.size > this.maxMessages) {
            this.messages.delete(this.messages.keys().next().value);
        }
    }
    getMessage(jid, messageId) {
        return this.messages.get(`${jid}|${messageId}`) || null;
    }
}

async function handleIncomingCommand(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        const senderJid = msg.key.participant || chatId;
        
        // Skip status broadcasts
        if (chatId === 'status@broadcast') return;
        
        // Get message text
        const textMsg = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || 
                       msg.message?.videoMessage?.caption || '';
        
        if (!textMsg) return;
        
        // Get prefix
        const currentPrefix = getCurrentPrefix();
        let commandName = '', args = [];
        
        // Check if message starts with prefix
        if (!isPrefixless && textMsg.startsWith(currentPrefix)) {
            const spaceIndex = textMsg.indexOf(' ', currentPrefix.length);
            commandName = spaceIndex === -1 ? 
                textMsg.slice(currentPrefix.length).toLowerCase().trim() : 
                textMsg.slice(currentPrefix.length, spaceIndex).toLowerCase().trim();
            args = spaceIndex === -1 ? [] : textMsg.slice(spaceIndex).trim().split(/\s+/);
        } else if (isPrefixless) {
            const words = textMsg.trim().split(/\s+/);
            const firstWord = words[0].toLowerCase();
            if (commands.has(firstWord)) {
                commandName = firstWord;
                args = words.slice(1);
            }
        }
        
        if (!commandName) return;
        
        // Rate limiting
        const rateCheck = rateLimiter.canSendCommand(chatId, senderJid, commandName);
        if (!rateCheck.allowed) {
            await sock.sendMessage(chatId, { text: `⚠️ ${rateCheck.reason}` });
            return;
        }
        
        // Track usage
        usageDB.increment(commandName, senderJid);
        
        MDINYANELogger.command(`${senderJid.split('@')[0]} → ${currentPrefix}${commandName}`);
        
        // Execute command
        const command = commands.get(commandName);
        if (command) {
            try {
                // Check owner only
                if (command.ownerOnly && !jidManager.isOwner(msg)) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ *Owner Only Command*\nThis command can only be used by the bot owner!'
                    });
                    return;
                }
                
                // Execute
                await command.execute(sock, msg, args, currentPrefix, {
                    BOT_NAME, VERSION,
                    isOwner: () => jidManager.isOwner(msg),
                    jidManager,
                    getCurrentPrefix,
                    isPrefixless,
                    settingsDB,
                    usageDB
                });
                
            } catch (error) {
                MDINYANELogger.error(`Command ${commandName} failed: ${error.message}`);
                await sock.sendMessage(chatId, { 
                    text: `❌ Error: ${error.message}`
                });
            }
        }
        
    } catch (error) {
        MDINYANELogger.error(`Command handler error: ${error.message}`);
    }
}

// ============================================================
//  SESSION & AUTHENTICATION
// ============================================================

function ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
}

function cleanSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        }
        return true;
    } catch {
        return false;
    }
}

class LoginManager {
    constructor() {
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }
    
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
        console.log(chalk.cyan('\n📥 SESSION ID LOGIN'));
        console.log(chalk.white('Format: Stanytz378/iamlegendv2_<pasteId>'));
        
        let sessionId = process.env.SESSION_ID;
        if (!sessionId || sessionId.trim() === '') {
            sessionId = await this.ask('Paste your Session ID: ');
            if (!sessionId || sessionId.trim() === '') {
                console.log(chalk.yellow('No session ID provided. Using pairing mode...'));
                return await this.pairingCodeMode();
            }
        }
        
        try {
            console.log(chalk.blue('📥 Downloading credentials...'));
            await SaveCreds(sessionId.trim());
            console.log(chalk.green('✅ Session downloaded successfully!'));
            return { mode: 'session' };
        } catch (error) {
            console.log(chalk.red(`❌ Session download failed: ${error.message}`));
            console.log(chalk.yellow('📝 Falling back to pairing code mode...'));
            return await this.pairingCodeMode();
        }
    }
    
    async pairingCodeMode() {
        console.log(chalk.cyan('\n📱 PAIRING CODE LOGIN'));
        const phone = await this.ask('Phone number (with country code, no +): ');
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        if (!cleanPhone || cleanPhone.length < 10) {
            console.log(chalk.red('❌ Invalid phone number'));
            return await this.selectMode();
        }
        
        return { mode: 'pair', phone: cleanPhone };
    }
    
    async cleanStartMode() {
        const confirm = await this.ask('This will delete all session data. Are you sure? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            cleanSession();
            console.log(chalk.green('✅ Session cleaned!'));
            return await this.pairingCodeMode();
        }
        return await this.pairingCodeMode();
    }
    
    ask(question) {
        return new Promise((resolve) => {
            this.rl.question(chalk.yellow(question), resolve);
        });
    }
    
    close() {
        if (this.rl) this.rl.close();
    }
}

// ============================================================
//  BOT CONNECTION
// ============================================================

function startHeartbeat(sock) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
        if (isConnected && sock) {
            try {
                await sock.sendPresenceUpdate('available');
                lastActivityTime = Date.now();
            } catch (error) {}
        }
    }, 60000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

async function startBot(loginMode = 'pair', loginData = null) {
    try {
        MDINYANELogger.info('🚀 Initializing MDINYANE Bot...');
        
        if (loginMode === 'session') {
            ensureSessionDir();
        }
        
        // Load commands
        await loadCommandsFromStany();
        store = new MessageStore();
        
        const { default: makeWASocket } = await import('@whiskeysockets/baileys');
        const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = await import('@whiskeysockets/baileys');
        
        let state, saveCreds;
        const sessionDir = SESSION_DIR;
        
        try {
            const authState = await useMultiFileAuthState(sessionDir);
            state = authState.state;
            saveCreds = authState.saveCreds;
        } catch (error) {
            MDINYANELogger.warning('Auth state error, cleaning...');
            cleanSession();
            ensureSessionDir();
            const freshAuth = await useMultiFileAuthState(sessionDir);
            state = freshAuth.state;
            saveCreds = freshAuth.saveCreds;
        }
        
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            logger: { level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {} },
            browser: Browsers.ubuntu('Chrome'),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, { level: 'silent' })
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 40000,
            keepAliveIntervalMs: 15000,
            emitOwnEvents: true,
            getMessage: async (key) => store?.getMessage(key.remoteJid, key.id) || null
        });
        
        SOCKET_INSTANCE = sock;
        connectionAttempts = 0;
        isWaitingForPairingCode = false;
        
        // Connection update handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                isConnected = true;
                startHeartbeat(sock);
                
                // Set owner if first time
                if (!fs.existsSync(OWNER_FILE) && sock.user?.id) {
                    jidManager.setNewOwner(sock.user.id);
                }
                
                updateTerminalHeader();
                
                // ============================================================
                // SEND CONNECTION SUCCESS MESSAGE TO OWNER ONLY
                // With forwarded context and bot image
                // ============================================================
                
                // Get current time and date (East Africa Time)
                const now = moment().tz('Africa/Dar_es_Salaam');
                const time = now.format('HH:mm:ss');
                const date = now.format('DD/MM/YYYY');
                const day = now.format('dddd');
                
                // Get bot info
                const botName = BOT_NAME || 'MDINYANE';
                const prefix = getCurrentPrefix();
                const totalCommands = commands.size;
                
                // Get owner info
                const ownerInfo = jidManager.getOwnerInfo();
                let ownerNumber = ownerInfo?.ownerNumber || OWNER_NUMBER;
                let ownerJid = ownerNumber ? (ownerNumber.includes('@') ? ownerNumber : `${ownerNumber}@s.whatsapp.net`) : null;
                
                // Get device info
                const deviceJid = sock.user?.id || 'Unknown';
                const deviceNumber = deviceJid.split('@')[0].split(':')[0];
                const deviceName = sock.user?.name || sock.user?.notify || 'MDINYANE Bot';
                
                // Channel link
                const channelLink = 'https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p';
                
                // Build the connection message
                const successMessage = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      🌟 WELCOME TO LEGEND 🌟      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━❲ 🔐 DEVICE STATUS ❳━━⬣
┃
┃  ✅ *Linked Successfully*
┃  🤖 *Bot:* ${botName}
┃  📱 *Device:* ${deviceName} (${deviceNumber})
┃  ⏰ *Time:* ${time} | 📅 ${date} (${day})
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 📋 BOT INFO ❳━━⬣
┃
┃  📝 *Commands:* ${totalCommands}+ plugins
┃  ⚡ *Prefix:* \`${prefix}\` (menu: \`${prefix}menu\`)
┃  👑 *Owner:* ${ownerNumber || 'Not set'}
┃  🚀 *Status:* ONLINE 24/7
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 🎯 QUICK START ❳━━⬣
┃
┃  ✨ \`${prefix}menu\` - Show all commands
┃  📢 \`${prefix}owner\` - Contact owner
┃  🧠 \`${prefix}ai <text>\` - Ask AI
┃  🎵 \`${prefix}play <song>\` - Download music
┃  📸 \`${prefix}sticker\` - Convert to sticker
┃  👥 \`${prefix}group\` - Group management
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━❲ 🔔 IMPORTANT ❳━━⬣
┃
┃  📢 *Channel:* ${channelLink}
┃ 
┃  ⚠️ *Note:* Bot may take few seconds to respond
┃  💡 Type \`${prefix}help\` for detailed guide
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🎉 THANK YOU FOR CHOOSING US 🎉   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> *MDINYANE - WhatsApp Bot | ᴾᵒʷᵉʳᵉᵈ ᵇʸ ˢᵀᴬᴺʸ ᵀᶻ*
                `.trim();
                
                // Send to owner with image and forwarded context
                if (ownerJid) {
                    try {
                        const imageExists = fs.existsSync(BOT_IMAGE_PATH);
                        
                        const forwardContext = {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363404317544295@newsletter',
                                newsletterName: 'ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ✨',
                                serverMessageId: Date.now().toString()
                            }
                        };
                        
                        if (imageExists) {
                            await sock.sendMessage(ownerJid, {
                                image: fs.readFileSync(BOT_IMAGE_PATH),
                                caption: successMessage,
                                contextInfo: forwardContext
                            });
                            MDINYANELogger.success(`📸 Connection message sent with image to owner: ${ownerNumber}`);
                        } else {
                            await sock.sendMessage(ownerJid, {
                                text: successMessage,
                                contextInfo: forwardContext
                            });
                            MDINYANELogger.success(`📝 Connection message sent to owner: ${ownerNumber}`);
                        }
                    } catch (error) {
                        MDINYANELogger.error(`Failed to send success message to owner: ${error.message}`);
                        
                        // Fallback: send without forwarded context
                        try {
                            const imageExists = fs.existsSync(BOT_IMAGE_PATH);
                            if (imageExists) {
                                await sock.sendMessage(ownerJid, {
                                    image: fs.readFileSync(BOT_IMAGE_PATH),
                                    caption: successMessage
                                });
                            } else {
                                await sock.sendMessage(ownerJid, { text: successMessage });
                            }
                        } catch (e) {
                            MDINYANELogger.error(`Fallback also failed: ${e.message}`);
                        }
                    }
                } else {
                    MDINYANELogger.warning('No owner JID found, cannot send connection message');
                }
                
                // Console output
                console.log(chalk.greenBright(`
╔══════════════════════════════════════════════════════════════════════╗
║  ✅ ${BOT_NAME} v${VERSION} - Connected Successfully!
║  👑 Owner: ${ownerNumber || 'Not set'}
║  📱 Device: ${deviceNumber}
║  💬 Prefix: ${isPrefixless ? 'none' : prefixCache}
║  📊 Commands: ${totalCommands}
╚══════════════════════════════════════════════════════════════════════╝
`));
                
                isWaitingForPairingCode = false;
            }
            
            if (connection === 'close') {
                isConnected = false;
                stopHeartbeat();
                connectionAttempts++;
                
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const delayTime = Math.min(4000 * Math.pow(2, connectionAttempts - 1), 50000);
                
                MDINYANELogger.warning(`Connection closed! Reconnecting in ${delayTime/1000}s...`);
                
                if (statusCode === 401 || statusCode === 403) {
                    MDINYANELogger.warning('Auth error, cleaning session...');
                    cleanSession();
                }
                
                setTimeout(async () => {
                    if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
                        MDINYANELogger.error('Max retry attempts reached. Restarting...');
                        process.exit(1);
                    } else {
                        await startBot(loginMode, loginData);
                    }
                }, delayTime);
            }
            
            if (connection === 'connecting') {
                MDINYANELogger.info('🔄 Establishing connection...');
                
                if (loginMode === 'pair' && loginData && !state.creds.registered && !isWaitingForPairingCode) {
                    isWaitingForPairingCode = true;
                    
                    setTimeout(async () => {
                        try {
                            const code = await sock.requestPairingCode(loginData);
                            const formattedCode = code.length === 8 ? `${code.substring(0, 4)}-${code.substring(4, 8)}` : code;
                            console.clear();
                            console.log(chalk.greenBright(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🔗 PAIRING CODE - ${BOT_NAME}                        
╠══════════════════════════════════════════════════════════════════════╣
║  📞 Phone  : ${chalk.cyan(loginData)}
║  🔑 Code   : ${chalk.yellow.bold(formattedCode)}
║  ⏰ Expires : 10 minutes
║                                                                          
║  📱 INSTRUCTIONS:                                                       
║  1. Open WhatsApp → Settings → Linked Devices                          
║  2. Tap "Link a Device"                                                
║  3. Enter code: ${chalk.yellow.bold(formattedCode)}                      
╚══════════════════════════════════════════════════════════════════════╝
`));
                        } catch (error) {
                            MDINYANELogger.error('Pairing code request failed');
                        }
                    }, 2000);
                }
            }
        });
        
        // Creds update handler
        sock.ev.on('creds.update', saveCreds);
        
        // Messages handler
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message) return;
            lastActivityTime = Date.now();
            
            // Store message
            if (store) store.addMessage(msg.key.remoteJid, msg.key.id, msg);
            
            // Handle via message handler (for automations)
            await handleMessages(sock, { messages, type });
            
            // Handle commands
            await handleIncomingCommand(sock, msg);
        });
        
        // Group participant updates
        sock.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(sock, update);
        });
        
        // Call handler (anti-call)
        sock.ev.on('call', async (calls) => {
            await handleCall(sock, calls);
        });
        
        return sock;
        
    } catch (error) {
        MDINYANELogger.error(`Connection failed: ${error.message}`);
        setTimeout(async () => {
            await startBot(loginMode, loginData);
        }, 8000);
    }
}

// ============================================================
//  MAIN FUNCTION
// ============================================================

async function main() {
    try {
        MDINYANELogger.success(`🚀 Starting ${BOT_NAME} v${VERSION}`);
        console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════════╗
║  🀄️ ${chalk.bold('MDINYANE WHATSAPP BOT')}
║  👨‍💻 Developed by: STANY TZ
║  📡 Version: ${VERSION}
║  🔗 GitHub: https://github.com/Stanytz378/iamlegendv2
║  ▶️ YouTube: https://youtube.com/@STANYTZ
╚══════════════════════════════════════════════════════════════════════╝
`));
        
        const loginManager = new LoginManager();
        const loginInfo = await loginManager.selectMode();
        loginManager.close();
        
        const loginData = loginInfo.mode === 'session' ? null : loginInfo.phone;
        await startBot(loginInfo.mode, loginData);
        
    } catch (error) {
        MDINYANELogger.error(`Main error: ${error.message}`);
        setTimeout(async () => { await main(); }, 8000);
    }
}

// ============================================================
//  PROCESS HANDLERS
// ============================================================

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down MDINYANE Bot...'));
    stopHeartbeat();
    if (SOCKET_INSTANCE) SOCKET_INSTANCE.ws?.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    MDINYANELogger.error(`Uncaught exception: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
    MDINYANELogger.error(`Unhandled rejection: ${error?.message}`);
});

// Auto-save usage stats periodically
setInterval(() => {
    if (usageDB) {
        usageDB.db.save();
    }
}, 60000);

// Update presence every minute
setInterval(() => {
    if (isConnected && SOCKET_INSTANCE) {
        SOCKET_INSTANCE.sendPresenceUpdate('available').catch(() => {});
    }
}, 60000);

// ============================================================
//  START THE BOT
// ============================================================

main().catch(() => { process.exit(1); });
