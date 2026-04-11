import { cdpClient } from "./src/cdpClient";
import { store } from "./src/recordStore";

async function main() {
    console.log("🚀 Testing Ruishu CDP hook...");
    try {
        const msg = await cdpClient.connect("", "127.0.0.1", 9222);
        console.log("✅ Hook Result:", msg);
        
        console.log("🕒 Polling for captured traffic every 5 seconds... (Press F5 in your browser and click some API buttons!)");
        setInterval(() => {
            const records = store.getRecordsAndClear();
            if (records.length > 0) {
                console.log(`\n🎉 Got ${records.length} new records!`);
                console.log("=== LATEST RECORD ===");
                console.log(JSON.stringify(records[records.length - 1], null, 2));
                console.log("=====================\n");
            }
        }, 5000);
        
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
}

main();
