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

// Ensure usage stats file exists
if (!fs.existsSync(path.dirname(USAGE_STATS_FILE))) {
    fs.mkdirSync(path.dirname(USAGE_STATS_FILE), { recursive: true });
}
if (!fs.existsSync(USAGE_STATS_FILE)) {
    fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify({}, null, 2));
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "I may be a bad influence, but darn I am fun!",
    "I'm on a whiskey diet. I've lost three days already.",
    "Why don't some couples go to the gym? Because some relationships don't work out.",
    "I told my wife she should embrace her mistakes... She gave me a hug.",
    "I'm great at multitasking. I can waste time, be unproductive, and procrastinate all at once.",
    "You know you're getting old when you stoop to tie your shoelaces and wonder what else you could do while you're down there.",
    "I'm so good at sleeping, I can do it with my eyes closed.",
    "If you think nobody cares if you're alive, try missing a couple of payments.",
    "I used to think I was indecisive, but now I'm not so sure.",
    "If you can't convince them, confuse them.",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "I'm not clumsy, I'm just on a mission to test gravity.",
    "Life is like a box of chocolates; it doesn't last long if you're hungry.",
    "The early bird can have the worm because worms are gross and mornings are stupid.",
    "If life gives you lemons, make lemonade. Then find someone whose life has given them vodka and have a party!",
    "The road to success is always under construction.",
    "I am so clever that sometimes I don't understand a single word of what I am saying.",
    "A day without sunshine is like, you know, night.",
    "The best way to predict the future is to create it.",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
    "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "Happiness is not by chance, but by choice. - Jim Rohn",
    "Dream it. Wish it. Do it.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Small steps every day lead to big results.",
    "Be stronger than your excuses.",
    "Your only limit is your mind.",
    "Progress, not perfection.",
    "Fall seven times, stand up eight."
];

// ============================================================
// FUNCTION: Update command usage stats
// ============================================================
async function updateCommandUsage(commandName) {
    try {
        const stats = JSON.parse(fs.readFileSync(USAGE_STATS_FILE, 'utf8'));
        stats[commandName] = (stats[commandName] || 0) + 1;
        stats.total = (stats.total || 0) + 1;
        stats.lastUpdated = new Date().toISOString();
        fs.writeFileSync(USAGE_STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error('Error updating usage stats:', error);
    }
}

// ============================================================
// FUNCTION: Get top commands (most used)
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
    } catch (error) {
        return [];
    }
}

// ============================================================
// FUNCTION: Load commands automatically from stany folder
// ============================================================
async function loadCommandsFromStany(stanyPath) {
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
                            description: command.description || '',
                            icon: command.icon || '📌',
                            ownerOnly: command.ownerOnly || false
                        });
                    }
                } catch (err) {
                    console.error(`Error loading command from ${item}:`, err.message);
                }
            }
        }
    };
    
    await scanDirectory(stanyPath);
    
    if (!categories.has('general')) {
        categories.set('general', []);
    }
    
    const menuExists = categories.get('general').some(cmd => cmd.name === 'menu');
    if (!menuExists) {
        categories.get('general').push({
            name: 'menu',
            description: 'Show bot menu',
            icon: '📋',
            ownerOnly: false
        });
    }
    
    return new Map([...categories.entries()].sort());
}

// ============================================================
// FUNCTION: Get category icon
// ============================================================
function getCategoryIcon(category) {
    const icons = {
        'general': '🎯',
        'group': '👥',
        'automation': '⚙️',
        'owner': '👑',
        'admin': '🛡️',
        'tools': '🔧',
        'fun': '🎮',
        'media': '📷',
        'download': '⬇️',
        'ai': '🤖',
        'games': '🎲'
    };
    return icons[category.toLowerCase()] || '📁';
}

