import PDFDocument from "pdfkit";

const MAROON = "#b71c1c";
const GREY = "#555555";

// pdfkit's built-in Helvetica has no glyph for the rupee sign (₹) or Devanagari,
// so the PDF uses "Rs." and transliteration. The HTML email body keeps the
// richer Unicode.
const rupees = (n) => `Rs. ${Number(n).toFixed(2)}`;

/**
 * Renders a prasad booking invoice to a PDF Buffer so it can be attached to the
 * receipt email as a downloadable file. Fully in-memory: the document stream is
 * collected into a single Buffer.
 */
export const generatePrasadInvoice = ({
  bookingId,
  paymentId,
  name,
  email,
  phone,
  prasadName,
  pricePerKg,
  quantity,
  amountRupees,
  bookingTime,
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // --- Header ---
    doc
      .fillColor(MAROON)
      .fontSize(20)
      .text("Shree Gaurishankar Baikunthdham Temple", { align: "center" });
    doc
      .fillColor(GREY)
      .fontSize(11)
      .text("Prasad Booking Invoice", { align: "center" });
    doc.moveDown(1.5);

    // --- Invoice meta ---
    doc.fillColor("#000000").fontSize(10);
    doc.text(`Invoice No : ${bookingId}`);
    doc.text(`Payment ID : ${paymentId || "-"}`);
    doc.text(`Date       : ${bookingTime}`);
    doc.moveDown(1);

    // --- Billed to ---
    doc.fillColor(MAROON).fontSize(12).text("Billed To");
    doc.fillColor("#000000").fontSize(10);
    doc.text(name || "-");
    if (email) doc.text(email);
    if (phone) doc.text(phone);
    doc.moveDown(1.2);

    // --- Line items table ---
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const cols = { item: left, price: 280, qty: 380, amount: right - 90 };

    const drawRow = (y, item, price, qty, amount, opts = {}) => {
      const { bold, color = "#000000" } = opts;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color).fontSize(10);
      doc.text(item, cols.item, y, { width: cols.price - cols.item - 10 });
      doc.text(price, cols.price, y, { width: cols.qty - cols.price - 10 });
      doc.text(qty, cols.qty, y, { width: cols.amount - cols.qty - 10 });
      doc.text(amount, cols.amount, y, { width: right - cols.amount, align: "right" });
    };

    let y = doc.y;
    drawRow(y, "Prasad", "Price / kg", "Qty", "Amount", { bold: true, color: MAROON });
    y += 18;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#e5e5e5").stroke();
    y += 8;
    drawRow(y, prasadName || "-", rupees(pricePerKg), `${quantity} kg`, rupees(amountRupees));
    y += 22;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#e5e5e5").stroke();
    y += 10;

    // --- Total ---
    doc.font("Helvetica-Bold").fillColor(MAROON).fontSize(12);
    doc.text("Total Paid", cols.qty, y, { width: cols.amount - cols.qty - 10 });
    doc.text(rupees(amountRupees), cols.amount, y, {
      width: right - cols.amount,
      align: "right",
    });
    doc.font("Helvetica").fillColor("#000000");

    // --- Footer blessing ---
    doc.moveDown(5);
    doc
      .fillColor(GREY)
      .fontSize(10)
      .text(
        "Thank you for your devotion. May Lord Shiva bless you and your family.",
        left,
        doc.y,
        { align: "center", width: right - left },
      );
    doc.text("|| Om Namah Shivaya ||", { align: "center", width: right - left });

    doc.end();
  });
