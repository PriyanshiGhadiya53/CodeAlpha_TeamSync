import pkg from "agora-access-token";
const { RtcTokenBuilder } = pkg;

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

        const uid = 0; 
        // 1 represents RtcRole.PUBLISHER (Publisher role)
        const role = 1; 
        
        const expirationTimeInSeconds = 7200;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

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