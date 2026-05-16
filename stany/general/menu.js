import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import { channelInfo, botImagePath, getForwardedMessage } from '../../stanytz/messageConfig.js';

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
// 50+ INSPIRATIONAL QUOTES
// ============================================================
const QUOTES = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Life is what happens when you're busy making other plans. - John Lennon",
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
    "The only limit to our realization of tomorrow is our doubts of today. - Franklin D. Roosevelt",
    "It does not matter how slowly you go as long as you do not stop. - Confucius",
    "Everything you've ever wanted is on the other side of fear. - George Addair",
    "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
    "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
    "If you want to live a happy life, tie it to a goal, not to people or things. - Albert Einstein",
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
    "Some people just need a high-five. In the face. With a chair.",
    "A day without sunshine is like, you know, night.",
    "The best way to predict the future is to create it.",
    "If you can't be a good example, then you'll just have to be a horrible warning.",
    "I'm not lazy. I'm on energy-saving mode.",
    "I don't need a hairstylist, my pillow gives me a new hairstyle every morning.",
    "I don't have a bad handwriting, I have my own font.",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The only person you are destined to become is the person you decide to be. - Ralph Waldo Emerson",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "The future depends on what you do today. - Mahatma Gandhi",
    "Don't let yesterday take up too much of today. - Will Rogers",
    "You learn more from failure than from success. Don't let it stop you. Failure builds character.",
    "The only way to achieve the impossible is to believe it is possible. - Charles Kingsleigh",
    "Happiness is not by chance, but by choice. - Jim Rohn",
    "Dream it. Wish it. Do it.",
    "Success doesn't come to you, you go to it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Make your own luck.",
    "Everything you can imagine is real. - Pablo Picasso",
    "Do what you can, with what you have, where you are. - Theodore Roosevelt",
    "Wake up with determination. Go to bed with satisfaction.",
    "Small steps every day lead to big results.",
    "Be stronger than your excuses.",
    "Your only limit is your mind.",
    "Progress, not perfection.",
    "Start where you are. Use what you have. Do what you can.",
    "Fall seven times, stand up eight.",
    "The secret of getting ahead is getting started. - Mark Twain"
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
                            description: command.description || 'No description',
                            icon: command.icon || '📌',
                            alias: command.alias || [],
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
    
    // Add menu command itself if not exists
    if (!categories.has('general')) {
        categories.set('general', []);
    }
    
    const menuExists = categories.get('general').some(cmd => cmd.name === 'menu');
    if (!menuExists) {
        categories.get('general').push({
            name: 'menu',
            description: 'Display main menu with all commands',
            icon: '📋',
            alias: ['help', 'commands'],
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
        'games': '🎲',
        'sticker': '🎨'
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
        
        // Update usage stats for menu command
        await updateCommandUsage('menu');
        
        // Get current date and time (East Africa Time)
        const now = moment().tz('Africa/Dar_es_Salaam');
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // Greeting based on time
        let greeting;
        if (time < '05:00:00') greeting = 'Good Early Morning 🌉';
        else if (time < '11:00:00') greeting = 'Good Morning 🌄';
        else if (time < '15:00:00') greeting = 'Good Afternoon 🏙️';
        else if (time < '18:00:00') greeting = 'Good Evening 🌅';
        else if (time < '19:00:00') greeting = 'Good Evening 🌃';
        else greeting = 'Good Night 🌌';
        
        // Get random quote
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        
        // Load commands and get top commands
        const commandsByCategory = await loadCommandsFromStany(STANY_DIR);
        const topCommands = getTopCommands(5);
        
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        // ============================================================
        // BUILD TOP MENU SECTION (Auto-tracked most used commands)
        // ============================================================
        let menu = `╭──❍「 *🔥 TOP MENU* 」❍\n`;
        
        if (topCommands.length > 0) {
            for (let i = 0; i < topCommands.length; i++) {
                const cmd = topCommands[i];
                const icon = getCommandIcon(cmd.name);
                menu += `│ ${icon} ${prefixDisplay}${cmd.name}: ${cmd.count} uses\n`;
            }
        } else {
            menu += `│ 📋 ${prefixDisplay}menu\n`;
            menu += `│ 🏓 ${prefixDisplay}ping\n`;
            menu += `│ 👑 ${prefixDisplay}owner\n`;
            menu += `│ 👥 ${prefixDisplay}group\n`;
            menu += `│ ⚙️ ${prefixDisplay}status\n`;
        }
        menu += `╰─┬────❍\n`;
        
        // ============================================================
        // USER INFO SECTION
        // ============================================================
        menu += `╭─┴─❍「 *👤 USER INFO* 」❍\n`;
        menu += `├ 🏷️ *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *Role* : ${isOwnerUser ? 'OWNER 👑' : 'USER 👤'}\n`;
        menu += `├ 💎 *Status* : ${isOwnerUser ? 'Premium ✨' : 'Free'}\n`;
        menu += `├ 📱 *Number* : ${sender.split('@')[0]}\n`;
        menu += `╰─┬────❍\n`;
        
        // ============================================================
        // BOT INFO SECTION
        // ============================================================
        let totalCommands = 0;
        for (const commands of commandsByCategory.values()) {
            totalCommands += commands.length;
        }
        
        menu += `╭─┴─❍「 *🤖 BOT INFO* 」❍\n`;
        menu += `├ 📛 *Name* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Developer* : STANY TZ\n`;
        menu += `├ 🌍 *Mode* : Public 24/7\n`;
        menu += `├ 🔧 *Prefix* : ${isPrefixless ? 'None' : prefixDisplay}\n`;
        menu += `├ 📊 *Commands* : ${totalCommands}+ plugins\n`;
        menu += `╰─┬────❍\n`;
        
        // ============================================================
        // COMMANDS BY CATEGORY - AUTO LOADED
        // ============================================================
        for (const [category, commands] of commandsByCategory) {
            if (commands.length === 0) continue;
            
            const categoryIcon = getCategoryIcon(category);
            menu += `╭─┴─❍「 *${categoryIcon} ${category.toUpperCase()}* 」❍\n`;
            
            const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
            let count = 0;
            
            for (const cmd of sortedCommands) {
                if (cmd.ownerOnly && !isOwnerUser) continue;
                if (count >= 15) {
                    menu += `│ 📌 +${commands.length - count} more...\n`;
                    break;
                }
                const cmdIcon = cmd.icon || '📌';
                const cmdDisplay = `${prefixDisplay}${cmd.name}`;
                const desc = cmd.description ? cmd.description.substring(0, 35) : 'No description';
                menu += `│ ${cmdIcon} ${cmdDisplay}\n`;
                menu += `│    📝 ${desc}\n`;
                count++;
            }
            menu += `╰──────❍\n`;
        }
        
        // ============================================================
        // ABOUT & STATS SECTION
        // ============================================================
        const stats = getTotalStats();
        menu += `╭─┴─❍「 *📊 STATISTICS* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `├ 📈 *Total Commands Used* : ${stats.total || 0}\n`;
        menu += `╰──────❍\n\n`;
        
        // ============================================================
        // QUOTE SECTION
        // ============================================================
        menu += `╭─❍「 *💭 QUOTE OF THE DAY* 」❍\n`;
        menu += `│\n`;
        menu += `│ ✨ *"${randomQuote}"* ✨\n`;
        menu += `│\n`;
        menu += `╰──────❍\n\n`;
        
        // ============================================================
        // FOOTER
        // ============================================================
        menu += `▰▰▰ *© ${botName.toUpperCase()} BY STANY TZ* ▰▰▰\n\n`;
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @STANYTZ | GitHub: Stanytz378_\n`;
        menu += `_💬 Channel: https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p_`;
        
        // ============================================================
        // SEND WITH IMAGE AND FORWARDED MARK
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
                console.log('✅ Menu sent with image and forwarded mark');
            } else {
                await sock.sendMessage(chatId, {
                    text: menu,
                    contextInfo: channelInfo.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
                console.log('✅ Menu sent with forwarded mark');
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
        'antidemote': '🛡️',
        'ban': '🔨',
        'add': '➕',
        'autoreact': '⚡',
        'autoview': '👁️',
        'status': '📊',
        'help': '❓'
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

// Export update function for other commands to use
export { updateCommandUsage };