# Content Aggregator - Ubuntu Deployment & Frontend Integration Guide

This guide walks you through deploying your backend onto a fresh Ubuntu Server and connecting it to your frontend hosted on Vercel.

## 🚀 Part 1: Deploying the Backend on Ubuntu

We provide a robust script (`deploy_ubuntu.sh`) to fully automate the backend setup on a fresh Ubuntu server. The script handles:
- Installing Node.js & PostgreSQL
- Creating the database, user, and granting permissions.
- Automatically installing dependencies, generating Prisma client, and migrating the DB schema.
- Seeding the database with essential sources.
- Setting up **PM2** to keep your application alive across reboots.
- Opening the local firewall via `ufw`.

### Deployment Steps:

1. **SSH into your server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Upload/Clone your project codebase** to the server.
   *(Assuming you copy your files via git or SCP into a folder e.g., `/var/www/content-aggregator-backend`)*

3. **Navigate to your backend directory:**
   ```bash
   cd /path/to/content-aggregator-backend
   ```

4. **Make the deployment script executable:**
   ```bash
   chmod +x deploy_ubuntu.sh
   ```

5. **Run the script:**
   *(Must be run with root privileges)*
   ```bash
   sudo ./deploy_ubuntu.sh
   ```

6. **Monitor progress:**
   If the script aborts, it indicates automatically where it failed. Read the generated `deploy_*.log` for fine-grained debugging details regarding PostgreSQL, Prisma constraints, or NPM installation failures.

---

## 🔌 Part 2: Connecting the Vercel Frontend (Addressing Mixed Content)

Once deployed, your backend will be accessible via its public IP address (e.g., `http://YOUR_SERVER_IP:5000`).

### ⚠️ The HTTPS / Vercel "Mixed Content" Problem
Since your frontend is hosted on **Vercel**, it runs securely over **HTTPS**. Modern browsers enforce strict security policies that **block HTTP requests (like your IP address) originating from an HTTPS site**. This is called a "Mixed Content" error.

If you paste `http://YOUR_SERVER_IP:5000` into your Vercel frontend `.env` configuration, **it will fail silently or display CORS/Network errors in the browser console.**

### ✅ Solutions:

#### Option A: Use a Custom Domain & Free SSL (Recommended for Production)
This maps a domain name to your Ubuntu IP address and encrypts the connection so Vercel can communicate safely.
1. Buy or use a cheap/free Domain Name and point an `A Record` to `YOUR_SERVER_IP`.
2. Install **Nginx** and **Certbot** on your Ubuntu Server.
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```
3. Set up a reverse proxy in Nginx to forward port `80`/`443` to your app port `5000`.
4. Run `sudo certbot --nginx` to automatically provision an SSL certificate.
5. In Vercel, change your backend URL to: `https://api.yourdomain.com`

#### Option B: Cloudflare Tunnel (Free & No Domain required for quick setups)
Cloudflare handles the HTTPS encryption and tunnels it securely to your server's local HTTP port, giving you an automatic HTTPS URL.
1. Sign up for Cloudflare Zero Trust.
2. Follow instructions for "Cloudflared Tunnels", install the daemon on your Ubuntu server, and map it to `localhost:5000`.
3. Use the supplied Cloudflare secure URL (`https://your-tunnel.trycloudflare.com`) in your Vercel frontend.

#### Option C: For Development/Testing only (Not Recommended)
You can instruct your browser to temporarily allow mixed content bypassing security:
- **Chrome:** Click the padlock/settings icon in the URL bar on your Vercel site -> Site Settings -> Set "Insecure content" to "Allow".
- *Again, this only works locally for you, not other users.*

---

## 🛠 Troubleshooting Common Failures Handled by Script

- **PostgreSQL Collision:** If a database or user already exists, the script gracefully proceeds so it won’t crash.
- **Port Conflicts:** If `5000` is taken, edit `deploy_ubuntu.sh` variable `APP_PORT` to something else (like `5050`) before running.
- **Seeding Failures:** If `npm run seed` fails due to incorrect script mapping, the deployment script triggers a fallback to `npx prisma db seed`. Ensure your Prisma configurations (`prisma/seed.ts` or similar) are valid and no required parameters are missing.
