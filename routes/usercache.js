const fs = require('fs');
const readline = require('readline');

class UserCache {
    constructor() {
        this.users = new Map();
        this.loadCache();
    }

    saveUser(ip, username) {
        let cachedUser = this.users.get(ip);
        if (!cachedUser) {
            this.users.set(ip, {ip: ip, username: username});
            fs.appendFile('users.txt', ip + "," + username + "\n", (err) => {
                if (err) throw err;
                console.log("saved user " + username + " @ " + ip);
            });
        } else if (cachedUser.username !== username) {
            this.users.set(ip, {ip: ip, username: username});
            this.reloadCache();
            console.log("updated IP " + ip + " to " + username);
        }
    }

    async loadCache() {
        const fileStream = fs.createReadStream('users.txt');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        
        for await (const line of rl) {
            let splitline = line.split(",");
            this.users.set(splitline[0], {ip: splitline[0], username: line.length > 1 ? splitline[1] : null});
        }
    }

    reloadCache() {
        fs.writeFile('users.txt', Array.from(this.users.values()).map((user) => user.ip + "," + user.username).join("\n") + "\n", (err) => {
            if (err) throw err;
            console.log("reloaded user cache!");
        })
    }
}

module.exports = UserCache;