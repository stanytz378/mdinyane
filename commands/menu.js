import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'menu',
    description: 'Display main menu with all bot commands',
    alias: ['help', 'commands', 'listmenu', 'allmenu', 'h'],
    category: 'general',
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, jidManager, getCurrentPrefix, isPrefixless, store }) {
        
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || chatId;
        const isOwnerUser = isOwner(msg);
        
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
        
        // Quotes array
        const quotes = [
            "I'm not lazy, I'm just on my energy saving mode.",
            "Life is short, smile while you still have teeth.",
            "I may be a bad influence, but darn I am fun!",
            "I'm on a whiskey diet. I've lost three days already.",
            "Why don't some couples go to the gym? Because some relationships don't work out.",
            "I told my wife she should embrace her mistakes... She gave me a hug.",
            "I'm great at multitasking. I can waste time, be unproductive, and procrastinate all at once.",
            "You know you're getting old when you stoop to tie your shoelaces and wonder what else you could do while you're down there.",
            "I'm so good at sleeping, I can do it with my eyes closed.",
            "If you think nobody cares if you’re alive, try missing a couple of payments.",
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
            "The best way to predict the future is to create it."
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        // Get all commands grouped by category with icons
        const commandsByCategory = this.getCommandsByCategory();
        
        // Build menu
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        let menu = `╭──❍「 *TOP MENU* 」❍\n`;
        
        // Top 5 most used commands
        let topCommands = [];
        if (global.commandUsage) {
            topCommands = Object.entries(global.commandUsage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        }
        
        if (topCommands.length >= 5) {
            topCommands.forEach(([cmd, hits]) => {
                const cmdCategory = this.getCommandCategory(cmd);
                const icon = this.getCategoryIcon(cmdCategory);
                menu += `│${icon} ${prefixDisplay}${cmd}: ${hits} hits\n`;
            });
        } else {
            const defaultCmds = ['menu', 'ping', 'owner', 'group', 'status'];
            defaultCmds.forEach(cmd => {
                const cmdCategory = this.getCommandCategory(cmd);
                const icon = this.getCategoryIcon(cmdCategory);
                menu += `│${icon} ${prefixDisplay}${cmd}\n`;
            });
        }
        menu += `╰─┬────❍\n`;
        
        // User Info Section
        menu += `╭─┴─❍「 *USER INFO* 」❍\n`;
        menu += `├ 👤 *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *User* : ${isOwnerUser ? 'OWNER' : 'USER'}\n`;
        menu += `├ 💎 *Status* : ${isOwnerUser ? 'Premium' : 'Free'}\n`;
        menu += `╰─┬────❍\n`;
        
        // Bot Info Section
        menu += `╭─┴─❍「 *BOT INFO* 」❍\n`;
        menu += `├ 🤖 *App* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Owner* : STANY TZ\n`;
        menu += `├ 🌍 *Mode* : ${global.isPublic !== false ? 'Public' : 'Self'}\n`;
        menu += `├ 🔧 *Prefix* : ${isPrefixless ? 'None (Prefixless)' : prefixDisplay}\n`;
        menu += `╰─┬────❍\n`;
        
        // Commands by Category - Each command shows its category icon
        for (const [category, commands] of commandsByCategory) {
            if (commands.length === 0) continue;
            
            const categoryIcon = this.getCategoryIcon(category);
            menu += `╭─┴─❍「 *${categoryIcon} ${category.toUpperCase()}* 」❍\n`;
            
            const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
            let count = 0;
            
            for (const cmd of sortedCommands) {
                if (cmd.ownerOnly && !isOwnerUser) continue;
                if (count >= 15) {
                    menu += `│ 📌 +${commands.length - count} more...\n`;
                    break;
                }
                // Command icon based on its category
                const cmdIcon = this.getCategoryIcon(cmd.category || category);
                const cmdDisplay = `${prefixDisplay}${cmd.name}`;
                const desc = cmd.description ? cmd.description.substring(0, 35) : 'No description';
                menu += `│ ${cmdIcon} ${cmdDisplay}\n`;
                menu += `│    📝 ${desc}\n`;
                count++;
            }
            menu += `╰──────❍\n`;
        }
        
        // About Section
        menu += `╭─┴─❍「 *ABOUT* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `╰──────❍\n\n`;
        
        // Quote
        menu += `✨ *"${randomQuote}"* ✨\n\n`;
        
        // Footer
        menu += `▰▰▰ *© ${botName.toUpperCase()} BY STANY TZ* ▰▰▰\n\n`;
        
        // Help text
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @STANYTZ | GitHub: Stanytz378_`;
        
        // Send menu
        try {
            await sock.sendMessage(chatId, {
                text: menu,
                mentions: [sender]
            }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(chatId, {
                text: menu,
                mentions: [sender]
            });
        }
    },
    
    getCommandsByCategory() {
        const commandsPath = path.join(__dirname, '..');
        const categories = new Map();
        
        const scanDirectory = (dir, category = 'general') => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath, item);
                } else if (item.endsWith('.js') && item !== 'menu.js') {
                    try {
                        const command = this.loadCommand(fullPath);
                        if (command && command.name) {
                            const cmdCategory = command.category || category;
                            if (!categories.has(cmdCategory)) {
                                categories.set(cmdCategory, []);
                            }
                            categories.get(cmdCategory).push({
                                name: command.name,
                                description: command.description,
                                alias: command.alias || [],
                                ownerOnly: command.ownerOnly || false,
                                category: cmdCategory
                            });
                        }
                    } catch (err) {
                        console.error(`Error loading command from ${item}:`, err.message);
                    }
                }
            }
        };
        
        scanDirectory(commandsPath);
        
        if (!categories.has('general')) {
            categories.set('general', []);
        }
        
        const sortedCategories = new Map([...categories.entries()].sort());
        
        // Default commands
        const defaultCommands = [
            { name: 'menu', description: 'Show bot menu', category: 'general', ownerOnly: false },
            { name: 'ping', description: 'Check bot response time', category: 'general', ownerOnly: false },
            { name: 'owner', description: 'Bot owner information', category: 'general', ownerOnly: false }
        ];
        
        for (const defaultCmd of defaultCommands) {
            const category = defaultCmd.category;
            const exists = sortedCategories.get(category)?.some(cmd => cmd.name === defaultCmd.name);
            if (!exists) {
                if (!sortedCategories.has(category)) {
                    sortedCategories.set(category, []);
                }
                sortedCategories.get(category).push(defaultCmd);
            }
        }
        
        return sortedCategories;
    },
    
    getCommandCategory(commandName) {
        // Helper function to get category of a specific command
        const commandsPath = path.join(__dirname, '..');
        
        const findCommand = (dir) => {
            if (!fs.existsSync(dir)) return null;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    const result = findCommand(fullPath);
                    if (result) return result;
                } else if (item === `${commandName}.js` || item === `${commandName}.js`) {
                    try {
                        const command = this.loadCommand(fullPath);
                        if (command && command.name === commandName) {
                            return command.category || path.basename(dir);
                        }
                    } catch (err) {
                        return null;
                    }
                }
            }
            return null;
        };
        
        const category = findCommand(commandsPath);
        return category || 'general';
    },
    
    loadCommand(filePath) {
        try {
            const command = require(filePath);
            return command.default || command;
        } catch (err) {
            return null;
        }
    },
    
    getCategoryIcon(category) {
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
            'sticker': '🎨',
            'convert': '🔄',
            'search': '🔍',
            'education': '📚',
            'economy': '💰',
            'utility': '⚡',
            'moderation': '🔨',
            'information': 'ℹ️'
        };
        return icons[category.toLowerCase()] || '📌';
    }
};

// Auto reload
const file = require.resolve(import.meta.url);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[36m%s\x1b[0m', `🔄 Updated: ${__filename}`);
    delete require.cache[file];
});
