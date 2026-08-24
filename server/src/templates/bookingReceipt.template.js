// Universal receipt email template sent to a devotee after their booking is confirmed.
// Supports every booking type (Prasad, Pooja, Darshan, Seva, Event, Donation, etc.)
// with flexible props, dynamic line items, custom metadata details, and backward compatibility.

const formatCurrency = (amount) => {
  const num = Number(amount);
  return Number.isNaN(num) ? amount : `₹${num.toFixed(2)}`;
};

/**
 * Universal Booking Receipt Template.
 *
 * @param {Object} props
 * @param {string} [props.name] - Devotee / Payer name
 * @param {string} [props.bookingType="Prasad"] - Type of booking (e.g. "Prasad", "Pooja", "Darshan", "Seva")
 * @param {string} [props.title] - HTML document title (defaults to `${bookingType} Booking Receipt`)
 * @param {string} [props.templeName="Shree Gaurishankar Baikunthdham Temple"] - Temple branding name
 * @param {string} [props.headerSubtitle] - Subtitle under header (defaults to `${bookingType} Booking Confirmed`)
 * @param {string} [props.greeting="ॐ नमः शिवाय 🙏"] - Top greeting / invocation
 * @param {string} [props.message] - Custom body message; if omitted, generates an auspicious blessing
 * @param {string} [props.bookingId] - Unique booking identifier
 * @param {string} [props.bookingTime] - Formatted date/time of booking
 * @param {string} [props.paymentId] - Payment transaction ID
 * @param {number|string} [props.amountRupees] - Total amount paid in INR
 * @param {string} [props.status] - Booking status (e.g. "Confirmed")
 * @param {Array<{label: string, value: string|number}>} [props.details] - Array of custom key-value details
 * @param {Array<{name?: string, item?: string, quantity?: string|number, qty?: string|number, price?: number, unitPrice?: number, amount?: number}>} [props.items] - Line items
 * @param {string} [props.itemName] - Single item name (fallback)
 * @param {string} [props.itemLabel] - Label for single item (defaults to bookingType or "Item")
 * @param {number} [props.unitPrice] - Unit price for single item
 * @param {string} [props.unitPriceLabel] - Label for unit price
 * @param {number|string} [props.quantity] - Quantity for single item
 * @param {string} [props.unitLabel] - Unit descriptor (e.g. "kg", "persons", "tickets")
 * @param {string} [props.prasadName] - Backward compatibility for Prasad bookings
 * @param {number} [props.pricePerKg] - Backward compatibility for Prasad price per kg
 * @param {boolean} [props.hasAttachment=true] - Whether a PDF invoice is attached
 * @param {string} [props.attachmentNote] - Custom text explaining the attachment
 * @param {string} [props.closingNote] - Sign-off closing line
 * @param {string} [props.footerNote] - Custom footer disclaimer
 */
