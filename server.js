import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

// memory storage (important for deployment later)
const upload = multer({ storage: multer.memoryStorage() });

app.post("/verify-payment", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ status: "rejected" });
        }

        const {
            data: { text }
        } = await Tesseract.recognize(req.file.buffer, "eng");

        const detected = text.toLowerCase();
        console.log("OCR TEXT:\n", detected);

        let score = 0;

        // normalize text
        const t = detected.replace(/\s+/g, " ");

        // payment related words
        if (/(upi|gpay|phonepe|paytm|bank|axis|sbi|hdfc|icici)/i.test(t)) score += 2;

        // success words
        if (/(paid|success|successful|completed|credited|debited)/i.test(t)) score += 2;

        // transaction id words
        if (/(utr|txn|transaction|trxn|ref no|reference)/i.test(t)) score += 2;

        // amount patterns
        if (/(₹|rs)?\s?\d{2,5}(,\d{3})?/i.test(t)) score += 1;

        // date or time
        if (/(\d{1,2}:\d{2})|(\d{1,2}\s?(am|pm))|(\d{4})/i.test(t)) score += 1;

        // long number (possible UTR)
        if (/\d{9,}/.test(t)) score += 1;

        console.log("PAYMENT SCORE:", score);

        if (score >= 3) {
            return res.json({ status: "accepted" });
        } else {
            return res.json({ status: "rejected" });
        }
    } catch (err) {
        console.error(err);
        res.json({ status: "rejected" });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on port", PORT));

