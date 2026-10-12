
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import pkg from "agora-access-token";

const { RtcTokenBuilder } = pkg;

const generateAgoraToken = asyncHandler(async (req, res) => {
    const channelName = req.body?.channelName;

    if (!req.user) {
        throw new ApiError(401, "Unauthorized user");
    }

    if (!channelName) {
        throw new ApiError(400, "Channel name is required");
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        throw new ApiError(500, "Agora credentials are not configured");
    }

    const uid = 0;
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

    return res.status(200).json(
        new Apiresponse(200, "Agora token generated successfully", {
            appId,
            token,
            uid,
            channelName
        })
    );
});

export { generateAgoraToken };