/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STANY_DIR = path.join(__dirname, '..');

// File to store command usage statistics
const USAGE_STATS_FILE = path.join(process.cwd(), 'stanydata', 'command_usage.json');

// Premium users file
const PREMIUM_FILE = path.join(process.cwd(), 'stanydata', 'premium_users.json');

if (!fs.existsSync(path.dirname(USAGE_STATS_FILE))) {
    fs.mkdirSync(path.dirname(USAGE_STATS_FILE), { recursive: true });
}
if (!fs.existsSync(USAGE_STATS_FILE)) {
    fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(PREMIUM_FILE)) {
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify({ users: [] }, null, 2));
}

// ============================================================
// PREMIUM FUNCTIONS
// ============================================================

function isPremiumUser(userId) {
    try {
        if (fs.existsSync(PREMIUM_FILE)) {
            const data = JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf8'));
            const cleanId = userId.split('@')[0];
            const user = data.users?.find(u => u.id === cleanId || u.id === userId);
            if (user && user.expiryDate) {
                return new Date(user.expiryDate) > new Date();
            }
            return !!user;
        }
        return false;
    } catch {
        return false;
    }
}

function getUserStatus(userId, isOwner) {
    if (isOwner) return { status: '*OWNER* 👑', emoji: '👑', text: 'OWNER' };
    if (isPremiumUser(userId)) return { status: '*PREMIUM* 💎', emoji: '💎', text: 'PREMIUM' };
    return { status: '*FREE* 👤', emoji: '👤', text: 'FREE' };
}

// ============================================================
// 50+ QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Success is not final, failure is not fatal. - Winston Churchill",
    "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The best way to predict the future is to create it.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Small steps every day lead to big results.",
    "Be stronger than your excuses.",
    "Your only limit is your mind.",
    "Progress, not perfection.",
    "Fall seven times, stand up eight.",
    "Dream it. Wish it. Do it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Make your own luck.",
    "Everything you can imagine is real. - Pablo Picasso"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ============================================================
// LOAD ALL COMMANDS WITH THEIR ICONS FROM STANY FOLDER
// ============================================================

async function loadCommandsFromStany() {
    const categories = new Map();
    
    const scanDirectory = async (dir, category = 'general') => {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                await scanDirectory(fullPath, item);
            } else if (item.endsWith('.js') && item !== 'menu.js') {
                try {
                    const commandModule = await import(`file://${fullPath}`);
                    const command = commandModule.default || commandModule;
                    
                    if (command && command.name) {
                        const cmdCategory = command.category || category;
                        if (!categories.has(cmdCategory)) {
                            categories.set(cmdCategory, []);
                        }
                        categories.get(cmdCategory).push({
                            name: command.name,
                            icon: command.icon || '📌',  // ← ICON INASOMWA KUTOKA COMMAND FILE
                            ownerOnly: command.ownerOnly || false
                        });
                    }
                } catch (err) {
                    console.error(`Error loading command from ${item}:`, err.message);
                }
            }
        }
    };
    
    await scanDirectory(STANY_DIR);
    
    if (!categories.has('general')) {
        categories.set('general', []);
    }
    
    const menuExists = categories.get('general').some(cmd => cmd.name === 'menu');
    if (!menuExists) {
        categories.get('general').push({
            name: 'menu',
            icon: '📋',
            ownerOnly: false
        });
    }
    
    return new Map([...categories.entries()].sort());
}

// ============================================================
// GET CATEGORY ICON
// ============================================================

function getCategoryIcon(category) {
    const icons = {
        'general': '🎯',
        'group': '👥',
        'automation': '⚙️',
        'owner': '👑',
        'download': '⬇️',
        'music': '🎵',
        'tools': '🔧',
        'fun': '🎮',
        'media': '📷',
        'ai': '🤖',
        'games': '🎲'
    };
    return icons[category.toLowerCase()] || '🧛';
}

// ============================================================
// GET TOP COMMANDS (Most Used)
// ============================================================

function getTopCommands(limit = 5) {
    try {
        const stats = JSON.parse(fs.readFileSync(USAGE_STATS_FILE, 'utf8'));
        const commands = [];
        for (const [cmd, count] of Object.entries(stats)) {
            if (cmd !== 'total' && cmd !== 'lastUpdated' && typeof count === 'number') {
                commands.push({ name: cmd, count });
            }
        }
        commands.sort((a, b) => b.count - a.count);
        return commands.slice(0, limit);
    } catch {
        return [];
    }
}

// ============================================================
// UPDATE COMMAND USAGE
// ============================================================

