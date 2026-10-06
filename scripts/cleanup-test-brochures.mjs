import { readFile } from "node:fs/promises";
const base = process.env.APP_URL || "http://localhost:3001";
const data = JSON.parse(await readFile("data/database.json", "utf8"));
const records = data.brochures.filter(item => item.originalName === "interface-test.pdf" && ["Interface test draft", "Interface test published"].includes(item.title));
if (records.length) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  if (!response.ok) throw new Error("Test cleanup sign-in failed.");
  const cookie = response.headers.get("set-cookie").split(";")[0];
  for (const item of records) {
    const result = await fetch(`${base}/api/brochures/${item.id}`, { method: "DELETE", headers: { Origin: base, Cookie: cookie } });
    if (!result.ok) throw new Error("Test cleanup failed.");
  }
}
console.log(`Cleaned up ${records.length} temporary interface-test brochures.`);
