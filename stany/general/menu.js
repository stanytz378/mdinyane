import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STANY_DIR = path.join(__dirname, '..'); // This is the 'stany' folder

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
        
        // Get current date and time (East Africa Time)
        const now = moment().tz('Africa/Dar_es_Salaam');
        const day = now.format('dddd');
        const date = now.format('DD/MM/YYYY');
        const time = now.format('HH:mm:ss');
        
        // Greeting
        let greeting;
        if (time < '05:00:00') greeting = 'Good Early Morning 🌉';
        else if (time < '11:00:00') greeting = 'Good Morning 🌄';
        else if (time < '15:00:00') greeting = 'Good Afternoon 🏙️';
        else if (time < '18:00:00') greeting = 'Good Evening 🌅';
        else if (time < '19:00:00') greeting = 'Good Evening 🌃';
        else greeting = 'Good Night 🌌';
        
        // Quotes
        const quotes = [
            "I'm not lazy, I'm just on my energy saving mode.",
            "Life is short, smile while you still have teeth.",
            "I may be a bad influence, but darn I am fun!",
            "I'm on a whiskey diet. I've lost three days already.",
            "Why don't some couples go to the gym? Because some relationships don't work out.",
            "Life is like a box of chocolates; it doesn't last long if you're hungry.",
            "The early bird can have the worm because worms are gross and mornings are stupid.",
            "If life gives you lemons, make lemonade. Then find someone whose life has given them vodka and have a party!",
            "The road to success is always under construction.",
            "I am so clever that sometimes I don't understand a single word of what I am saying.",
            "A day without sunshine is like, you know, night.",
            "The best way to predict the future is to create it."
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        // Get all commands from stany folder
        const commandsData = await this.loadAllCommandsFromStany();
        const commandsByCategory = this.groupCommandsByCategory(commandsData);
        
        // Build menu
        const prefixDisplay = isPrefixless ? '' : currentPrefix;
        const botName = BOT_NAME || 'MDINYANE';
        
        let menu = `╭──❍「 *TOP MENU* 」❍\n`;
        
        // Top commands
        let topCommands = [];
        if (global.commandUsage) {
            topCommands = Object.entries(global.commandUsage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        }
        
        if (topCommands.length >= 5) {
            topCommands.forEach(([cmd, hits]) => {
                const cmdData = commandsData.find(c => c.name === cmd);
                const icon = cmdData?.icon || '📌';
                menu += `│${icon} ${prefixDisplay}${cmd}: ${hits} hits\n`;
            });
        } else {
            const defaultCmds = ['menu', 'ping', 'owner', 'group', 'status'];
            defaultCmds.forEach(cmd => {
                const cmdData = commandsData.find(c => c.name === cmd);
                const icon = cmdData?.icon || '📌';
                menu += `│${icon} ${prefixDisplay}${cmd}\n`;
            });
        }
        menu += `╰─┬────❍\n`;
        
        // User Info
        menu += `╭─┴─❍「 *USER INFO* 」❍\n`;
        menu += `├ 👤 *Name* : ${msg.pushName || 'No Name'}\n`;
        menu += `├ 👑 *User* : ${isOwnerUser ? 'OWNER' : 'USER'}\n`;
        menu += `├ 💎 *Status* : ${isOwnerUser ? 'Premium' : 'Free'}\n`;
        menu += `╰─┬────❍\n`;
        
        // Bot Info
        menu += `╭─┴─❍「 *BOT INFO* 」❍\n`;
        menu += `├ 🤖 *App* : ${botName}\n`;
        menu += `├ 📌 *Version* : ${VERSION}\n`;
        menu += `├ 👨‍💻 *Owner* : STANY TZ\n`;
        menu += `├ 🌍 *Mode* : ${global.isPublic !== false ? 'Public' : 'Self'}\n`;
        menu += `├ 🔧 *Prefix* : ${isPrefixless ? 'None (Prefixless)' : prefixDisplay}\n`;
        menu += `╰─┬────❍\n`;
        
        // Commands by Category
        for (const [category, commands] of commandsByCategory) {
            if (commands.length === 0) continue;
            
            const categoryIcon = commands[0]?.icon || this.getCategoryDefaultIcon(category);
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
        
        // About
        menu += `╭─┴─❍「 *ABOUT* 」❍\n`;
        menu += `├ 📅 *Date* : ${date}\n`;
        menu += `├ 📆 *Day* : ${day}\n`;
        menu += `├ ⏰ *Time* : ${time} EAT\n`;
        menu += `╰──────❍\n\n`;
        
        // Quote
        menu += `✨ *"${randomQuote}"* ✨\n\n`;
        
        // Footer
        menu += `▰▰▰ *© ${botName.toUpperCase()} BY STANY TZ* ▰▰▰\n\n`;
        menu += `_📌 Use ${prefixDisplay}help <command> for detailed info_\n`;
        menu += `_🎯 YouTube: @STANYTZ | GitHub: Stanytz378_`;
        
        // Send with image if exists
        try {
            const imageFullPath = path.join(process.cwd(), 'stanytz', 'bot_image.png');
            if (fs.existsSync(imageFullPath)) {
                await sock.sendMessage(chatId, {
                    image: fs.readFileSync(imageFullPath),
                    caption: menu,
                    contextInfo: channelInfo?.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, {
                    text: menu,
                    contextInfo: channelInfo?.contextInfo,
                    mentions: [sender]
                }, { quoted: msg });
            }
        } catch (error) {
            await sock.sendMessage(chatId, {
                text: menu,
                mentions: [sender]
            }, { quoted: msg });
        }
    },
    
    async loadAllCommandsFromStany() {
        const commandsList = [];
        
        // Add menu command itself
        commandsList.push({
            name: 'menu',
            description: 'Display main menu with all commands',
            icon: '📋',
            category: 'general',
            alias: ['help', 'commands'],
            ownerOnly: false
        });
        
        const scanDirectory = async (dir, parentCategory = null) => {
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
                            const category = command.category || parentCategory || 'general';
                            commandsList.push({
                                name: command.name,
                                description: command.description || 'No description',
                                icon: command.icon || '📌',
                                category: category,
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
        
        await scanDirectory(STANY_DIR);
        
        // Remove duplicates
        const uniqueCommands = new Map();
        for (const cmd of commandsList) {
            if (!uniqueCommands.has(cmd.name)) {
                uniqueCommands.set(cmd.name, cmd);
            }
        }
        
        return Array.from(uniqueCommands.values());
    },
    
    groupCommandsByCategory(commandsData) {
        const categories = new Map();
        
        for (const cmd of commandsData) {
            const category = cmd.category || 'general';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(cmd);
        }
        
        return new Map([...categories.entries()].sort());
    },
    
    getCategoryDefaultIcon(category) {
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
};

// Auto reload
const file = require.resolve(import.meta.url);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[36m%s\x1b[0m', `🔄 Updated: ${__filename}`);
    delete require.cache[file];
});