export const bookingReceiptTemplate = ({
  name = "Devotee",
  bookingType = "Prasad",
  title,
  templeName = "Shree Gaurishankar Baikunthdham Temple",
  headerSubtitle,
  greeting = "ॐ नमः शिवाय 🙏",
  message,
  bookingId,
  bookingTime,
  paymentId,
  amountRupees,
  status,
  details = [],
  items = [],
  itemName,
  itemLabel,
  unitPrice,
  unitPriceLabel,
  quantity,
  unitLabel,
  prasadName,
  pricePerKg,
  hasAttachment = true,
  attachmentNote,
  closingNote = "With divine blessings,",
  footerNote,
} = {}) => {
  // Normalize booking type and labels
  const effectiveBookingType = bookingType || (prasadName ? "Prasad" : "Booking");
  const docTitle = title || `${effectiveBookingType} Booking Receipt`;
  const subHeader = headerSubtitle || `${effectiveBookingType} Booking Confirmed`;

  // Default devotional message if not explicitly customized
  const defaultMessage = `Har Har Mahadev! 🙏 Your ${effectiveBookingType.toLowerCase()} booking has been confirmed with love and devotion, and the temple priests will offer the sacred prayers and rituals in your name. May the divine blessings of <strong>Lord Shiva</strong> bring peace, health and prosperity to you and your family.`;
  const bodyMessage = message || defaultMessage;

  // Build the list of key-value detail rows to display in the receipt box
  const rowList = [];

  // 1. Single item / Prasad backward compatibility
  const resolvedItemName = prasadName || itemName;
  if (resolvedItemName) {
    const resolvedItemLabel = itemLabel || (prasadName ? "Prasad" : `${effectiveBookingType} Name`);
    rowList.push({ label: resolvedItemLabel, value: resolvedItemName });
  }

  const resolvedPrice = pricePerKg ?? unitPrice;
  if (resolvedPrice !== undefined && resolvedPrice !== null) {
    const resolvedPriceLabel = unitPriceLabel || (pricePerKg !== undefined ? "Price / kg" : "Price / unit");
    rowList.push({ label: resolvedPriceLabel, value: formatCurrency(resolvedPrice) });
  }

  if (quantity !== undefined && quantity !== null) {
    const qtySuffix = unitLabel ? ` ${unitLabel}` : (pricePerKg !== undefined ? " kg" : "");
    rowList.push({ label: "Quantity", value: `${quantity}${qtySuffix}` });
  }

  // 2. Custom detail rows passed by caller
  if (Array.isArray(details) && details.length > 0) {
    details.forEach((d) => {
      if (d && d.label && d.value !== undefined && d.value !== null) {
        rowList.push({ label: d.label, value: String(d.value) });
      }
    });
  }

  // 3. Amount, Date/Time, Booking ID, Payment ID
  if (amountRupees !== undefined && amountRupees !== null) {
    rowList.push({ label: "Amount Paid", value: formatCurrency(amountRupees) });
  }

  if (bookingTime) {
    rowList.push({ label: "Booking Time", value: String(bookingTime) });
  }

  if (bookingId) {
    rowList.push({ label: "Booking ID", value: String(bookingId) });
  }

  if (paymentId) {
    rowList.push({ label: "Payment ID", value: String(paymentId) });
  }

  if (status && status.toLowerCase() !== "confirmed") {
    rowList.push({ label: "Status", value: String(status) });
  }

  // Render multi-item table if items array is provided
  const hasMultipleItems = Array.isArray(items) && items.length > 0;
  const itemsTableHtml = hasMultipleItems
    ? `
      <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:18px;border-collapse:collapse;font-size:14px;background:#ffffff;border:1px solid #f3caca;border-radius:6px;">
        <thead>
          <tr style="background:#b71c1c;color:#ffffff;text-align:left;">
            <th style="padding:10px 12px;font-weight:600;">Item</th>
            <th style="padding:10px 12px;font-weight:600;text-align:center;">Qty</th>
            <th style="padding:10px 12px;font-weight:600;text-align:right;">Price</th>
            <th style="padding:10px 12px;font-weight:600;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (it, idx) => `
            <tr style="border-bottom:1px solid #f0f0f0;${idx % 2 === 1 ? "background:#fafafa;" : ""}">
              <td style="padding:10px 12px;color:#333333;"><strong>${it.name || it.item || "-"}</strong></td>
              <td style="padding:10px 12px;text-align:center;color:#555555;">${it.quantity ?? it.qty ?? 1}</td>
              <td style="padding:10px 12px;text-align:right;color:#555555;">${it.unitPrice ?? it.price ? formatCurrency(it.unitPrice ?? it.price) : "-"}</td>
              <td style="padding:10px 12px;text-align:right;color:#b71c1c;font-weight:bold;">${it.amount !== undefined ? formatCurrency(it.amount) : "-"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `
    : "";

  const rowsHtml = rowList
    .map(
      (r, idx) => `
      <p style="margin:${idx === 0 ? "0" : "0 0 12px"};font-size:15px;line-height:1.5;">
        <span style="display:inline-block;width:140px;color:#777777;">${r.label}</span>
        <strong style="color:#b71c1c;">${r.value}</strong>
      </p>
    `,
    )
    .join("");

  const defaultAttachmentText =
    "📎 A detailed <strong>invoice (PDF)</strong> is attached to this email for your records. You may download and keep it for reference.";
  const attachmentSection = hasAttachment
    ? `
      <p style="font-size:16px;line-height:1.8;margin:25px 0 0;">
        ${attachmentNote || defaultAttachmentText}
      </p>
    `
    : "";

  const defaultFooterDisclaimer = `This is an automated receipt sent by <strong>${templeName}</strong>.<br>Please do not reply to this email.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
</head>

<body style="margin:0;padding:30px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

  <table align="center" width="600" cellpadding="0" cellspacing="0"
    style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e5e5;max-width:100%;">

    <!-- Header -->
    <tr>
      <td align="center" style="background:#b71c1c;padding:30px 20px;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3;">
          🛕 ${templeName}
        </h1>
        <p style="margin:8px 0 0;color:#ffe5e5;font-size:16px;">
          ${subHeader}
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:35px;color:#333333;">

        <h2 style="margin-top:0;color:#b71c1c;">
          ${greeting}
        </h2>

        <p style="font-size:16px;line-height:1.8;">
          Dear <strong>${name}</strong>,
        </p>

        <p style="font-size:16px;line-height:1.8;">
          ${bodyMessage}
        </p>

        <!-- Receipt details box -->
        <div style="margin:30px 0;background:#fff5f5;border:1px solid #f3caca;border-radius:8px;padding:20px 25px;">
          ${itemsTableHtml}
          ${rowsHtml}
        </div>

        ${attachmentSection}

        <hr style="border:none;border-top:1px solid #e5e5e5;margin:30px 0;">

        <p style="font-size:16px;line-height:1.8;">
          ${closingNote}<br><br>
          <strong style="color:#b71c1c;">
            ${templeName}
          </strong>
        </p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center"
        style="background:#fafafa;padding:20px;color:#777777;font-size:13px;line-height:1.7;">
        ${footerNote || defaultFooterDisclaimer}
      </td>
    </tr>

  </table>

</body>
</html>
`.trim();
};

// Aliased export for backwards compatibility
export const prasadReceiptTemplate = bookingReceiptTemplate;
