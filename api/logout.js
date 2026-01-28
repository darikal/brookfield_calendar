export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );

  res.status(200).json({ success: true });
}
