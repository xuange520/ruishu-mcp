export declare class RuishuCdpClient {
    private client;
    private targetId;
    nodeInterceptQueue: any[];
    private pendingResponseCount;
    private static MAX_PENDING_RESPONSES;
    private static HTTP_TIMEOUT_MS;
    /**
     * High-dimensional data flow classification: Only capture requests whose URL contains complex dynamic environment token parameters.
     * Dynamic environment feature: 5-12 alphanumeric topological routing key + 40+ chars encrypted state value.
     * For example: ?GoHnnqm0=0NpBERq... or ?rcwCQitg=06vTOkG...
     */
    private static isRuishuRequest;
    private static stripRuishuParam;
    connect(urlKeyword: string, host: string, port: number): Promise<string>;
    executeScript(jsScript: string): Promise<string>;
}
export declare const cdpClient: RuishuCdpClient;
