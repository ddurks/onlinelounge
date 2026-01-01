#!/bin/bash

# Stop any existing PM2 processes
pm2 stop onlinelounge 2>/dev/null || true

# Build frontend
cd public
npx webpack --mode production
cd ../

# Setup iptables port forwarding (80 -> 3000, 443 -> 3000)
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 3000

# Start server with PM2
pm2 start npm --name "onlinelounge" -- start

# Save PM2 process list
pm2 save

echo "OnlineLounge started successfully!"
echo "View logs: pm2 logs onlinelounge"
echo "Monitor: pm2 monit"