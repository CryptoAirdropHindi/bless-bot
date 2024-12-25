const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
//
function getRandomHardwareIdentifier() {
    const randomCpuArchitecture = Math.random() > 0.5 ? 'x64' : 'x86';
    const randomCpuModel = `Fake CPU Model ${Math.floor(Math.random() * 1000)}`;
    const randomNumOfProcessors = Math.floor(Math.random() * 8) + 1;
    const randomTotalMemory = Math.floor(Math.random() * 16 + 1) * 1024 * 1024 * 1024;

    const cpuInfo = {
        cpuArchitecture: randomCpuArchitecture,
        cpuModel: randomCpuModel,
        numOfProcessors: randomNumOfProcessors,
        totalMemory: randomTotalMemory
    };

    return Buffer.from(JSON.stringify(cpuInfo)).toString('base64');
}

async function generateDeviceIdentifier() {
    const hardwareIdentifier = getRandomHardwareIdentifier();
    const deviceInfo = JSON.stringify({ hardware: hardwareIdentifier });
    const hash = crypto.createHash('sha256');
    hash.update(deviceInfo);
    return hash.digest('hex');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    const chalk = (await import('chalk')).default;

    console.log(chalk.red.bold('This is only for testing purposes, I do not recommend using it'));

    rl.question(chalk.cyan('How many identifiers do you want to generate? '), async (answer) => {
        const total = parseInt(answer);
        let output = '';

        for (let i = 0; i < total; i++) {
            const deviceIdentifier = await generateDeviceIdentifier();

            const logEntry = `Device Identifier ${i + 1}: ${chalk.green(deviceIdentifier)}\n`;
            const formattedEntry = `input-publicKey-from-extension:${deviceIdentifier}\n`;
            output += formattedEntry;
            console.log(logEntry);
        }

        fs.writeFileSync('id.txt', output);
        console.log(chalk.yellow('Data saved to id.txt'));

        rl.close();
    });
}

main();
