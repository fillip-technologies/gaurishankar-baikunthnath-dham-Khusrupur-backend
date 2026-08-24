import PDFDocument from "pdfkit";

const MAROON = "#b71c1c";
const GREY = "#555555";

// pdfkit's built-in Helvetica has no glyph for the rupee sign (₹) or Devanagari,
// so the PDF uses "Rs." and transliteration. The HTML email body keeps the
// richer Unicode.
const rupees = (n) => {
  const num = Number(n);
  return Number.isNaN(num) ? String(n) : `Rs. ${num.toFixed(2)}`;
};

/**
 * Universal Booking Invoice PDF Generator.
 * Renders a booking invoice to a PDF Buffer so it can be attached to the
 * receipt email as a downloadable file for any booking type (Prasad, Pooja, Seva, etc.).
 *
 * @param {Object} options
 * @param {string} options.bookingId - Unique booking identifier
 * @param {string} [options.paymentId] - Razorpay or gateway payment ID
 * @param {string} [options.bookingType="Booking"] - Type of booking (e.g. "Prasad", "Pooja", "Seva")
 * @param {string} [options.invoiceTitle] - Custom title displayed below temple name
 * @param {string} [options.templeName="Shree Gaurishankar Baikunthdham Temple"] - Temple branding
 * @param {string} [options.name] - Billed-to devotee name
 * @param {string} [options.email] - Devotee email
 * @param {string} [options.phone] - Devotee phone number
 * @param {string} [options.address] - Devotee address
 * @param {string} [options.bookingTime] - Date and time string
 * @param {number|string} [options.amountRupees] - Total amount paid in INR
 * @param {Array<{name?: string, item?: string, price?: number, unitPrice?: number, qty?: string|number, quantity?: string|number, amount?: number}>} [options.items] - Line items
 * @param {Array<{label: string, value: string|number}>} [options.details] - Extra metadata key-values
 * @param {string} [options.itemName] - Single item name fallback
 * @param {string} [options.prasadName] - Prasad single item name fallback
 * @param {number} [options.pricePerKg] - Prasad price per kg fallback
 * @param {number} [options.unitPrice] - Single item unit price fallback
 * @param {number|string} [options.quantity] - Single item quantity fallback
 * @param {string} [options.unitLabel] - Unit descriptor (e.g. "kg", "persons")
 * @param {string} [options.footerBlessing] - Footer blessing note
 * @param {string} [options.closingMantra] - Footer closing mantra
 * @returns {Promise<Buffer>}
 */
export const generateBookingInvoice = ({
  bookingId,
  paymentId,
  bookingType = "Prasad",
  invoiceTitle,
  templeName = "Shree Gaurishankar Baikunthdham Temple",
  name,
  email,
  phone,
  address,
  bookingTime,
  amountRupees,
  items = [],
  details = [],
  itemName,
  prasadName,
  pricePerKg,
  unitPrice,
  quantity,
  unitLabel,
  footerBlessing = "Thank you for your devotion. May Lord Shiva bless you and your family.",
  closingMantra = "|| Om Namah Shivaya ||",
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const effectiveBookingType = bookingType || (prasadName ? "Prasad" : "Booking");
    const subTitle = invoiceTitle || `${effectiveBookingType} Booking Invoice`;

    // --- Header ---
    doc
      .fillColor(MAROON)
      .fontSize(20)
      .text(templeName, { align: "center" });
    doc
      .fillColor(GREY)
      .fontSize(11)
      .text(subTitle, { align: "center" });
    doc.moveDown(1.5);

    // --- Invoice meta ---
    doc.fillColor("#000000").fontSize(10);
    doc.text(`Invoice No   : ${bookingId || "-"}`);
    doc.text(`Payment ID   : ${paymentId || "-"}`);
    if (effectiveBookingType && effectiveBookingType !== "Booking") {
      doc.text(`Booking Type : ${effectiveBookingType}`);
    }
    doc.text(`Date         : ${bookingTime || new Date().toLocaleString("en-IN")}`);
    doc.moveDown(1);

    // --- Billed to ---
    doc.fillColor(MAROON).fontSize(12).text("Billed To");
    doc.fillColor("#000000").fontSize(10);
    doc.text(name || "-");
    if (email) doc.text(email);
    if (phone) doc.text(phone);
    if (address) doc.text(address);

    // Render any additional metadata details (e.g. Gotra, Pooja Date, etc.)
    if (Array.isArray(details) && details.length > 0) {
      details.forEach((d) => {
        if (d?.label && d?.value !== undefined && d?.value !== null) {
          doc.text(`${d.label}: ${d.value}`);
        }
      });
    }
    doc.moveDown(1.2);

    // --- Prepare Line Items ---
    const resolvedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((it) => {
        const iName = it.name || it.item || "Item";
        const iPrice = it.unitPrice ?? it.price;
        const iQty = it.quantity ?? it.qty ?? 1;
        const iAmount = it.amount ?? (iPrice != null ? Number(iPrice) * Number(iQty) : amountRupees);
        resolvedItems.push({
          item: iName,
          price: iPrice != null ? rupees(iPrice) : "-",
          qty: String(iQty),
          amount: rupees(iAmount),
        });
      });
    } else {
      // Fallback single item
      const singleName = prasadName || itemName || effectiveBookingType;
      const singlePrice = pricePerKg ?? unitPrice;
      const singleQty =
        quantity !== undefined && quantity !== null
          ? `${quantity}${unitLabel ? ` ${unitLabel}` : pricePerKg !== undefined ? " kg" : ""}`
          : "1";
      resolvedItems.push({
        item: singleName,
        price: singlePrice != null ? rupees(singlePrice) : rupees(amountRupees),
        qty: singleQty,
        amount: rupees(amountRupees),
      });
    }

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
    drawRow(y, "Item / Description", "Price", "Qty", "Amount", { bold: true, color: MAROON });
    y += 18;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#e5e5e5").stroke();
    y += 8;

    resolvedItems.forEach((it) => {
      drawRow(y, it.item, it.price, it.qty, it.amount);
      y += 20;
    });

    y += 4;
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
    doc.moveDown(4);
    if (footerBlessing) {
      doc
        .fillColor(GREY)
        .fontSize(10)
        .text(footerBlessing, left, doc.y, { align: "center", width: right - left });
    }
    if (closingMantra) {
      doc.text(closingMantra, { align: "center", width: right - left });
    }

    doc.end();
  });

// Aliased export for backwards compatibility
export const generatePrasadInvoice = generateBookingInvoice;
