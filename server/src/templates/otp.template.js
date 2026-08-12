export const otpTemplate = (name, otp) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTP Verification</title>
</head>

<body style="margin:0;padding:30px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

  <table align="center" width="600" cellpadding="0" cellspacing="0"
    style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e5e5;">

    <!-- Header -->
    <tr>
      <td align="center" style="background:#b71c1c;padding:30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">
          🛕 Shree Gaurishankar Baikunthdham Temple
        </h1>

        <p style="margin:8px 0 0;color:#ffe5e5;font-size:16px;">
          Account Verification
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:35px;color:#333333;">

        <h2 style="margin-top:0;color:#b71c1c;">
          ॐ नमः शिवाय 🙏
        </h2>

        <p style="font-size:16px;line-height:1.8;">
          Dear <strong>${name}</strong>,
        </p>

        <p style="font-size:16px;line-height:1.8;">
          Greetings from <strong>Shree Gaurishankar Baikunthdham Temple</strong>.
        </p>

        <p style="font-size:16px;line-height:1.8;">
          We have received a request to verify your identity for your account.
          To continue securely, please use the One-Time Password (OTP) provided below.
        </p>

        <!-- OTP -->
        <div style="text-align:center;margin:35px 0;">
          <div style="
            display:inline-block;
            background:#fff5f5;
            color:#b71c1c;
            border:2px dashed #b71c1c;
            padding:18px 45px;
            border-radius:8px;
            font-size:36px;
            font-weight:bold;
            letter-spacing:10px;
          ">
            ${otp}
          </div>
        </div>

        <p style="font-size:16px;line-height:1.8;">
          ⏳ <strong>This OTP is valid for 10 minutes.</strong>
        </p>

        <p style="font-size:16px;line-height:1.8;">
          For your security, please do not share this OTP with anyone.
          The administration of <strong>Shree Gaurishankar Baikunthdham Temple</strong>
          will never ask you for your OTP through email, phone, or any other communication channel.
        </p>

        <p style="font-size:16px;line-height:1.8;">
          If you did not request this verification, you may safely ignore this email.
          No changes will be made to your account without successful verification.
        </p>

        <hr style="border:none;border-top:1px solid #e5e5e5;margin:30px 0;">

        <p style="font-size:16px;line-height:1.8;margin-bottom:0;">
          Thank you for being a valued member of the
          <strong>Shree Gaurishankar Baikunthdham Temple</strong> community.
        </p>

        <p style="font-size:16px;line-height:1.8;">
          With divine blessings,<br><br>
          <strong style="color:#b71c1c;">
            Shree Gaurishankar Baikunthdham Temple
          </strong>
        </p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center"
        style="background:#fafafa;padding:20px;color:#777777;font-size:13px;line-height:1.7;">

        This is an automated email sent by
        <strong>Shree Gaurishankar Baikunthdham Temple</strong>.<br>
        Please do not reply to this email.

      </td>
    </tr>

  </table>

</body>
</html>
`;