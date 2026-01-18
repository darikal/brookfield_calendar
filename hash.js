import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("FebbraioValettaAlex", 10);
console.log(hash);
