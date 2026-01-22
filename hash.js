import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("DanielleEmiColon", 10);
console.log(hash);
