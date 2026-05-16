// Channel/Newsletter Configuration for forwarded messages
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363404317544295@newsletter',  
            newsletterName: '✨ᴍᴅɪɴʏᴀɴᴇ ʙᴏᴛ💫',
            serverMessageId: -1
        }
    }
};

// Bot image path
const botImagePath = './stanytz/B803A026-2887-4715-8FE6-05E82D801427.png';

// Function to get message with channel forwarding
const getForwardedMessage = (text, additionalContext = {}) => {
    return {
        text: text,
        contextInfo: {
            ...channelInfo.contextInfo,
            ...additionalContext
        }
    };
};

export { channelInfo, botImagePath, getForwardedMessage };
