/**
 * Generate multi-site unified zero-interference data topology probe code
 * This code will be mounted at the first time before all scripts on the page are executed (Document Creation Phase).
 *
 * [Academic Principle] Only extract API data streams embedded with complex dynamic environment parameters,
 * Strictly isolate from global native methods like JSON.parse/stringify to prevent the data pipeline from being polluted by massive noisy VM instruction streams.
 */
export function getUniversalHook() {
    return `
    (function() {
        if (window.__mcp_mounted) return;
        window.__mcp_mounted = true;
        
        // --- Core data safe ---
        window.__mcp_intercept_queue = window.__mcp_intercept_queue || [];
        
        // --- Internal log emitter (maximum extent not to pollute the business layer) ---
        const _pushLog = (type, data) => {
            try {
                if (window.__mcp_intercept_queue.length > 500) {
                    window.__mcp_intercept_queue.shift();
                }
                window.__mcp_intercept_queue.push({
                    sub_type: type,
                    ts: Date.now(),
                    data: data,
                    url: window.location.href
                });
            } catch(e){}
        };

        // --- Ruishu dynamic token detector: determine whether the URL contains Ruishu token parameters ---
        const _isRuishuUrl = (rawUrl) => {
            try {
                const u = new URL(String(rawUrl), location.origin);
                let found = false;
                u.searchParams.forEach((value, key) => {
                    // Ruishu dynamic token feature: 5-12 purely alphanumeric Key + ciphertext Value longer than 40 chars
                    if (/^[A-Za-z0-9]{5,12}$/.test(key) && value.length > 40) {
                        found = true;
                    }
                });
                return found;
            } catch(e) { return false; }
        };

        // --- Ruishu dynamic token purifier: automatically strip encrypted parameters like GoHnnqm0, restore plaintext URL ---
        const _cleanUrl = (rawUrl) => {
            try {
                const u = new URL(String(rawUrl), location.origin);
                const keysToRemove = [];
                u.searchParams.forEach((value, key) => {
                    if (/^[A-Za-z0-9]{5,12}$/.test(key) && value.length > 40) {
                        keysToRemove.push(key);
                    }
                });
                keysToRemove.forEach(k => u.searchParams.delete(k));
                return u.pathname + u.search + u.hash;
            } catch(e) { return rawUrl; }
        };

        // --- Original method reference (for safe serialization) ---
        const _origStringify = JSON.stringify;

        // --- Defense shield: toString evades detection ---
        const originalToString = Function.prototype.toString;
        const hookSignatures = new Map();
        
        // Camouflage function to prevent native modifier detection by Ruishu
        Function.prototype.toString = function() {
            if (hookSignatures.has(this)) {
                return hookSignatures.get(this);
            }
            return originalToString.call(this);
        };
        hookSignatures.set(Function.prototype.toString, originalToString.call(originalToString));

        // --- Interceptor 1: XMLHttpRequest packet tracking (Ruishu requests only) ---
        const _origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this._reqUrl = url;
            this._cleanReqUrl = _cleanUrl(url);
            this._isRuishu = _isRuishuUrl(url);
            // Only record the open event of Ruishu requests
            if (this._isRuishu) {
                try {
                    _pushLog("xhr_open", _origStringify.call(JSON, {
                        method: method,
                        url: _cleanUrl(url)
                    }));
                } catch(e) {}
            }
            return _origOpen.apply(this, arguments);
        };
        hookSignatures.set(XMLHttpRequest.prototype.open, originalToString.call(_origOpen));

        const _origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            try {
                // Only mount response interception for Ruishu requests
                if (this._isRuishu) {
                    // Record request body (useful for POST)
                    if (body && typeof body === 'string' && body.length > 2) {
                        _pushLog("xhr_request_body", _origStringify.call(JSON, {
                            url: this._cleanReqUrl,
                            body: body
                        }));
                    }

                    // Prevent repeated mounting of listeners when the same XHR object is reused by multiple open/send
                    if (!this._mcpListenerAttached) {
                        this._mcpListenerAttached = true;
                        this.addEventListener("readystatechange", function() {
                            // Runtime recheck: open may have changed _isRuishu to false during XHR reuse
                            if (this.readyState === 4 && this._isRuishu) {
                                try {
                                    let respStr = "";
                                    if (this.responseType === "" || this.responseType === "text") {
                                        respStr = this.responseText || "";
                                    } else if (this.responseType === "json") {
                                        try {
                                            respStr = _origStringify.call(JSON, this.response);
                                        } catch(e) {}
                                    } else {
                                        respStr = "[Non-Text Response: " + this.responseType + "]";
                                    }
                                    
                                    if (respStr && respStr.length > 5) {
                                        _pushLog("xhr_response", _origStringify.call(JSON, {
                                            url: this._cleanReqUrl,
                                            status: this.status,
                                            body: respStr
                                        }));
                                    }
                                } catch(e) {}
                            }
                        });
                    }
                }
            } catch(e) {}
            
            return _origSend.apply(this, arguments);
        };
        hookSignatures.set(XMLHttpRequest.prototype.send, originalToString.call(_origSend));

        // --- Interceptor 2: Native Fetch (Ruishu requests only) ---
        if (window.fetch) {
            const _origFetch = window.fetch;
            window.fetch = async function() {
                let capturedUrl = '';
                let isRuishu = false;
                try {
                    const args = Array.from(arguments);
                    let reqUrl = args[0] || '';
                    if (typeof reqUrl === 'object' && reqUrl.url) reqUrl = reqUrl.url;
                    capturedUrl = String(reqUrl);
                    isRuishu = _isRuishuUrl(capturedUrl);
                    
                    if (isRuishu) {
                        let reqBody = '';
                        if (args[1] && args[1].body) {
                            reqBody = typeof args[1].body === 'string' ? args[1].body : '[non-string body]';
                        }
                        _pushLog("fetch_call", _origStringify.call(JSON, {
                            url: _cleanUrl(capturedUrl),
                            body: reqBody
                        }));
                    }
                } catch(e) {}

                const response = await _origFetch.apply(this, arguments);
                
                // Only clone the response for Ruishu requests
                if (isRuishu) {
                    try {
                        const clonedResponse = response.clone();
                        const _url = capturedUrl;
                        clonedResponse.text().then(text => {
                             if (text && text.length > 5) {
                                  _pushLog("fetch_response", _origStringify.call(JSON, {
                                      url: _cleanUrl(_url),
                                      status: clonedResponse.status,
                                      body: text
                                  }));
                             }
                        }).catch(()=>{});
                    } catch(e) {}
                }

                return response;
            };
            hookSignatures.set(window.fetch, originalToString.call(_origFetch));
        }

        // --- Interceptor 3: IFrame clean room escape block ---
        try {
            const HTMLIFrameElementProto = HTMLIFrameElement.prototype;
            const origContentWindowDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElementProto, 'contentWindow');
            if (origContentWindowDesc && origContentWindowDesc.get) {
                const origGet = origContentWindowDesc.get;
                Object.defineProperty(HTMLIFrameElementProto, 'contentWindow', {
                    get: function() {
                        const win = origGet.call(this);
                        if (win && !win.__mcp_mounted) {
                            try {
                                win.XMLHttpRequest.prototype.open = window.XMLHttpRequest.prototype.open;
                                win.XMLHttpRequest.prototype.send = window.XMLHttpRequest.prototype.send;
                                if (win.fetch) win.fetch = window.fetch;
                                win.__mcp_mounted = true;
                            } catch(e){}
                        }
                        return win;
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        // ====================================================================
        // Phase 2: Sandwich Upper-Layer Plaintext Capture (Object.defineProperty Hook)
        // Since Ruishu uses Object.defineProperty to bypass setters, we hook Object.defineProperty itself!
        // ====================================================================
        const _phase1Open = XMLHttpRequest.prototype.open;
        const _phase1Send = XMLHttpRequest.prototype.send;
        
        // --- Interceptor 4: setRequestHeader tracking (must run before open/send hook) ---
        const _origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            try {
                if (this._plaintextHeaders) {
                    this._plaintextHeaders[name] = value;
                }
            } catch(e) {}
            return _origSetHeader.apply(this, arguments);
        };
        hookSignatures.set(XMLHttpRequest.prototype.setRequestHeader, originalToString.call(_origSetHeader));

        const _origDefineProperty = Object.defineProperty;
        Object.defineProperty = function(obj, prop, descriptor) {
            // Detect when Ruishu tries to redefine XHR prototype methods
            if (obj === XMLHttpRequest.prototype) {
                if (prop === 'open' || prop === 'send') {
                    if (descriptor && 'value' in descriptor && typeof descriptor.value === 'function') {
                        const ruishuFn = descriptor.value;
                        
                        if (prop === 'open') {
                            const upperOpenHook = function(method, url) {
                                this._plaintextUrl = String(url);
                                this._plaintextMethod = String(method);
                                this._plaintextHeaders = {};
                                try {
                                    _pushLog("xhr_plaintext_open", _origStringify.call(JSON, {
                                        method: method,
                                        url: String(url)
                                    }));
                                } catch(e) {}
                                return ruishuFn.apply(this, arguments);
                            };
                            hookSignatures.set(upperOpenHook, originalToString.call(ruishuFn));
                            descriptor.value = upperOpenHook;
                        } 
                        else if (prop === 'send') {
                            const upperSendHook = function(body) {
                                try {
                                    if (this._plaintextUrl && body && typeof body === 'string' && body.length > 2) {
                                        _pushLog("xhr_plaintext_send", _origStringify.call(JSON, {
                                            url: this._plaintextUrl,
                                            body: body,
                                            headers: this._plaintextHeaders || {}
                                        }));
                                    }
                                } catch(e) {}
                                return ruishuFn.apply(this, arguments);
                            };
                            hookSignatures.set(upperSendHook, originalToString.call(ruishuFn));
                            descriptor.value = upperSendHook;
                        }
                    }
                }
            }
            return _origDefineProperty.call(this, obj, prop, descriptor);
        };
        hookSignatures.set(Object.defineProperty, originalToString.call(_origDefineProperty));

    })();
    `;
}
