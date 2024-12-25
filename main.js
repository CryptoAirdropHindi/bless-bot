const fs = require('fs').promises;
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

const apiBaseUrl = "https://gateway-run.bls.dev/api/v1";
const ipServiceUrl = "https://ipinfo.io/json";
let useProxy;

async function loadFetch() {
    const fetch = await import('node-fetch').then(module => module.default);
    return fetch;
}

async function readProxies() {
    const data = await fs.readFile('proxy.txt', 'utf-8');
    const proxies = data.trim().split('\n').filter(proxy => proxy);
    return proxies;
}

async function readNodeAndHardwareIds() {
    const data = await fs.readFile('id.txt', 'utf-8');
    const ids = data.trim().split('\n').filter(id => id).map(id => {
        const [nodeId, hardwareId] = id.split(':');
        return { nodeId, hardwareId };
    });
    return ids;
}

async function readAuthToken() {
    const data = await fs.readFile('user.txt', 'utf-8');
    return data.trim();
}

async function promptUseProxy() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question('Do you want to use a proxy? (y/n): ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

async function fetchIpAddress(fetch, agent) {
    const response = await fetch(ipServiceUrl, {
        headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
        },
        agent,
    });
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] IP fetch response:`, data?.ip);
    return data?.ip || '0.0.0.0';
}
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomHardwareInfo() {
    const cpuArchitectures = ["x86_64", "ARM64", "x86"];
    const cpuModels = [
        "Intel Core i7-10700K CPU @ 3.80GHz",
        "AMD Ryzen 5 5600G with Radeon Graphics",
        "Intel Core i5-10600K CPU @ 4.10GHz",
        "AMD Ryzen 7 5800X",
        "Intel Core i9-10900K CPU @ 3.70GHz",
        "AMD Ryzen 9 5900X",
        "Intel Core i3-10100 CPU @ 3.60GHz",
        "AMD Ryzen 3 3300X",
        "Intel Core i7-9700K CPU @ 3.60GHz",
    ];
    const cpuFeatures = ["mmx", "sse", "sse2", "sse3", "ssse3", "sse4_1", "sse4_2", "avx", "avx2", "fma"];
    const numProcessors = [4, 6, 8, 12, 16];
    const memorySizes = [8 * 1024 ** 3, 16 * 1024 ** 3, 32 * 1024 ** 3, 64 * 1024 ** 3];

    const randomCpuFeatures = Array.from({ length: Math.floor(Math.random() * cpuFeatures.length) + 1 }, () =>
        getRandomElement(cpuFeatures)
    );

    return {
        cpuArchitecture: getRandomElement(cpuArchitectures),
        cpuModel: getRandomElement(cpuModels),
        cpuFeatures: [...new Set(randomCpuFeatures)],
        numOfProcessors: getRandomElement(numProcessors),
        totalMemory: getRandomElement(memorySizes),
        extensionVersions: "0.1.7"
    };
}


async function registerNode(nodeId, hardwareId, ipAddress, proxy) {
    const fetch = await loadFetch();
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const registerUrl = `${apiBaseUrl}/nodes/${nodeId}`;
    console.log(`[${new Date().toISOString()}] Registering node with IP: ${ipAddress}, Hardware ID: ${hardwareId}`);

    const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"
        },
        body: JSON.stringify({
            ipAddress,
            hardwareId,
            hardwareInfo: generateRandomHardwareInfo(),
            extensionVersion: "0.1.7"
        }),
        agent
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        const text = await response.text();
        console.error(`[${new Date().toISOString()}] Failed to parse JSON. Response text:`, text);
        throw error;
    }

    console.log(`[${new Date().toISOString()}] Registration response:`, data);
    return data;
}

async function startSession(nodeId, proxy) {
    const fetch = await loadFetch();
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const startSessionUrl = `${apiBaseUrl}/nodes/${nodeId}/start-session`;
    console.log(`[${new Date().toISOString()}] Starting session for node ${nodeId}, it might take a while...`);
    const response = await fetch(startSessionUrl, {
        method: "POST",
        headers: {
            Accept: "*/*",
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"

        },
        agent
    });
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Start session response:`, data);
    return data;
}
async function stopSession(nodeId, proxy) {
    const fetch = await loadFetch();
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const stopSessionUrl = `${apiBaseUrl}/nodes/${nodeId}/stop-session`;
    console.log(`[${new Date().toISOString()}] stoping session for node ${nodeId}, it might take a while...`);
    const response = await fetch(stopSessionUrl, {
        method: "POST",
        headers: {
            Accept: "*/*",
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"

        },
        agent
    });
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] stop session response:`, data);
    return data;
}
async function pingNode(nodeId, proxy, ipAddress, isB7SConnected = false) {
    const fetch = await loadFetch();
    const chalk = await import('chalk');
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const pingUrl = `${apiBaseUrl}/nodes/${nodeId}/ping`;
    console.log(`[${new Date().toISOString()}] Pinging node ${nodeId} using proxy ${proxy}`);
    const response = await fetch(pingUrl, {
        method: "POST",
        headers: {
            Accept: "*/*",
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"
        },
        body: JSON.stringify({ isB7SConnected }),
        agent
    });
    const data = await response.json();

    const logMessage = `[${new Date().toISOString()}] Ping response, NodeID: ${chalk.default.green(nodeId)}, Status: ${chalk.default.yellow(data.status)}, Proxy: ${proxy}, IP: ${ipAddress}`;
    console.log(logMessage);

    return data;
}

async function checkNode(nodeId, proxy) {

    const fetch = await loadFetch();
    const chalk = await import('chalk');
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }
    const checkNodeUrl = `${apiBaseUrl}/nodes/${nodeId}`;
    console.log(`[${new Date().toISOString()}] Checking node ${nodeId} using proxy ${proxy}`);

    const response = await fetch(checkNodeUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"
        },
        agent,
    });
    const data = await response.json();
    const todayReward = data?.todayReward || 0;
    const isConnected = data?.isConnected || false;
    const logMessage = `[${new Date().toISOString()}] node Check response, NodeID: ${chalk.default.green(nodeId)}, Today Rewards: ${chalk.default.yellow(todayReward)}, is Connected: ${isConnected}`;
    console.log(logMessage);
    return isConnected;
}

async function heathCheck(nodeId, proxy) {

    const fetch = await loadFetch();
    const chalk = await import('chalk');
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }
    const checkUrl = `https://gateway-run.bls.dev/health`;;
    console.log(`[${new Date().toISOString()}] Checking Health node ${nodeId} using proxy ${proxy}`);

    const response = await fetch(checkUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${authToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "origin": "chrome-extension://pljbjcehnhcnofmkdbjolghdcjnmekia",
            "x-extension-version": "0.1.7"
        },
        agent,
    });
    const data = await response.json();
    const logMessage = `[${new Date().toISOString()}] Health Check response, NodeID: ${chalk.default.green(nodeId)}, Status: ${chalk.default.yellow(data.status)}, Proxy: ${proxy}`;
    console.log(logMessage);
    return data;
}
async function displayHeader() {
    console.log("");
    console.log(` ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗  █████╗ ██╗██████╗ ██████╗ ██████╗  ██████╗ ██████╗ ██╗  ██╗██╗███╗   ██╗██████╗ ██╗`);
    console.log(`██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗██║██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║  ██║██║████╗  ██║██╔══██╗██║`);
    console.log(`██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║███████║██║██████╔╝██║  ██║██████╔╝██║   ██║██████╔╝███████║██║██╔██╗ ██║██║  ██║██║`);
    console.log(`██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║██╔══██║██║██╔══██╗██║  ██║██╔══██╗██║   ██║██╔═══╝ ██╔══██║██║██║╚██╗██║██║  ██║██║`);
    console.log(`╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝██║  ██║██║██║  ██║██████╔╝██║  ██║╚██████╔╝██║     ██║  ██║██║██║ ╚████║██████╔╝██║`);
    console.log(` ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝`);
    console.log(`                                                                                                                                        `);
    console.log(`                 Running Blockless Node BETA CLI Version             `);
    console.log(`                https://t.me/Crypto_airdropHM *** https://github.com/CryptoAirdropHindi                `);
    console.log("");
}


