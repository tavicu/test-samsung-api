const ws        = require('ws');
const fetch     = require('node-fetch');
const ipAddress = process.argv[2];

let socketBase, socketArt;

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

function getInfo() {
    console.log('getInfo - start');

    return fetch(`http://${ipAddress}:8001/api/v2/`, {
        timeout: 2000
    })
    .then(body => body.json())
    .then(response => {
        response.isSupport = JSON.parse(response.isSupport);

        console.log('getInfo - response', response);
    }).catch(error => {
        console.log('getInfo - error', error);
    });
};


function testBaseWs() {
    console.log('testBaseWs - start');

    return new Promise(resolve => {
        socketBase = new ws(`wss://${ipAddress}:8002/api/v2/channels/samsung.remote.control?name=VGVzdCBTYW1zdW5nIEFQSQ==`, {
            servername: '',
            handshakeTimeout: 2000,
            rejectUnauthorized: false
        })
        .on('error', error => {
            console.log('testBaseWs - error', error, "\n");
            resolve();
        })
        .on('message', response => {
            response = JSON.parse(response);

            resolve();
            console.log('testBaseWs - message', response, "\n");
        });
    }).then(() => {
        console.log('testBaseWs - send command');

        return socketBase.send(JSON.stringify({
            method : 'ms.remote.control',
            params : {
                Cmd          : 'Click',
                DataOfCmd    : 'KEY_VOLUP',
                Option       : false,
                TypeOfRemote : 'SendRemoteKey'
            }
        }), error => {
            console.log('testBaseWs - send command - error', error);
        });
    })
    .then(delay)
    .finally(() => setTimeout(() => {
        console.log('testBaseWs - terminate');

        if (socketBase) {
            socketBase.terminate();
        }
    }, 1000));
}


function testArtWs() {
    console.log('testArtWs - start');

    return new Promise(resolve => {
        socketArt = new ws(`ws://${ipAddress}:8001/api/v2/channels/com.samsung.art-app?name=VGVzdCBTYW1zdW5nIEFQSQ==`, {
            servername: '',
            handshakeTimeout: 2000,
            rejectUnauthorized: false
        })
        .on('error', error => {
            console.log('testArtWs - error', error, "\n");
            resolve();
        })
        .on('message', response => {
            response = JSON.parse(response);

            resolve();
            console.log('testArtWs - message', response, "\n");
        });
    }).then(() => {
        console.log('testArtWs - send getStatus');

        return socketArt.send(JSON.stringify({
            method : 'ms.channel.emit',
            params : {
                data  : JSON.stringify({
                    id:  'noop-id',
                    request: 'get_artmode_status'
                }),
                to    : 'host',
                event : 'art_app_request'
            }
        }), error => {
            console.log('testArtWs - send getStatus - error', error);
        });
    })
    .then(delay)
    .finally(() => setTimeout(() => {
        console.log('testArtWs - terminate');

        if (socketArt) {
            socketArt.terminate();
        }
    }, 1000));
}

separator()
    .then(getInfo)
    .then(separator)
    .then(delay)
    .then(testBaseWs)
    .then(delay)
    .then(separator)
    .then(testArtWs)
    .then(delay)
    .then(separator)
    .then(() => {
        console.log("Please copy everything and share it on your Issue :)");
    });
