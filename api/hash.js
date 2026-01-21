import bcrypt from "bcryptjs";

const password = "test";

bcrypt.hash(password, 10).then(hash => {
  console.log("Password hash:", hash);
});
