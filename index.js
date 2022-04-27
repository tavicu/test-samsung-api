const ws        = require('ws');
const ipAddress = process.argv[2];

let data = {};
let token;
let socketBase, socket;

if (!ipAddress) {
    return console.error("\n\n" + 'IP address is missing! Example of running the script "node index.js 192.168.1.100"');
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || 3000));
}

function separator() {
    console.log("\n\n---------------------\n\n");
    return Promise.resolve();
}

function getToken() {
    console.log('baseWS - start');

    return new Promise(resolve => {
        socketBase = new ws(`wss://${ipAddress}:8002/api/v2/channels/samsung.remote.control?name=VGVzdCBTYW1zdW5nIEFQSQ==`, {
            servername: '',
            handshakeTimeout: 2000,
            rejectUnauthorized: false
        })
        .on('error', error => {
            console.log('baseWS - error', error, "\n");
            resolve();
        })
        .on('message', response => {
            response = JSON.parse(response);

            console.log('baseWS - message', response, "\n");

            if (response.data && response.data.token) {
                token = response.data.token;
            }

            if (response.event === 'ms.channel.connect') {
                resolve();
            }
        });
    })
    .finally(() => setTimeout(() => {
        console.log('baseWS - terminate');

        if (socketBase) {
            socketBase.terminate();
        }
    }, 1000));
}

function connect() {
    const endpoint = `wss://${ipAddress}:8002/api/v2/channels/com.samsung.art-app?name=VGVzdCBTYW1zdW5nIEFQSQ==&token=${token}`;
    console.log(`connect to socket - ${endpoint}`);

    return new Promise(resolve => {
        socket = new ws(endpoint, {
            servername: '',
            handshakeTimeout: 2000,
            rejectUnauthorized: false
        })
        .on('error', error => console.log('socket - error', error, "\n"))
        .on('open', () => console.log('socket - open', "\n"))
        .on('close', () => console.log('socket - closed', "\n"))
        .on('message', response => {
            response = JSON.parse(response);

            if (response.event === 'ms.channel.connect') {
                data = response.data;
            }

            console.log('socket - message', response, "\n");
        });

        resolve();
    });
}

function getStatus() {
    let body = {
        method : 'ms.channel.emit',
        params : {
            data  : JSON.stringify({
                id:  data.id || 'noop-id',
                request: 'get_artmode_status'
            }),
            to    : 'host',
            event : 'art_app_request'
        }
    };

    console.log('socket - send getStatus', body, "\n");

    return socket.send(JSON.stringify(body), error => {
        if (error) console.log('socket - send getStatus - error', error);
    });
}

function manual() {
    return new Promise(resolve => {
        console.log('In the folowing 30 seconds please try to change the Art Mode on your TV with the phisical remote.');
        console.log('Doing that should show some debugs regarding the status change.', "\n");

        setTimeout(resolve, 30 * 1000);
    });
}

function close() {
    console.log('socket - terminate');
    if (socket) socket.terminate();
}

separator()
    .then(getToken).then(delay).then(separator)
    .then(connect).then(delay).then(separator)
    .then(getStatus).then(delay).then(separator)
    .then(manual).then(delay).then(separator)
    .then(close).then(delay)
    .then(() => {
        console.log("Please copy everything and share it on your Issue :)");
    });
