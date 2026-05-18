/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import { config, updateConfig } from '../../stanycore/config.js';
import { channelInfo } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

async function sendStyledMessage(sock, chatId, text, mentions = [], quoted = null) {
    try {
        await sock.sendMessage(chatId, {
            text: text,
            contextInfo: channelInfo.contextInfo,
            mentions: mentions
        }, { quoted: quoted });
    } catch (error) {
        await sock.sendMessage(chatId, { text: text, mentions: mentions }, { quoted: quoted });
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
        
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [senderId], msg);
            return;
        }
        
        const action = args[0]?.toLowerCase();
        const currentPrefixes = config.prefixes || ['.'];
        const prefixlessStatus = config.prefixless ? '✅ ENABLED' : '❌ DISABLED';
        
        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-GB');
        
        // ============================================================
        // SHOW STATUS (default)
        // ============================================================
        if (!action || action === 'status') {
            const prefixList = currentPrefixes.map(p => {
                if (p === ' ') return '[SPACE]';
                if (p === '\\n') return '[NEWLINE]';
                if (p === '\\t') return '[TAB]';
                return p;
            }).join(', ');
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX SETTINGS* 」❍
├ 📝 *Active Prefixes* : ${currentPrefixes.length}
├ 🔧 *Prefixes* : ${prefixList}
├ 🔓 *Prefixless Mode* : ${prefixlessStatus}
├ 📅 *Date* : ${date}
├ ⏰ *Time* : ${time}
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
│ 🔹 ${currentPrefix}prefix add !
│ 🔹 ${currentPrefix}prefix add /
│ 🔹 ${currentPrefix}prefix add 🔥
│ 🔹 ${currentPrefix}prefix remove /
│ 🔹 ${currentPrefix}prefix none
│ 🔹 ${currentPrefix}prefix reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // ADD PREFIX
        // ============================================================
        if (action === 'add') {
            let newPrefix = args[1];
            
            if (!newPrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to add
├ 📝 *Example* : ${currentPrefix}prefix add !
├ 📝 *Example* : ${currentPrefix}prefix add 🔥
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            // Handle special characters
            if (newPrefix === 'space') newPrefix = ' ';
            if (newPrefix === 'tab') newPrefix = '\t';
            if (newPrefix === 'newline') newPrefix = '\n';
            
            let prefixes = [...currentPrefixes];
            
            if (prefixes.includes(newPrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Already Exists* : "${newPrefix}" is already a prefix
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            prefixes.push(newPrefix);
            updateConfig({ prefixes: prefixes, prefixless: false });
            
            const displayPrefix = newPrefix === ' ' ? '[SPACE]' : newPrefix === '\t' ? '[TAB]' : newPrefix === '\n' ? '[NEWLINE]' : newPrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Added* : ${displayPrefix}
├ 📊 *Total Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // REMOVE PREFIX
        // ============================================================
        if (action === 'remove' || action === 'delete' || action === 'del') {
            let removePrefix = args[1];
            
            if (!removePrefix) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Error* : Please provide a prefix to remove
├ 📝 *Example* : ${currentPrefix}prefix remove !
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            if (removePrefix === 'space') removePrefix = ' ';
            if (removePrefix === 'tab') removePrefix = '\t';
            if (removePrefix === 'newline') removePrefix = '\n';
            
            let prefixes = [...currentPrefixes];
            
            if (!prefixes.includes(removePrefix)) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Not Found* : "${removePrefix}" is not an active prefix
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            if (prefixes.length === 1) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Cannot Remove Last Prefix*
├ 📝 *Suggestion* : Use "${currentPrefix}prefix none" for prefixless mode
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            prefixes = prefixes.filter(p => p !== removePrefix);
            updateConfig({ prefixes: prefixes });
            
            const displayPrefix = removePrefix === ' ' ? '[SPACE]' : removePrefix === '\t' ? '[TAB]' : removePrefix === '\n' ? '[NEWLINE]' : removePrefix;
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Removed* : ${displayPrefix}
├ 📊 *Remaining Prefixes* : ${prefixes.length}
├ 📝 *Active Prefixes* : ${prefixes.join(', ')}
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // LIST PREFIXES
        // ============================================================
        if (action === 'list') {
            let listText = `╭──❍「 *🔧 ACTIVE PREFIXES* 」❍\n`;
            for (let i = 0; i < currentPrefixes.length; i++) {
                const p = currentPrefixes[i];
                let display = p;
                if (p === ' ') display = '[SPACE]';
                if (p === '\t') display = '[TAB]';
                if (p === '\n') display = '[NEWLINE]';
                listText += `│ ${i + 1}. ${display}\n`;
            }
            listText += `├ 📊 *Total* : ${currentPrefixes.length}\n`;
            listText += `├ 📅 *Date* : ${date}\n`;
            listText += `├ ⏰ *Time* : ${time}\n`;
            listText += `╰──────❍\n`;
            listText += `▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            
            await sendStyledMessage(sock, chatId, listText, [], msg);
            return;
        }
        
        // ============================================================
        // CLEAR ALL PREFIXES
        // ============================================================
        if (action === 'clear') {
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Warning* : This will remove all prefixes
├ 📝 *Default prefix (.) will be added back*
├ ❓ *Confirm* : Use "${currentPrefix}prefix reset" to reset
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // ENABLE PREFIXLESS MODE
        // ============================================================
        if (action === 'none' || action === 'off' || action === 'prefixless') {
            if (config.prefixless) {
                await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ⚠️ *Prefixless Mode* : Already ENABLED
├ 📝 *Commands work without prefix*
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
                return;
            }
            
            updateConfig({ prefixless: true });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefixless Mode* : ENABLED
├ 📝 *No prefix needed for commands*
├ 📝 *Example* : Type "menu" instead of ".menu"
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // RESET TO DEFAULT
        // ============================================================
        if (action === 'reset' || action === 'default') {
            updateConfig({ prefixes: ['.'], prefixless: false });
            
            await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ✅ *Prefix Reset*
├ 🔧 *Default Prefix* : .
├ 📊 *Total Prefixes* : 1
├ 📝 *Example* : .menu
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
            return;
        }
        
        // ============================================================
        // INVALID COMMAND
        // ============================================================
        await sendStyledMessage(sock, chatId, `╭──❍「 *🔧 PREFIX* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}prefix for help
╰──────❍
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`, [], msg);
    }
};