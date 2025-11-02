# WebSocket Setup Guide for Hostinger

## Overview
This guide explains how to set up and ensure WebSocket notifications work properly on Hostinger hosting for both backend and frontend.

## Backend WebSocket Server

### 1. Running the WebSocket Server

The WebSocket server is located at `backend/public/websocket.php`. It needs to run continuously as a background process.

#### Option A: Using PHP CLI with nohup (Recommended for Hostinger)
```bash
cd /path/to/your/backend/public
nohup php websocket.php > websocket.log 2>&1 &
```

#### Option B: Using screen/tmux for persistent session
```bash
# Start a screen session
screen -S websocket

# Navigate to your backend directory
cd /path/to/your/backend/public

# Run the WebSocket server
php websocket.php

# Detach: Press Ctrl+A then D
# Reattach: screen -r websocket
```

#### Option C: Using Supervisor (Best for production)
Create `/etc/supervisor/conf.d/websocket.conf`:
```ini
[program:websocket]
command=php /path/to/your/backend/public/websocket.php
directory=/path/to/your/backend/public
autostart=true
autorestart=true
stderr_logfile=/var/log/websocket.err.log
stdout_logfile=/var/log/websocket.out.log
user=your_username
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start websocket
```

### 2. Environment Configuration

Create or update `.env` file in your backend root:
```env
WS_HOST=0.0.0.0
WS_PORT=8080
```

**Important Notes:**
- `WS_HOST=0.0.0.0` allows connections from any IP
- Port 8080 is the default, but Hostinger might require a different port
- Check Hostinger firewall settings to ensure port 8080 is open

### 3. Port Configuration for Hostinger

Hostinger may restrict certain ports. If port 8080 doesn't work:

1. **Check available ports** - Contact Hostinger support or check your hosting panel
2. **Update `.env`** with the allowed port:
   ```env
   WS_PORT=8080  # or whatever port Hostinger allows
   ```
3. **Update frontend** - The frontend automatically uses port 8080, but if you change it, you may need to configure a WebSocket proxy

### 4. Firewall Configuration

Ensure the WebSocket port is open in Hostinger's firewall:
- Check your Hostinger control panel
- Look for firewall/security settings
- Allow inbound connections on port 8080 (or your chosen port)

## Frontend WebSocket Connection

The frontend automatically:
- Uses `wss://` (secure WebSocket) when on HTTPS
- Uses `ws://` when on HTTP
- Connects to: `wss://your-domain.com:8080` or `ws://your-domain.com:8080`
- Automatically retries with exponential backoff
- Falls back to API polling if WebSocket fails

### Connection URL Format
- **Production (HTTPS)**: `wss://orange-ferret-922211.hostingersite.com:8080`
- **Development (HTTP)**: `ws://localhost:8080`

## Troubleshooting

### WebSocket Connection Fails

1. **Check if server is running:**
   ```bash
   ps aux | grep websocket.php
   ```

2. **Check server logs:**
   ```bash
   tail -f websocket.log
   # or
   tail -f /var/log/websocket.out.log
   ```

3. **Test connection manually:**
   ```bash
   # Using wscat (install with: npm install -g wscat)
   wscat -c wss://your-domain.com:8080
   ```

4. **Check browser console** for WebSocket errors

5. **Verify port is accessible:**
   ```bash
   telnet your-domain.com 8080
   # or
   nc -zv your-domain.com 8080
   ```

### Common Issues

#### Issue: WebSocket connection refused
**Solution:**
- Ensure WebSocket server is running
- Check firewall allows port 8080
- Verify `WS_HOST` in `.env` is set to `0.0.0.0`

#### Issue: SSL/TLS handshake fails
**Solution:**
- Use `wss://` for HTTPS connections
- Ensure SSL certificate is valid
- Some hosting providers require WebSocket to use same SSL certificate

#### Issue: Connection times out
**Solution:**
- Check if port is blocked by Hostinger firewall
- Try a different port (8000, 8443, etc.)
- Contact Hostinger support to open the port

#### Issue: Notifications not appearing in real-time
**Solution:**
- Check WebSocket server is running and connected
- Check browser console for WebSocket errors
- Verify backend is creating notifications (check database)
- Check WebSocket server logs for errors

## Testing Notifications

### Test Project Assignment Notification
1. Assign a user to a project via the Projects page
2. The assigned user should receive: "You have been assigned to the project: [Project Name]"

### Test Expense Approval Notification
1. As admin/finance manager, approve an expense
2. The expense owner should receive: "Your expense of [amount] for [description] has been approved."

### Test Expense Rejection Notification
1. As admin/finance manager, reject an expense
2. The expense owner should receive: "Your expense of [amount] for [description] has been rejected."

## Fallback Mechanism

If WebSocket connection fails:
- Frontend automatically falls back to API polling every 10 seconds
- Notifications will still appear, just not in real-time
- Once WebSocket reconnects, real-time updates resume

## Production Recommendations

1. **Use Supervisor or PM2** for process management
2. **Set up monitoring** to restart WebSocket if it crashes
3. **Monitor WebSocket connections** and server load
4. **Use reverse proxy** (nginx) if needed for better WebSocket support
5. **Enable logging** for debugging connection issues

## Nginx Reverse Proxy (Optional)

If Hostinger allows nginx configuration, you can proxy WebSocket connections:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then update frontend to use: `wss://your-domain.com/ws`

## Verification Checklist

- [ ] WebSocket server is running (`ps aux | grep websocket`)
- [ ] Port 8080 is open in firewall
- [ ] `.env` file has correct `WS_HOST` and `WS_PORT`
- [ ] Frontend connects successfully (check browser console)
- [ ] Notifications appear in real-time when created
- [ ] Test project assignment notification
- [ ] Test expense approval/rejection notifications
- [ ] Fallback polling works if WebSocket fails

## Support

If issues persist:
1. Check WebSocket server logs
2. Check browser console for errors
3. Verify database has notification entries
4. Test WebSocket connection manually with wscat
5. Contact Hostinger support for port/firewall issues

