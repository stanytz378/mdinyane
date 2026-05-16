/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *****************************************************************************/

import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import { fileURLToPath } from 'url';
import { channelInfo, botImagePath } from '../../stanytz/messageConfig.js';
import isOwner from '../../stanymain/isOwner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const DATA_DIR = path.join(process.cwd(), 'stanydata');
const ANTICALL_FILE = path.join(DATA_DIR, 'anticall.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
    "I'm not lazy, I'm just on my energy saving mode.",
    "Life is short, smile while you still have teeth.",
    "Calls? Blocked! 📵",
    "No calls allowed on my watch!",
    "Anti-call is active, stay text only! 💬",
    "Calls are so 2010, we text here! ✉️",
    "Silence is golden, calls are denied! 🔕",
    "Protecting your privacy, one call at a time! 🛡️"
];

const getRandomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

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
// ANTICALL STATE FUNCTIONS
// ============================================================

async function readState() {
    try {
        if (fs.existsSync(ANTICALL_FILE)) {
            const data = JSON.parse(fs.readFileSync(ANTICALL_FILE, 'utf8'));
            return { enabled: data.enabled || false };
        }
        return { enabled: false };
    } catch {
        return { enabled: false };
    }
}

async function writeState(enabled) {
    try {
        fs.writeFileSync(ANTICALL_FILE, JSON.stringify({ enabled: !!enabled, updatedAt: new Date().toISOString() }, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing anticall state:', error);
        return false;
    }
}

// ============================================================
// CALL HANDLER (for index.js)
// ============================================================

export async function handleCall(sock, calls) {
    try {
        const state = await readState();
        if (!state.enabled) return;
        
        const blockedCallers = new Set();
        
        for (const call of calls) {
            const callerJid = call.from || call.peerJid || call.chatId;
            if (!callerJid) continue;
            
            // Check if already blocked in this session
            if (blockedCallers.has(callerJid)) continue;
            
            try {
                // Reject the call
                if (typeof sock.rejectCall === 'function' && call.id) {
                    await sock.rejectCall(call.id, callerJid);
                } else if (typeof sock.sendCallOfferAck === 'function' && call.id) {
                    await sock.sendCallOfferAck(call.id, callerJid, 'reject');
                }
                
                // Send warning message
                await sock.sendMessage(callerJid, {
                    text: `╭──❍「 *📵 ANTICALL PROTECTION* 」❍
├ 🔔 *Call* : Rejected
├ 🚫 *Status* : You have been blocked
├ 📝 *Reason* : Anti-call system is enabled
╰──────❍

_📌 This bot does not accept calls. Please text instead._
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`,
                    contextInfo: channelInfo.contextInfo
                });
                
                // Block the caller
                await sock.updateBlockStatus(callerJid, 'block');
                blockedCallers.add(callerJid);
                
                console.log(`📵 Blocked caller: ${callerJid.split('@')[0]}`);
                
            } catch (error) {
                console.error('Error handling call:', error.message);
            }
        }
    } catch (error) {
        console.error('Error in anticall handler:', error);
    }
}

// ============================================================
// MAIN COMMAND
// ============================================================

export default {
    name: 'anticall',
    description: 'Enable or disable auto-blocking of incoming calls',
    icon: '📵',
    alias: ['acall', 'callblock', 'blockcalls'],
    category: 'owner',
    ownerOnly: true,
    
    async execute(sock, msg, args, currentPrefix, { BOT_NAME, VERSION, isOwner, jidManager }) {
        
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || chatId;
        
        // Check if owner
        const ownerCheck = await isOwner(senderId, jidManager);
        if (!ownerCheck.isOwner) {
            const notAuthMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ 👤 *User* : @${senderId.split('@')[0]}
├ ❌ *Error* : Owner only command!
╰──────❍

_📌 This command is only for bot owner_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, notAuthMsg, [senderId], msg);
            return;
        }
        
        // Get current time
        const now = moment().tz('Africa/Dar_es_Salaam');
        const date = now.format('DD/MM/YYYY');
        const day = now.format('dddd');
        const time = now.format('HH:mm:ss');
        
        const state = await readState();
        const randomQuote = getRandomQuote();
        const botName = BOT_NAME || 'MDINYANE';
        
        const action = args[0]?.toLowerCase();
        
        // ========== SHOW STATUS (default) ==========
        if (!action || action === 'status') {
            const statusIcon = state.enabled ? '✅' : '❌';
            const statusText = state.enabled ? 'ENABLED' : 'DISABLED';
            
            const statusMsg = `╭──❍「 *📵 ANTICALL PROTECTION* 」❍
├ 📵 *Status* : ${statusIcon} ${statusText}
├ 💾 *Storage* : File System
╰─┬────❍
╭─┴─❍「 *📋 COMMANDS* 」❍
│ 🔧 ${currentPrefix}anticall on - Enable anticall
│ 🔧 ${currentPrefix}anticall off - Disable anticall
│ 🔧 ${currentPrefix}anticall status - Show status
╰──────❍
╭─┴─❍「 *📊 INFO* 」❍
├ 📅 *Date* : ${date}
├ 📆 *Day* : ${day}
├ ⏰ *Time* : ${time} EAT
├ 🔒 *Effect* : Calls rejected & caller blocked
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 When enabled, all incoming calls will be rejected and callers will be blocked_
▰▰▰ *©️ ${botName.toUpperCase()} BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, statusMsg, [], msg);
            return;
        }
        
        // ========== ENABLE ==========
        if (action === 'on') {
            if (state.enabled) {
                const alreadyMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ ⚠️ *Status* : Already ENABLED
├ 📝 *Note* : Anti-call is already active
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyMsg, [], msg);
                return;
            }
            
            await writeState(true);
            
            const enableMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ ✅ *Status* : ENABLED
├ 📝 *Effect* : Incoming calls will be rejected
├ 🚫 *Action* : Callers will be blocked
╰──────❍

✨ *"${randomQuote}"* ✨

_📌 All incoming calls will now be automatically rejected and the caller will be blocked_
▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, enableMsg, [], msg);
            return;
        }
        
        // ========== DISABLE ==========
        if (action === 'off') {
            if (!state.enabled) {
                const alreadyOffMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ ⚠️ *Status* : Already DISABLED
├ 📝 *Note* : Anti-call is already inactive
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
                await sendStyledMessage(sock, chatId, alreadyOffMsg, [], msg);
                return;
            }
            
            await writeState(false);
            
            const disableMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ ❌ *Status* : DISABLED
├ 📝 *Effect* : Incoming calls will be allowed
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
            await sendStyledMessage(sock, chatId, disableMsg, [], msg);
            return;
        }
        
        // ========== INVALID COMMAND ==========
        const invalidMsg = `╭──❍「 *📵 ANTICALL* 」❍
├ ❌ *Invalid command* : ${action}
├ 📝 *Use* : ${currentPrefix}anticall for help
╰──────❍

▰▰▰ *©️ MDINYANE BY STANY TZ* ▰▰▰`;
        await sendStyledMessage(sock, chatId, invalidMsg, [], msg);
    }
};

// Export for use in index.js
export { readState, writeState, handleCall };