async function updateCommandUsage(commandName) {
    try {
        const stats = JSON.parse(fs.readFileSync(USAGE_STATS_FILE, 'utf8'));
        stats[commandName] = (stats[commandName] || 0) + 1;
        stats.total = (stats.total || 0) + 1;
        stats.lastUpdated = new Date().toISOString();
        fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(stats, null, 2));
    } catch {}
}

// ============================================================
// SEND WITH IMAGE AND FORWARDED MARK
// ============================================================

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
        if (imageExists) {
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: channelInfo.contextInfo,
                mentions: mentions
            }, { quoted: quoted });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: text,
            mentions: mentions
        }, { quoted: quoted });
    }
}

// ============================================================
// MAIN MENU COMMAND
// ============================================================

export default {
    name: 'menu',
    description: 'Show all bot commands',
    icon: '📋',
    alias: ['help', 'commands', 'listmenu', 'allmenu', 'h'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, getCurrentPrefix, isPrefixless }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const isOwnerUser = isOwner(msg);
        
        await updateCommandUsage('menu');
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        const randomQuote = getRandomQuote();
        const commandsByCategory = await loadCommandsFromStany();
        const topCommands = getTopCommands(5);
        
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        let totalCommands = 0;
        for (const commands of commandsByCategory.values()) {
            totalCommands += commands.length;
        }
        
        const userStatus = getUserStatus(sender, isOwnerUser);
        
        // ============================================================
        // BUILD MENU - ICONS LOADED FROM COMMAND FILES
        // ============================================================
        
        let menu = `╭──❍「 *🀄️ TOP MENU* 」❍\n`;
        
        if (topCommands.length > 0) {
            for (let i = 0; i < topCommands.length; i++) {
                const cmd = topCommands[i];
                // Find icon for top command
                let icon = '🀄️';
                for (const [category, commands] of commandsByCategory) {
                    const found = commands.find(c => c.name === cmd.name);
                    if (found && found.icon) {
                        icon = found.icon;
                        break;
                    }
                }
                menu += `│ ${icon} *${prefixDisplay}${cmd.name}* : ${cmd.count} uses\n`;
            }
        } else {
            menu += `│ 📋 *${prefixDisplay}menu*\n`;
            menu += `│ 🏓 *${prefixDisplay}ping*\n`;
            menu += `│ 👑 *${prefixDisplay}owner*\n`;
            menu += `│ 🟢 *${prefixDisplay}alive*\n`;
            menu += `│ ⚙️ *${prefixDisplay}settings*\n`;
        }
        menu += `╰─┬────❍\n`;
        
        // User Info
        menu += `╭─┴─❍「 *👤 USER INFO* 」❍\n`;
        menu += `├ 🏷️ *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *Role* : ${isOwnerUser ? 'OWNER 👑' : 'USER 👤'}\n`;
        menu += `├ 💎 *Status* : ${userStatus.status}\n`;
        menu += `├ 📱 *Your Number:* +${ownerInfo.ownerNumber}
        menu += `╰─┬────❍\n`;
        
        // Bot Info
        menu += `╭─┴─❍「 *🤖 BOT INFO* 」❍\n`;
        menu += `├ 📛 *Name* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Developer* : STANY TZ\n`;
        menu += `├ 🔧 *Prefix* : ${isPrefixless ? 'None' : prefixDisplay}\n`;
        menu += `├ 📊 *Commands* : ${totalCommands}\n`;
        menu += `╰─┬────❍\n`;
        
        // ============================================================
        // COMMANDS BY CATEGORY - ICONS LOADED FROM COMMAND FILES
        // ============================================================
        
        for (const [category, commands] of commandsByCategory) {
            if (commands.length === 0) continue;
            
            const categoryIcon = getCategoryIcon(category);
            menu += `╭─┴─❍「 *${categoryIcon} ${category.toUpperCase()}* 」❍\n`;
            
            const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
            
            for (const cmd of sortedCommands) {
                if (cmd.ownerOnly && !isOwnerUser) continue;
                // Use icon from command file
                const cmdIcon = cmd.icon || '📌';
                menu += `│ ${cmdIcon} *${prefixDisplay}${cmd.name}*\n`;
            }
            menu += `╰──────❍\n`;
        }
        
        // About Section
        menu += `╭─┴─❍「 *📅 DATE & TIME* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `╰──────❍\n\n`;
        
        // Quote
        menu += `✨ *"${randomQuote}"* ✨\n\n`;
        
        // Footer
        
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @Stanytz1 | GitHub: Stanytz378_`;
        menu += `▰▰▰ *© ${botName.toUpperCase()} BY STANY TZ* ▰▰▰\n\n`;
        
        await sendStyledMessage(sock, chatId, menu, [sender], msg);
    }
};

export { updateCommandUsage };