import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
const upload = multer({ storage: multer.memoryStorage() });

/* ---- HEALTH CHECK (Railway needs fast response) ---- */
app.get("/", (req, res) => {
  res.status(200).send("alive");
});

/* ---- OCR ROUTE ---- */
app.post("/verify-payment", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.json({ status: "rejected" });

    // Import tesseract ONLY when needed (prevents startup crash)
    const Tesseract = (await import("tesseract.js")).default;

    const result = await Tesseract.recognize(req.file.buffer, "eng");
    const detected = result.data.text.toLowerCase();

    let score = 0;
    const t = detected.replace(/\s+/g, " ");

    if (/(upi|gpay|phonepe|paytm|bank|axis|sbi|hdfc|icici)/i.test(t)) score += 2;
    if (/(paid|success|successful|completed|credited|debited)/i.test(t)) score += 2;
    if (/(utr|txn|transaction|trxn|ref no|reference)/i.test(t)) score += 2;
    if (/(₹|rs)?\s?\d{2,5}(,\d{3})?/i.test(t)) score += 1;
    if (/(\d{1,2}:\d{2})|(\d{1,2}\s?(am|pm))|(\d{4})/i.test(t)) score += 1;
    if (/\d{9,}/.test(t)) score += 1;

    console.log("SCORE:", score);

    res.json({ status: score >= 3 ? "accepted" : "rejected" });

  } catch (err) {
    console.error(err);
    res.json({ status: "rejected" });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on", PORT));
