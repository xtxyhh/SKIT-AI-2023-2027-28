import fs from "fs";
import path from "path";

const statusRoutePath = path.resolve("app/api/safety/protection-status/route.ts");
let codeStatus = fs.readFileSync(statusRoutePath, "utf8").replace(/\r\n/g, "\n");

codeStatus = codeStatus.replaceAll('c.status !== "closed"', 'c.status !== "resolved"');
fs.writeFileSync(statusRoutePath, codeStatus, "utf8");
console.log("Updated status comparison to resolved");
