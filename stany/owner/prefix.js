/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';
import { config, updateConfig } from '../../stanycore/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        const imageFullPath = path.join(process.cwd(), botImagePath);
        const imageExists = fs.existsSync(imageFullPath);
        
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
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(imageFullPath),
                caption: text,
                contextInfo: forwardContext,
                mentions: mentions
            }, { quoted: quoted });
        } else {
            await sock.sendMessage(chatId, {
                text: text,
                contextInfo: forwardContext,
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

export default {
    name: 'prefix',
    description: 'Manage bot prefixes (multiple prefixes supported)',
    icon: '🔧',
    alias: ['setprefix', 'changeprefix', 'multiprefix'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Owner check
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) return;
        
        const action = args[0]?.toLowerCase();
        
        // Get current prefixes
        const currentPrefixes = config.prefixes || ['.'];
        const prefixlessStatus = config.prefixless ? '✅ ENABLED' : '❌ DISABLED';
        
        // Show current prefix settings
        if (!action || action === 'status') {
            const prefixList = currentPrefixes.map(p => {
                if (p === ' ') return '[SPACE]';
                if (p === '\\n') return '[NEWLINE]';
                return p;
            }).join(', ');
            
            const statusMsg = `╭──❍「 *🔧 MULTI-PREFIX CONFIGURATION* 」❍
├ 📝 *Active Prefixes* : ${currentPrefixes.length}
├ 🔧 *Prefixes* : ${prefixList}
├ 🔓 *Prefixless Mode* : ${prefixlessStatus}
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}prefix add <symbol> - Add prefix
│ 🔧 ${currentPrefix}prefix remove <symbol> - Remove prefix
│ 🔧 ${currentPrefix}prefix list - Show all prefixes
│ 🔧 ${currentPrefix}prefix clear - Remove all prefixes
│ 🔧 ${currentPrefix}prefix none - Enable prefixless mode
│ 🔧 ${currentPrefix}prefix reset - Reset to default (.)
╰──────❍
╭─┴─❍「 *📝 EXAMPLES* 」❍
│ • ${currentPrefix}prefix add ! - Add ! prefix
│ • ${currentPrefix}prefix add / - Add / prefix
│ • ${currentPrefix}prefix add 🔥 - Add fire emoji prefix
│ • ${currentPrefix}prefix remove / - Remove / prefix
╰──────❍

_📌 You can use ANY character or emoji as prefix!_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ADD PREFIX ==========
        if (action === 'add') {
            let newPrefix = args[1];
            
            if (!newPrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to add
├ 📝 *Usage* : ${currentPrefix}prefix add <symbol>
├ 📝 *Example* : ${currentPrefix}prefix add !
├ 📝 *Emoji Example* : ${currentPrefix}prefix add 🔥
╰──────❍`, [], msg);
                return;
            }
            
            // Handle special characters
            if (newPrefix === 'space') newPrefix = ' ';
            if (newPrefix === 'tab') newPrefix = '\t';
            if (newPrefix === 'newline') newPrefix = '\n';
            
            // Check if already exists
            let prefixes = [...currentPrefixes];
            if (prefixes.includes(newPrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Already Exists* : "${newPrefix}" is already a prefix
╰──────❍`, [], msg);
                return;
            }
            
            // Add new prefix
            prefixes.push(newPrefix);
            updateConfig({ 
                prefixes: prefixes,
                prefixless: false
            });
            
            const prefixDisplay = newPrefix === ' ' ? '[SPACE]' : newPrefix === '\t' ? '[TAB]' : newPrefix === '\n' ? '[NEWLINE]' : newPrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Added*
├ 🔧 *New Prefix* : ${prefixDisplay}
├ 📊 *Total Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍

_📌 You can now use ${prefixDisplay} before commands_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ========== REMOVE PREFIX ==========
        if (action === 'remove' || action === 'delete' || action === 'del') {
            let removePrefix = args[1];
            
            if (!removePrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to remove
├ 📝 *Usage* : ${currentPrefix}prefix remove <symbol>
├ 📝 *Example* : ${currentPrefix}prefix remove !
╰──────❍`, [], msg);
                return;
            }
            
            // Handle special characters
            if (removePrefix === 'space') removePrefix = ' ';
            if (removePrefix === 'tab') removePrefix = '\t';
            if (removePrefix === 'newline') removePrefix = '\n';
            
            let prefixes = [...currentPrefixes];
            
            if (!prefixes.includes(removePrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Not Found* : "${removePrefix}" is not an active prefix
╰──────❍`, [], msg);
                return;
            }
            
            // Don't allow removing last prefix
            if (prefixes.length === 1) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Cannot Remove* : You need at least one prefix
├ 📝 *Suggestion* : Use "${currentPrefix}prefix none" for prefixless mode
╰──────❍`, [], msg);
                return;
            }
            
            // Remove prefix
            prefixes = prefixes.filter(p => p !== removePrefix);
            updateConfig({ prefixes: prefixes });
            
            const prefixDisplay = removePrefix === ' ' ? '[SPACE]' : removePrefix === '\t' ? '[TAB]' : removePrefix === '\n' ? '[NEWLINE]' : removePrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Removed*
├ 🔧 *Removed* : ${prefixDisplay}
├ 📊 *Remaining Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍`, [], msg);
            return;
        }
        
        // ========== LIST PREFIXES ==========
        if (action === 'list') {
            const prefixList = currentPrefixes.map((p, i) => {
                if (p === ' ') return `${i + 1}. [SPACE]`;
                if (p === '\t') return `${i + 1}. [TAB]`;
                if (p === '\n') return `${i + 1}. [NEWLINE]`;
                return `${i + 1}. ${p}`;
            }).join('\n│ ');
            
            const listMsg = `╭──❍「 *🔧 ACTIVE PREFIXES* 」❍
│ ${prefixList}
╰─┬────❍
╭─┴─❍「 *📊 SUMMARY* 」❍
├ 📊 *Total Prefixes* : ${currentPrefixes.length}
├ 🔓 *Prefixless Mode* : ${prefixlessStatus}
╰──────❍

_📌 Commands work with ANY of these prefixes_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, listMsg, [], msg);
            return;
        }
        
        // ========== CLEAR ALL PREFIXES (except default) ==========
        if (action === 'clear') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Warning* : This will remove all prefixes
├ 📝 *Default prefix (.) will be added back*
├ ❓ *Confirm* : Use "${currentPrefix}prefix reset" to reset
╰──────❍`, [], msg);
            return;
        }
        
        // ========== ENABLE PREFIXLESS MODE ==========
        if (action === 'none' || action === 'off' || action === 'prefixless') {
            if (config.prefixless) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Prefixless Mode* : Already ENABLED
├ 📝 *Commands work without prefix*
╰──────❍`, [], msg);
                return;
            }
            
            updateConfig({ 
                prefixless: true
            });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefixless Mode* : ENABLED
├ 📝 *No prefix needed for commands*
├ 📝 *Example* : Type "menu" instead of ".menu"
├ 📝 *Note* : Prefixes still work if you want to use them
╰──────❍

_📌 All commands work without any prefix now_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ========== RESET TO DEFAULT ==========
        if (action === 'reset' || action === 'default') {
            // Reset to default single prefix (.)
            updateConfig({ 
                prefixes: ['.'],
                prefixless: false
            });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Reset*
├ 🔧 *Default Prefix* : .
├ 📊 *Total Prefixes* : 1
├ 📝 *Example* : .menu
╰──────❍

_📌 Prefix has been reset to default "."_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // Invalid command
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}prefix for help
╰──────❍`, [], msg);
    }
};