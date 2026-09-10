/**
 * Donation receipt email template for Shree Gaurishankar Baikunthdham Temple.
 * Sent to the donor after a successful online donation via Razorpay.
 *
 * @param {object}  props
 * @param {string}  props.name            - Donor's full name
 * @param {number}  props.amountRupees    - Amount donated in rupees
 * @param {string}  props.cause           - Seva / purpose of donation
 * @param {string}  props.paymentId       - Razorpay payment ID
 * @param {string}  props.donationDate    - Date of donation (formatted string)
 * @param {string} [props.pan]            - PAN number (optional, for 80G)
 * @param {string} [props.city]           - Donor's city (optional)
 * @param {string} [props.state]          - Donor's state (optional)
 * @param {string} [props.email]          - Donor's email (shown in receipt)
 * @param {string} [props.phone]          - Donor's phone (optional)
 */
export const donationReceiptTemplate = ({
  name = "Devotee",
  amountRupees = 0,
  cause = "General Donation",
  paymentId = "",
  donationDate = "",
  pan = "",
  city = "",
  state = "",
  email = "",
  phone = "",
} = {}) => {
  const formattedAmount = `₹${Number(amountRupees).toLocaleString("en-IN")}`;
  const has80G = !!pan;

  const detailRow = (label, value) =>
    value
      ? `
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b5c2e;font-weight:600;width:44%;border-bottom:1px solid #f3e8cc;">
            ${label}
          </td>
          <td style="padding:10px 16px;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #f3e8cc;">
            ${value}
          </td>
        </tr>`
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Donation Receipt — Shree Gaurishankar Baikunthdham Temple</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">

  <table align="center" width="600" cellpadding="0" cellspacing="0"
    style="max-width:600px;width:100%;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2d5b0;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- ── Header ── -->
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#7b1a1a 0%,#a52020 50%,#7b1a1a 100%);padding:36px 24px 28px;">
        <p style="margin:0 0 6px;font-size:22px;color:#ffd700;letter-spacing:3px;font-family:Georgia,serif;">
          ॐ नमः शिवाय
        </p>
        <h1 style="margin:0 0 4px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">
          🛕 Shree Gaurishankar Baikunthdham Temple
        </h1>
        <p style="margin:0;color:#f5d78e;font-size:13px;letter-spacing:1px;">
          Khusrupur, Bihar, India
        </p>
        <div style="margin:18px auto 0;background:rgba(255,255,255,0.12);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:10px 24px;display:inline-block;">
          <p style="margin:0;color:#ffd700;font-size:15px;font-weight:700;letter-spacing:1px;">
            🙏 DONATION RECEIPT
          </p>
        </div>
      </td>
    </tr>

    <!-- ── Thank you banner ── -->
    <tr>
      <td align="center" style="background:#fff8ee;padding:24px 32px 20px;border-bottom:2px solid #f3e8cc;">
        <p style="margin:0 0 8px;font-size:24px;">🌸</p>
        <h2 style="margin:0 0 8px;color:#7b1a1a;font-size:20px;font-weight:700;">
          Thank You, ${name}!
        </h2>
        <p style="margin:0;color:#5c4a1e;font-size:14px;line-height:1.7;">
          Your generous donation of <strong style="color:#7b1a1a;font-size:16px;">${formattedAmount}</strong>
          has been received successfully.<br>
          May Shri Gauri Shankar Baikunthnath bless you and your family with health,
          happiness and prosperity. 🙏
        </p>
      </td>
    </tr>

    <!-- ── Amount highlight ── -->
    <tr>
      <td align="center" style="padding:24px 32px 0;">
        <div style="background:linear-gradient(135deg,#7b1a1a,#a52020);border-radius:10px;padding:18px 32px;display:inline-block;">
          <p style="margin:0 0 2px;color:#f5d78e;font-size:11px;letter-spacing:2px;text-transform:uppercase;">
            Amount Donated
          </p>
          <p style="margin:0;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:1px;">
            ${formattedAmount}
          </p>
        </div>
      </td>
    </tr>

    <!-- ── Receipt details table ── -->
    <tr>
      <td style="padding:24px 32px;">
        <p style="margin:0 0 12px;color:#7b1a1a;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #f3e8cc;padding-bottom:8px;">
          Receipt Details
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3e8cc;border-radius:8px;overflow:hidden;background:#fffdf7;">
          <tbody>
            ${detailRow("Donor Name", name)}
            ${detailRow("Seva / Purpose", cause)}
            ${detailRow("Donation Date", donationDate)}
            ${detailRow("Payment ID", `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`)}
            ${detailRow("Email", email)}
            ${detailRow("Phone", phone)}
            ${detailRow("PAN Number", pan)}
            ${detailRow("City", city)}
            ${detailRow("State", state)}
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b5c2e;font-weight:600;width:44%;">
                Payment Status
              </td>
              <td style="padding:10px 16px;">
                <span style="background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid #86efac;">
                  ✓ Successful
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>

    <!-- ── 80G tax notice ── -->
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="background:${has80G ? "#f0fdf4" : "#fffbeb"};border:1px solid ${has80G ? "#86efac" : "#fcd34d"};border-radius:8px;padding:14px 16px;">
          ${
            has80G
              ? `<p style="margin:0;font-size:13px;color:#15803d;line-height:1.6;">
                  <strong>📋 80G Tax Exemption:</strong> Your PAN (<strong>${pan}</strong>) has been recorded.
                  An 80G tax exemption certificate will be issued by the temple trust separately.
                  Please retain this email as proof of donation.
                </p>`
              : `<p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                  <strong>💡 80G Tax Exemption:</strong> Donations to this trust are eligible for
                  80G income tax exemption in India. To receive an exemption certificate, please
                  contact the temple office with your PAN number and this receipt.
                </p>`
          }
        </div>
      </td>
    </tr>

    <!-- ── Blessing message ── -->
    <tr>
      <td align="center" style="padding:0 32px 28px;">
        <div style="border-top:1px solid #f3e8cc;padding-top:20px;">
          <p style="margin:0 0 6px;font-size:18px;">🪔</p>
          <p style="margin:0;font-size:13px;color:#5c4a1e;line-height:1.8;font-style:italic;">
            "भगवान श्री गौरी शंकर आपके परिवार को सुख, शांति और समृद्धि प्रदान करें।"<br>
            <span style="font-size:12px;color:#8a7550;">
              May Lord Shri Gauri Shankar bless your family with joy, peace and prosperity.
            </span>
          </p>
        </div>
      </td>
    </tr>

    <!-- ── Footer ── -->
    <tr>
      <td align="center" style="background:#7b1a1a;padding:20px 24px;">
        <p style="margin:0 0 4px;color:#f5d78e;font-size:13px;font-weight:700;">
          Shree Gaurishankar Baikunthdham Temple Trust
        </p>
        <p style="margin:0;color:#f5d78e99;font-size:11px;line-height:1.7;">
          This is an automated donation receipt. Please do not reply to this email.<br>
          For queries, contact the temple office directly.
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
`.trim();
};