let activeNodes = [];

process.on('SIGINT', async () => {
    console.log(`[${new Date().toISOString()}] Graceful shutdown initiated.`);
    await shutdownAllNodes();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received. Shutting down.`);
    await shutdownAllNodes();
    process.exit(0);
});

async function shutdownAllNodes() {
    const promises = activeNodes.map(async ({ nodeId, proxy }) => {
        try {
            const stopSessionResponse = await stopSession(nodeId, proxy);
            console.log(`[${new Date().toISOString()}] Session stopped for nodeId: ${nodeId}. Response:`, stopSessionResponse);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error stopping session for nodeId: ${nodeId}. Error:`, error.message);
        }
    });

    await Promise.all(promises);
}

async function processNode(nodeId, hardwareId, proxy, ipAddress) {
    activeNodes.push({ nodeId, proxy });
    let isConnected = false;
    try {
        console.log(`[${new Date().toISOString()}] Processing nodeId: ${nodeId}, hardwareId: ${hardwareId}, IP: ${ipAddress}`);

        const registrationResponse = await registerNode(nodeId, hardwareId, ipAddress, proxy);
        console.log(`[${new Date().toISOString()}] Node registration completed for nodeId: ${nodeId}. Response:`, registrationResponse);

        const startSessionResponse = await startSession(nodeId, proxy);
        console.log(`[${new Date().toISOString()}] Session started for nodeId: ${nodeId}. Response:`, startSessionResponse);

        isConnected = await checkNode(nodeId, proxy);
        console.log(`[${new Date().toISOString()}] Sending initial ping for nodeId: ${nodeId}`);
        await pingNode(nodeId, proxy, ipAddress, isConnected);

        const pingInterval = setInterval(async () => {
            try {
                console.log(`[${new Date().toISOString()}] Sending ping for nodeId: ${nodeId}`);
                await pingNode(nodeId, proxy, ipAddress);
                isConnected = await checkNode(nodeId, proxy);
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error during ping for nodeId: ${nodeId}: ${error.message}`);
                clearInterval(pingInterval);
            }
        }, 10 * 60 * 1000);

        const healthCheckInterval = setInterval(async () => {
            try {
                console.log(`[${new Date().toISOString()}] Sending Health Check for nodeId: ${nodeId}`);
                await heathCheck(nodeId, proxy);

                console.log(`[${new Date().toISOString()}] Checking connection status for nodeId: ${nodeId}`);
                isConnected = await checkNode(nodeId, proxy);

                if (!isConnected) {
                    clearInterval(pingInterval);
                    clearInterval(healthCheckInterval);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error during Health Check for nodeId: ${nodeId}: ${error.message}`);
            }
        }, 60 * 1000);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error occurred for nodeId: ${nodeId}, restarting process: ${error.message}`);
    }
}
//
async function runAll(initialRun = true) {
    try {
        if (initialRun) {
            await displayHeader();
            useProxy = await promptUseProxy();
        }

        const ids = await readNodeAndHardwareIds();
        const proxies = await readProxies();

        if (useProxy && proxies.length < ids.length) {
            throw new Error((await import('chalk')).default.yellow(`Number of proxies (${proxies.length}) does not match number of nodeId:hardwareId pairs (${ids.length})`));
        }

        for (let i = 0; i < ids.length; i++) {
            const { nodeId, hardwareId } = ids[i];
            const proxy = useProxy ? proxies[i] : null;
            const ipAddress = useProxy ? await fetchIpAddress(await loadFetch(), proxy ? new HttpsProxyAgent(proxy) : null) : null;

            await processNode(nodeId, hardwareId, proxy, ipAddress);
        }
    } catch (error) {
        const chalk = await import('chalk');
        console.error(chalk.default.yellow(`[${new Date().toISOString()}] An error occurred: ${error.message}`));
    }
}

runAll();
