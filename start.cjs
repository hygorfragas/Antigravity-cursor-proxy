const { spawn } = require('child_process');
const path = require('path');

const PROXY_PORT = Number(process.env.PORT) || 3000;
const ENABLE_QUICK_TUNNEL = process.env.ENABLE_QUICK_TUNNEL !== 'false';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');

console.log('--- Starting Antigravity Proxy ---');

if (ENABLE_QUICK_TUNNEL) {
    console.log('Mode: Cloudflare Quick Tunnel');
} else {
    console.log('Mode: External tunnel (cloudflared connector)');
}

const proxy = spawn('node', ['proxy.cjs'], {
    stdio: 'inherit',
    cwd: __dirname
});

let tunnel = null;

function printLiveMessage(baseUrl) {
    console.log('\n🚀 Antigravity Proxy is LIVE!');
    console.log('--------------------------------------------------');
    console.log(`Base URL for Cursor: ${baseUrl}/v1`);
    console.log('--------------------------------------------------\n');
}

if (ENABLE_QUICK_TUNNEL) {
    const cloudflaredPath = path.join(__dirname, 'cloudflared');
    tunnel = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PROXY_PORT}`], {
        cwd: __dirname
    });

    let urlFound = false;
    tunnel.stderr.on('data', (data) => {
        const output = data.toString();
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !urlFound) {
            urlFound = true;
            printLiveMessage(urlMatch[0]);
        }
    });

    tunnel.on('close', (code) => {
        console.log(`Tunnel process exited with code ${code}`);
        process.exit(code);
    });
} else {
    setTimeout(() => {
        const baseUrl = PUBLIC_BASE_URL || `http://localhost:${PROXY_PORT}`;
        printLiveMessage(baseUrl);
    }, 1500);
}

proxy.on('close', (code) => {
    console.log(`Proxy process exited with code ${code}`);
    if (tunnel) tunnel.kill();
    process.exit(code);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    proxy.kill();
    if (tunnel) tunnel.kill();
    process.exit();
});
