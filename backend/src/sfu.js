import * as mediasoup from "mediasoup";

let worker;
let router;

const createWorker = async () => {

    worker = await mediasoup.createWorker();

    //console.log("Mediasoup worker created:", worker.pid);

    worker.on("died", () => {
        console.log("Mediasoup worker died");
        process.exit(1);
    });

    router = await worker.createRouter({
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000
            }
        ]
    });

    //console.log("Mediasoup router created:", router.id);

    return router;
};

const createTransport = async () => {

    const transport = await router.createWebRtcTransport({
        listenIps: [
            {
                ip: "127.0.0.1"
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    });

    //console.log("Mediasoup transport created:", transport.id);

    return transport;
};

export { createWorker, createTransport,router};