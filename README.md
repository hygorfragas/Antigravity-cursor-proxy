![Antigravity Proxy Banner](assets/banner.png)

> [!IMPORTANT]
> **Disclaimer: For Educational and Research Purposes Only.**
> This project is a proof-of-concept designed to demonstrate protocol translation and proxy logic. It is not intended for commercial use. The authors and contributors are not responsible for any misuse, account suspensions, or legal consequences resulting from the use of this software. Use at your own risk and in accordance with your service providers' Terms of Service.

# Antigravity Proxy for Cursor

A high-fidelity bridge that brings Google's latest **Gemini 3** and **Claude 4.5** models directly into your Cursor IDE with full Agentic and Composer support.

## Why Antigravity Proxy?
Google's advanced agentic models (internal versions of Gemini/Claude) use a specific protocol that standard OpenAI-compatible clients (like Cursor) cannot understand natively. This proxy:
1.  **Translates Protocols**: Converts OpenAI requests into Google's Agentic format.
2.  **Injects Thought Signatures**: Automatically handles the complex reasoning traces required for tool calling.
3.  **Bridges Authentication**: Securely extracts your local Cloud Code session tokens so you don't need manual API keys.

---

## 🛠️ How it Works

### Local mode (`npm start`)
When you run `npm start` locally, the engine launches two processes:
1.  **Local Proxy Server**: Runs on `localhost:3000`.
2.  **Cloudflare Quick Tunnel**: Creates a secure, temporary HTTPS bridge from the internet's edge directly to your local proxy.

> [!CAUTION]
> **Dynamic URLs**: Quick Tunnel mode generates a **fresh URL every restart**. Update Cursor whenever the terminal shows a new one.

### Production mode (Docker + cloudflared connector)
For Portainer/VPS setups with an existing **cloudflared connector** and custom DNS (e.g. `antigravity.flowkaze.com.br`), the container runs **only the proxy**. Your external connector routes HTTPS traffic to the container port on your local machine.

Published image: **`hygorfragas/antigravity-proxy:latest`**

---

## Prerequisites: The "Session Bridge"
For this proxy to work, it MUST be able to see your local Google authorization.
*   **Keep Antigravity/VS Code Logged In**: You must have the Google Cloud Code (Antigravity) extension installed and be **logged in** with your account.
*   **Active Session**: The proxy extracts tokens dynamically. If you sign out of the extension, the proxy will stop working until you sign back in.

---

## Setup Instructions

### Option A: Portainer + cloudflared connector (recommended for VPS/homelab)

Use this when you already have a **cloudflared connector** on your VPS routing subdomains of `flowkaze.com.br` to containers on your local machine.

#### 1. Configure DNS (if not already done)

In Cloudflare DNS, create a CNAME for your subdomain pointing to your tunnel:

```
antigravity.flowkaze.com.br  →  <tunnel-id>.cfargotunnel.com
```

#### 2. Add ingress rule on your cloudflared connector

On the VPS where your connector runs, add an ingress entry **before** the catch-all rule:

```yaml
ingress:
  - hostname: antigravity.flowkaze.com.br
    service: http://IP_DA_SUA_MAQUINA_LOCAL:3010
  # ... seus outros serviços (clinica.flowkaze.com.br, etc.)
  - service: http_status:404
```

> Replace `IP_DA_SUA_MAQUINA_LOCAL` with the LAN IP of the machine running Portainer (e.g. `192.168.1.50`). Port `3010` is the host port mapped to the container.

Restart/reload the connector after editing the config.

#### 3. Deploy stack in Portainer

1. Open **Portainer** → **Stacks** → **Add stack**
2. Name: `antigravity-proxy`
3. Paste the contents of [`portainer-stack.yml`](portainer-stack.yml)
4. Edit the volume path to your real `state.vscdb` file:

| Platform | Typical path |
|----------|--------------|
| macOS (Antigravity IDE) | `/Users/SEU_USUARIO/Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb` |
| macOS (Antigravity) | `/Users/SEU_USUARIO/Library/Application Support/Antigravity/User/globalStorage/state.vscdb` |
| Linux (Cursor) | `/home/SEU_USUARIO/.config/Cursor/User/globalStorage/state.vscdb` |

