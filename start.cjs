const { spawn } = require('child_process');
const path = require('path');

const TUNNEL_TOKEN = ''; // No longer used for Quick Tunnels
const PROXY_PORT = Number(process.env.PORT) || 3000;

console.log('--- Starting Antigravity Proxy & Persistent Tunnel ---');

// 1. Start Proxy Server
const proxy = spawn('node', ['proxy.cjs'], {
    stdio: 'inherit',
    cwd: __dirname
});

// 2. Start Cloudflare Tunnel (Quick mode for random reliable URL)
const cloudflaredPath = path.join(__dirname, 'cloudflared');
const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PROXY_PORT}`], {
    cwd: __dirname
});

let urlFound = false;
tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    // process.stderr.write(`[Tunnel Log] ${output}`); // Optional: keep logs hidden unless needed

    // Scrape the URL from the Cloudflare logs
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (urlMatch && !urlFound) {
        urlFound = true;
        console.log('\n🚀 Antigravity Proxy is LIVE!');
        console.log('--------------------------------------------------');
        console.log(`Base URL for Cursor: ${urlMatch[0]}/v1`);
        console.log('--------------------------------------------------\n');
    }
});

tunnel.on('close', (code) => {
    console.log(`Tunnel process exited with code ${code}`);
    process.exit(code);
});

proxy.on('close', (code) => {
    console.log(`Proxy process exited with code ${code}`);
    if (tunnel) tunnel.kill();
    process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    proxy.kill();
    tunnel.kill();
    process.exit();
});
