import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const password = randomBytes(18).toString("base64url");
const secret = randomBytes(32).toString("hex");
try {
  await writeFile(".env.local", `ADMIN_USERNAME=admin\nADMIN_PASSWORD=${password}\nSESSION_SECRET=${secret}\nAPP_URL=http://localhost:3001\n`, { flag: "wx", mode: 0o600 });
  console.log(`Local admin configured.\nUsername: admin\nPassword: ${password}\nCredentials are saved in .env.local. Keep this file private.`);
} catch (error) {
  if (error.code === "EEXIST") console.log(".env.local already exists. Update it manually to change credentials.");
  else throw error;
}