5. Adjust `PUBLIC_BASE_URL` if using a different subdomain
6. Deploy the stack

Or pull the image directly:

```bash
docker pull hygorfragas/antigravity-proxy:latest
```

#### 4. Verify

- Container logs should show: `Base URL for Cursor: https://antigravity.flowkaze.com.br/v1`
- Open `https://antigravity.flowkaze.com.br` in browser — you should see the proxy status page
- Test API: `curl https://antigravity.flowkaze.com.br/v1/models`

#### 5. Configure Cursor

1. Open **Cursor Settings** (`Cmd + Shift + J` or gear icon)
2. Go to **Models** → **OpenAI**
3. Enable **"Override OpenAI Base URL"**
4. Set Base URL to: `https://antigravity.flowkaze.com.br/v1`
5. API Key: any placeholder (e.g. `antigravity`) — auth comes from your local session
6. Restart Cursor

#### 6. Model Selection

In Cursor sidebar or Composer, select:
*   `ag-pro` — Gemini 3 Pro
*   `ag-flash` — Gemini 3 Flash
*   `ag-sonnet` — Claude 4.5 Sonnet
*   `ag-opus` — Claude 4.5 Opus
*   `ag-haiku` — Gemini 2.5 Lite

---

### Option B: Docker Compose (local build)

```bash
cp .env.example .env
# Edit AUTH_DB_HOST_PATH and PUBLIC_BASE_URL
docker compose up -d
```

---

### Option C: Local installation (Quick Tunnel)

#### 1. Installation
```bash
npm install
```

#### 2. Start the Proxy
```bash
npm start
```
Watch for the green rocket icon. Copy the **Base URL** (e.g., `https://random-words.trycloudflare.com/v1`).

#### 3. Configure Cursor
1. Open **Cursor Settings** (`Cmd + Shift + J` or Click the gear icon).
2. Go to **Models** > **OpenAI**.
3. **CRITICAL**: Enable the **"Override OpenAI Base URL"** toggle.
4. Paste your **New Base URL** into the field.
5. (Optional but Recommended) **Restart Cursor** to ensure the new networking configuration is fully picked up by the internal AI engine.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Internal proxy port |
| `AUTH_DB_PATH` | auto-detect | Path to `state.vscdb` inside the container |
| `ENABLE_QUICK_TUNNEL` | `true` (local), `false` (Docker) | Run embedded cloudflared quick tunnel |
| `PUBLIC_BASE_URL` | — | Public HTTPS URL shown in logs (e.g. `https://antigravity.flowkaze.com.br`) |
| `PROXY_HOST_PORT` | `3010` | Host port mapped in docker-compose |

---

## Publish Docker image (maintainers)

GitHub Actions workflow builds and pushes to Docker Hub on push to `main` or tags `v*`.

Required repository secrets:
- `DOCKERHUB_USERNAME` → `hygorfragas`
- `DOCKERHUB_TOKEN` → Docker Hub access token

Manual build:
```bash
docker build -t hygorfragas/antigravity-proxy:latest .
docker push hygorfragas/antigravity-proxy:latest
```

---

## ⚠️ Troubleshooting
*   **400 Error (Missing Thought Signature)**: Ensure you are running the latest version of this proxy.
*   **Invalid URL Error**: In Quick Tunnel mode, restart and copy the new URL. With external connector, verify DNS and ingress config.
*   **EADDRINUSE**: Run `lsof -t -i:3010 | xargs kill -9` or change `PROXY_HOST_PORT`.
*   **Docker: Auth status not found**: Verify the volume mount points to your real `state.vscdb` and you are logged into Antigravity/Cursor on the host.
*   **502 from Cloudflare**: Connector cannot reach your machine — check LAN IP, firewall, and that Portainer mapped port `3010`.
*   **Cursor cannot connect**: Confirm `https://SEU_SUBDOMINIO.flowkaze.com.br/v1/models` returns JSON in browser/curl.

---
*Created for the Antigravity Team. Powered by Google Deepmind.*
