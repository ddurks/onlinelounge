Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();

    return [this.getFullYear(),
            (mm>9 ? '' : '0') + mm,
            (dd>9 ? '' : '0') + dd
            ].join('');
};

class Leaderboard {
    constructor() {
        this.coins = [];
        this.kills = [],
        this.deaths = [],
        this.date = new Date().yyyymmdd();
        this.fillNull();
    }

    fillNull() {
        for(let i = 0; i < 5; i++) {
            this.coins.push({
                username: "",
                number: 0
            });
            this.kills.push({
                username: "",
                number: 0
            });
            this.deaths.push({
                username: "",
                number: 0
            });
        }

        Object.entries(this).forEach(([propName, list]) => {
            if (propName !== "date") {
                list = list.sort((a, b) => a.number > b.number ? 1 : -1);
            }
        })
    }

    checkForReset() {
        if (new Date().yyyymmdd() !== this.date) {
            return new Leaderboard();
        } else {
            return this;
        }
    }

    addStats(statline, updateCallback) {
        Object.entries(statline.stats).forEach(([statName, stat]) => {
            if(stat >= this[statName][0].number) {
                this.insertIntoList(statline, updateCallback);
            }
        });
    }

    insertIntoList(statline, updateCallback) {
        let updated = false;
        Object.entries(statline.stats).forEach(([statName, statNumber]) => {
            for (let [i, currentStatline] of this[statName].entries()){
                if (currentStatline.ip === statline.ip) {
                    if (currentStatline.number < statNumber) {
                        currentStatline.number = statNumber;
                        updated = true;
                    }
                    if (currentStatline.username !== statline.username) {
                        currentStatline.username = statline.username;
                        updated = true;
                    }
                    while (i + 1 < this[statName].length) {
                        if (this[statName][i].number > this[statName][i+1].number) {
                            updated = true;
                            [this[statName][i], this[statName][i+1]] = [this[statName][i+1], this[statName][i]]
                        }
                        i++;
                    }
                    if (updated) {
                        updateCallback();
                        updated = false;
                    }
                    return;
                }
            };
            for (let i = this[statName].length-1; i >=0; i--) {
                if (statNumber > this[statName][i].number) {
                    updated = true;
                    for (let j = 0; j < i; j++) {
                        this[statName][j] = this[statName][j+1];
                    }
                    this[statName][i] = {
                        username: statline.username,
                        ip: statline.ip,
                        number: statNumber
                    }
                    if (updated) {
                        updateCallback();
                    }
                    return;
                }
            }
        });
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = Leaderboard