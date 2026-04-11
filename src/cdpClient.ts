// @ts-ignore
import CDP from 'chrome-remote-interface';
import { config } from './config.js';
import { getUniversalHook } from './hooks.js';
import * as http from 'http';

export class RuishuCdpClient {
    private client: CDP.Client | null = null;
    private targetId: string = "";
    public nodeInterceptQueue: any[] = [];
    private pendingResponseCount = 0;
    private static MAX_QUEUE_LENGTH = 500;
    private static MAX_PENDING_RESPONSES = 50;

    /**
     * Ruishu exclusive filtering: Only intercept requests whose URL contains Ruishu dynamic token parameters.
     * Ruishu token features: 5-12 purely alphanumeric key + 40+ chars ciphertext value.
     * For example: ?GoHnnqm0=0NpBERq... or ?rcwCQitg=06vTOkG...
     */
    private static isRuishuRequest(url: string): boolean {
        if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('chrome')) return false;
        try {
            // URL provided by CDP is usually absolute, but relative paths may appear in edge cases
            // Use 'http://placeholder' as base fallback, only used to parse searchParams
            const u = url.includes('://') ? new URL(url) : new URL(url, 'http://placeholder');
            let found = false;
            u.searchParams.forEach((value, key) => {
                if (config.ruishu.tokenKeyPattern.test(key) && value.length > config.ruishu.tokenMinValueLength) {
                    found = true;
                }
            });
            return found;
        } catch(e) { return false; }
    }

    // Ruishu dynamic token purifier: automatically strip encrypted parameters like GoHnnqm0, restore plaintext URL
    private static stripRuishuParam(rawUrl: string): string {
        try {
            // URL parsing fallback consistent with isRuishuRequest
            const u = rawUrl.includes('://') ? new URL(rawUrl) : new URL(rawUrl, 'http://placeholder');
            const keysToRemove: string[] = [];
            u.searchParams.forEach((value, key) => {
                // Ruishu dynamic token features: use centralized config values
                if (config.ruishu.tokenKeyPattern.test(key) && value.length > config.ruishu.tokenMinValueLength) {
                    keysToRemove.push(key);
                }
            });
            keysToRemove.forEach(k => u.searchParams.delete(k));
            return u.origin + u.pathname + u.search;
        } catch(e) { return rawUrl; }
    }

    public async connect(urlKeyword: string, host: string, port: number): Promise<string> {
        // [Security]: Validate host to prevent URL injection attacks from malicious AI input
        if (!config.hostValidationPattern.test(host)) {
            throw new Error(`Invalid host "${host}": only IP addresses and hostnames are allowed.`);
        }
        if (port < 1 || port > 65535 || !Number.isInteger(port)) {
            throw new Error(`Invalid port "${port}": must be an integer between 1-65535.`);
        }

        if (this.client) {
            try { await this.client.close(); } catch(e) { /* Old connection might be disconnected, ignore */ }
        }
        // [Fix point]: Clear old queue when switching targets to prevent returning outdated data
        this.nodeInterceptQueue = [];
        this.pendingResponseCount = 0;

        const targetsUrl = `http://${host}:${port}/json`;
        try {
            const targetsData: any[] = await new Promise((resolve, reject) => {
                http.get(targetsUrl, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        // [Fix point]: Fault-tolerant parsing to prevent uncaught exceptions if Chrome returns non-JSON
                        try {
                            resolve(JSON.parse(data));
                        } catch (parseErr) {
                            reject(new Error(`Invalid JSON from Chrome debug port: ${data.substring(0, 200)}`));
                        }
                    });
                }).on('error', reject);
            });

            let target = null;
            for (const t of targetsData) {
                if (t.type === 'page' && (!urlKeyword || t.url.includes(urlKeyword))) {
                    if (!t.url.startsWith("devtools://") && !t.url.startsWith("chrome-extension://")) {
                        target = t;
                        break;
                    }
                }
            }

            if (!target) {
                throw new Error(`No suitable target page found matching keyword "${urlKeyword}"`);
            }
            this.targetId = target.id;
        } catch (e: any) {
            throw new Error(`Failed to fetch targets from HTTP. Ensure Chrome is running with --remote-debugging-port=${port}. ${e.message}`);
        }

        this.client = await CDP({ host: host, port: port, target: this.targetId });

        this.client.on('disconnect', () => {
             console.error("CDP Target Disconnected.");
             this.client = null;
        });

        const { Network, Page, Runtime, Target } = this.client;
        
        await Promise.all([
            Runtime.enable(),
            Network.enable(),
            Page.enable(),
            Target.setAutoAttach({ autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
        ]);

        // ========================== God Mode: CDP Native Network Tracking (Universal - Not bound to any domain) ==========================
        // Helper function: Dynamically extract domain from URL to prevent log domain not updating after SPA routing
        const extractDomain = (url: string): string => {
            try { return new URL(url).hostname; } catch(e) { return ''; }
        };

        Network.requestWillBeSent((params: any) => {
            try {
                if (RuishuCdpClient.isRuishuRequest(params.request.url)) {
                    if (this.nodeInterceptQueue.length >= RuishuCdpClient.MAX_QUEUE_LENGTH) {
                        this.nodeInterceptQueue.shift();
                    }
                    this.nodeInterceptQueue.push({
                        sub_type: "cdp_request_will_be_sent",
                        ts: Date.now(),
                        site_domain: extractDomain(params.request.url),
                        url: RuishuCdpClient.stripRuishuParam(params.request.url),
                        rawUrl: params.request.url,
                        postData: params.request.postData || "",
                        method: params.request.method
                    });
                }
            } catch(e) {}
        });

        Network.responseReceived((params: any) => {
            try {
                if (RuishuCdpClient.isRuishuRequest(params.response.url)) {
                    if (this.pendingResponseCount >= RuishuCdpClient.MAX_PENDING_RESPONSES) return;
                    this.pendingResponseCount++;
                    Network.getResponseBody({ requestId: params.requestId }).then((data: any) => {
                        this.pendingResponseCount--;
                        if (this.nodeInterceptQueue.length >= RuishuCdpClient.MAX_QUEUE_LENGTH) {
                            this.nodeInterceptQueue.shift();
                        }
                        this.nodeInterceptQueue.push({
                            sub_type: "cdp_response_received",
                            ts: Date.now(),
                            site_domain: extractDomain(params.response.url),
                            url: RuishuCdpClient.stripRuishuParam(params.response.url),
                            rawUrl: params.response.url,
                            body: data.body,
                            status: params.response.status
                        });
                    }).catch((err: any) => {
                        this.pendingResponseCount--;
                        // Common reasons: request was cancelled, body has been freed, connection dropped, output to stderr for troubleshooting
                        console.error(`[CDP] getResponseBody failed for ${params.response.url?.substring(0, 80)}: ${err?.message || err}`);
                    });
                }
            } catch(e) {}
        });
        // =================================================================================

        // Global Auto Follow: Listen for any newly popped Tabs or IFRAMEs and inject the probe into them
        Target.attachedToTarget(async (event: any) => {
            try {
                if (event.targetInfo.type === 'page' || event.targetInfo.type === 'iframe') {
                    const sid = event.sessionId;
                    if (sid && this.client) {
                        await this.client.send('Page.addScriptToEvaluateOnNewDocument', {
                            source: getUniversalHook()
                        }, sid);
                        await this.client.send('Runtime.evaluate', {
                            expression: getUniversalHook()
                        }, sid);
                    }
                }
            } catch(e) {}
        });

        await Network.setCacheDisabled({ cacheDisabled: true });
        await Network.setBypassServiceWorker({ bypass: true });

        // At the earliest possible moment of all Document creation, inject the universal stealth intercept layer (including Proxy and toString override)
        await Page.addScriptToEvaluateOnNewDocument({
             source: getUniversalHook()
        });

        // Force reload page to make the Document hook effective
        await Page.reload({ ignoreCache: true });

        // Wait for page load completion before automatically detecting Ruishu features
        // Use configurable timeout instead of hardcoded value, accommodating slow networks
        await new Promise(resolve => setTimeout(resolve, config.pageLoadTimeoutMs));
        let ruishuDetection = 'Undetected';
        try {
            const detectScript = `
                (function() {
                    const result = { isRuishu: false, signals: [] };
                    // Detection 1: $_ts global variable (visible during challenge page phase)
                    if (window.$_ts) {
                        result.isRuishu = true;
                        result.signals.push('$_ts global variable exists (nsd=' + (window.$_ts.nsd || 'N/A') + ')');
                    }
                    // Detection 2: <meta r='m'> tag (visible during challenge page phase)
                    const metas = document.querySelectorAll('meta[r="m"]');
                    if (metas.length > 0) {
                        result.isRuishu = true;
                        result.signals.push('Found ' + metas.length + ' meta[r=m] tags');
                    }
                    // Detection 3: <script r='m'> tag (visible during challenge page phase)
                    const scripts = document.querySelectorAll('script[r="m"]');
                    if (scripts.length > 0) {
                        result.isRuishu = true;
                        result.signals.push('Found ' + scripts.length + ' script[r=m] tags');
                    }
                    // Detection 4: Cookie features (persistent signals that remain after passing the challenge)
                    // Ruishu Cookie feature: Key 5-15 random alphanumeric, Value usually 30+ chars long string
                    let ruishuCookieCount = 0;
                    const cookies = document.cookie.split(';');
                    for (const c of cookies) {
                        const parts = c.trim().split('=');
                        const name = parts[0];
                        const value = parts.slice(1).join('=');
                        if (/^[A-Za-z0-9]{5,15}$/.test(name)) {
                            if (value && value.length > 30) {
                                ruishuCookieCount++;
                                result.signals.push('Ruishu Cookie: ' + name + ' (Val Length=' + value.length + ')');
                            } else {
                                result.signals.push('Suspected Cookie: ' + name);
                            }
                        }
                    }
                    // 2 or more long-value random-named Cookies -> Highly confident confirmation of Ruishu
                    if (ruishuCookieCount >= 2) {
                        result.isRuishu = true;
                    }
                    // Detection 5: Check if there are Ruishu requests in the intercepted queue (final fallback)
                    if (!result.isRuishu && window.__mcp_intercept_queue && window.__mcp_intercept_queue.length > 0) {
                        result.isRuishu = true;
                        result.signals.push('Hook queue captured ' + window.__mcp_intercept_queue.length + ' Ruishu traffic entries');
                    }
                    return result;
                })();
            `;
            const detectRes = await Promise.race([
                Runtime.evaluate({ expression: detectScript, returnByValue: true }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('detect timeout')), 5000))
            ]);
            const detection = detectRes?.result?.value;
            if (detection) {
                ruishuDetection = detection.isRuishu
                    ? `✅ Confirmed Ruishu protection! Signals: ${detection.signals.join(' | ')}`
                    : `❌ No Ruishu features detected. Signals: ${detection.signals.length > 0 ? detection.signals.join(' | ') : 'None'}`;
            }
        } catch(e) {
            ruishuDetection = 'Detection timeout/failed';
        }

        // Get the current page domain for return message display
        let siteDomain = '';
        try {
            siteDomain = (await Runtime.evaluate({ expression: 'location.hostname' }))?.result?.value || '';
        } catch(e) {}

        return `Universal Ruishu Hook successfully injected! Page reloaded.\nSite Domain: ${siteDomain}\nRuishu Detection: ${ruishuDetection}`;
    }

    public async executeScript(jsScript: string): Promise<string> {
        if (!this.client || !this.client.Runtime) {
            throw new Error("Client not connected. Call init first.");
        }
        // [Fix point]: Added 30 seconds timeout limit to prevent infinite wait due to page hanging
        const res = await Promise.race([
            this.client.Runtime.evaluate({ expression: jsScript, returnByValue: true }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Runtime.evaluate timed out (30s)")), 30000))
        ]);
        if (res.exceptionDetails) {
            throw new Error("Execution error: " + (res.exceptionDetails.exception?.description || "Unknown"));
        }
        // Strict boundary: undefined means no return value, replace with "Success", otherwise serialize normally (incl. null/0/false/"")
        const val = res.result.value;
        return val === undefined ? "Success" : JSON.stringify(val);
    }
}

export const cdpClient = new RuishuCdpClient();