// ============================================================
// MAIN MENU COMMAND
// ============================================================
export default {
    name: 'menu',
    description: 'Display main menu with all bot commands',
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
        
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        
        const commandsByCategory = await loadCommandsFromStany(STANY_DIR);
        const topCommands = getTopCommands(5);
        
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        // ============================================================
        // BUILD MENU - STYLE KAMA ULIVYOONYESHA
        // ============================================================
        let menu = `╭──❍「 *TOP MENU* 」❍\n`;
        
        if (topCommands.length > 0) {
            for (let i = 0; i < Math.min(topCommands.length, 5); i++) {
                const cmd = topCommands[i];
                const icon = getCommandIcon(cmd.name);
                menu += `│${icon} ${prefixDisplay}${cmd.name}\n`;
            }
        } else {
            menu += `│📋 ${prefixDisplay}menu\n`;
            menu += `│🏓 ${prefixDisplay}ping\n`;
            menu += `│👑 ${prefixDisplay}owner\n`;
        }
        menu += `╰─┬────❍\n`;
        
        // USER INFO
        menu += `╭─┴─❍「 *USER INFO* 」❍\n`;
        menu += `├ 👤 *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *User* : ${isOwnerUser ? 'OWNER' : 'USER'}\n`;
        menu += `╰─┬────❍\n`;
        
        // BOT INFO
        menu += `╭─┴─❍「 *BOT INFO* 」❍\n`;
        menu += `├ 🤖 *App* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Owner* : STANY TZ\n`;
        menu += `├ 🌍 *Mode* : Public\n`;
        menu += `├ 🔧 *Prefix* : ${prefixDisplay}\n`;
        menu += `╰─┬────❍\n`;
        
        // COMMANDS BY CATEGORY
        for (const [category, commands] of commandsByCategory) {
            if (commands.length === 0) continue;
            
            const categoryIcon = getCategoryIcon(category);
            menu += `╭─┴─❍「 *${categoryIcon} ${category.toUpperCase()} COMMANDS* 」❍\n`;
            
            const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
            let count = 0;
            
            for (const cmd of sortedCommands) {
                if (cmd.ownerOnly && !isOwnerUser) continue;
                if (count >= 15) {
                    menu += `│ 📌 +${commands.length - count} more...\n`;
                    break;
                }
                const cmdIcon = cmd.icon || '📌';
                const desc = cmd.description ? ` - ${cmd.description}` : '';
                menu += `│ ${cmdIcon} ${prefixDisplay}${cmd.name}${desc}\n`;
                count++;
            }
            menu += `╰──────❍\n`;
        }
        
        // ABOUT SECTION
        menu += `╭─┴─❍「 *ABOUT* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `╰──────❍\n\n`;
        
        // QUOTE
        menu += `✨ *"${randomQuote}"* ✨\n\n`;
        
        // FOOTER
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @Stanytz1 | GitHub: Stanytz378_\n\n`;
        menu += `▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
        
        // ============================================================
        // SEND MESSAGE
        // ============================================================
        try {
            const imageFullPath = path.join(process.cwd(), botImagePath);
            const imageExists = fs.existsSync(imageFullPath);
            
            if (imageExists) {
                await sock.sendMessage(chatId, {
                    image: fs.readFileSync(imageFullPath),
                    caption: menu,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
                console.log('✅ Menu sent with image');
            } else {
                await sock.sendMessage(chatId, {
                    text: menu,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
                console.log('✅ Menu sent');
            }
        } catch (error) {
            console.error('Error sending menu:', error);
            await sock.sendMessage(chatId, {
                text: menu,
                mentions: [sender]
            }, { quoted: msg });
        }
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getCommandIcon(commandName) {
    const icons = {
        'menu': '📋',
        'ping': '🏓',
        'owner': '👑',
        'help': '❓',
        'antidemote': '🛡️',
        'ban': '🔨',
        'add': '➕',
        'autoreact': '⚡',
        'autoview': '👁️',
        'status': '📊'
    };
    return icons[commandName] || '📌';
}

function getTotalStats() {
    try {
        const stats = JSON.parse(fs.readFileSync(USAGE_STATS_FILE, 'utf8'));
        return { total: stats.total || 0 };
    } catch {
        return { total: 0 };
    }
}

export { updateCommandUsage };