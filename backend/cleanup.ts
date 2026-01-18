import fs from "fs";
import path from "path";

const directory = path.resolve(__dirname, "public", "documents");
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

export function deleteOldFiles() {
    console.log("starting file cleanup");
    const now = Date.now();

    const files = fs.readdirSync(directory);
    console.log(directory)
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        // Skip directories
        if (!stat.isFile()) continue;

        const age = now - stat.mtimeMs;

        if (age > maxAgeMs) {
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${file}`);
        }
    }
}


function msUntilNextMidnight(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
}

export function scheduleDailyCleanup() {
    const delay = msUntilNextMidnight();

    setTimeout(() => {
        deleteOldFiles();

        // Run every 24h after first run
        setInterval(deleteOldFiles, 24 * 60 * 60 * 1000);
    }, delay);
}

export default scheduleDailyCleanup;