import { RtcTokenBuilder, RtcRole } from "agora-access-token";

/**
 * Mediasoup को हटाकर Agora Token generate करने का फंक्शन
 * इससे C++ compilation और 8GB RAM memory error पूरी तरह खत्म हो जाएगी।
 */
const generateAgoraToken = (req, res) => {
    try {
        const channelName = req.query.channelName || req.body.channelName;
        
        if (!channelName) {
            return res.status(400).json({ error: "channelName is required" });
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate) {
            return res.status(500).json({ error: "Agora credentials not configured in environment variables" });
        }

        // User ID (0 for random / auto-assigned by Agora)
        const uid = 0; 
        const role = RtcRole.PUBLISHER;
        
        // Token expiration time (e.g., 2 hours = 7200 seconds)
        const expirationTimeInSeconds = 7200;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Build the token
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            role,
            privilegeExpiredTs
        );

        return res.status(200).json({ token, uid, channelName });
    } catch (error) {
        console.error("Error generating Agora token:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export { generateAgoraToken };