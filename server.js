const express = require("express");
const fs = require("fs");
const JSZip = require("jszip");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/generate", async (req, res) => {
    const { coin, wallet, worker } = req.body;

    if (!coin || !wallet || !worker) {
        return res.status(400).send("Thiếu dữ liệu");
    }

    const zip = new JSZip();
    const coinDir = path.join(__dirname, "coin");
    const zipCoin = zip.folder("coin");

    // -----------------------------------
    // 1. Copy toàn bộ thư mục coin/ (kể cả xmrig.exe)
    // -----------------------------------
    function addFolder(src, dest) {
        const list = fs.readdirSync(src);

        list.forEach(item => {
            const fullPath = path.join(src, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                addFolder(fullPath, dest.folder(item));
            } else {
                dest.file(item, fs.readFileSync(fullPath));
            }
        });
    }
    addFolder(coinDir, zipCoin);

    // -----------------------------------
    // 2. Ghi đè coin.cmd full
    // -----------------------------------
    const cmdFull = `:: Example batch file for mining Monero at a pool
::
:: Format:
::	xmrig.exe -o <pool address>:<pool port> -u <pool username/wallet> -p <pool password>
::
:: Fields:
::	pool address		The host name of the pool stratum or its IP address, for example pool.hashvault.pro
::	pool port 		The port of the pool's stratum to connect to, for example 3333. Check your pool's getting started page.
::	pool username/wallet 	For most pools, this is the wallet address you want to mine to. Some pools require a username
::	pool password 		For most pools this can be just 'x'. For pools using usernames, you may need to provide a password as configured on the pool.
::
:: List of Monero mining pools:
::	https://miningpoolstats.stream/monero
::
:: Choose pools outside of top 5 to help Monero network be more decentralized!
:: Smaller pools also often have smaller fees/payout limits.

cd /d "%~dp0"
xmrig.exe -o rx.unmineable.com:3333 -a rx -k -u ${coin}:${wallet}.${worker} -p x
pause
`;
    zipCoin.file("coin.cmd", cmdFull);

    // -----------------------------------
    // 3. Ghi đè config.json full
    // -----------------------------------
    const configPath = path.join(coinDir, "config.json");
    let configText = fs.readFileSync(configPath, "utf8");

    configText = configText
        .replace(/"id": null/, `"id": "${worker}"`)
        .replace(/"worker-id": null/, `"worker-id": "${worker}"`)
        .replace(/"user": "YOUR_WALLET_ADDRESS"/, `"user": "${wallet}"`)
        .replace(/"coin": null/, `"coin": "${coin}"`)
        .replace(/"rig-id": null/, `"rig-id": "${worker}"`);

    zipCoin.file("config.json", configText);

    // -----------------------------------
    // 4. Xuất ZIP
    // -----------------------------------
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

    res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=coin_pack.zip"
    });

    res.send(zipBuf);
});

app.listen(3000, () =>
    console.log("Server chạy tại http://localhost:3000")
);
