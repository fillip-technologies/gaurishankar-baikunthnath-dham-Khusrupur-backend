export const crendentialsTemplate = (name, email, password) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Account Credentials</title>
</head>

<body style="margin:0;padding:30px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

  <table align="center" width="600" cellpadding="0" cellspacing="0"
    style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e5e5;">

    <!-- Header -->
    <tr>
      <td align="center" style="background:#b71c1c;padding:30px;">
        <h1 style="margin:0;color:#ffffff;font-size:26px;">
          🛕 Shree Gaurishankar Baikunthdham Temple
        </h1>
        <p style="margin:8px 0 0;color:#ffe5e5;font-size:16px;">
          Admin Account Created
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
          An administrator account has been created for you on the
          <strong>Shree Gaurishankar Baikunthdham Temple</strong> portal.
          Please use the credentials below to log in.
        </p>

        <!-- Credentials -->
        <div style="margin:30px 0;background:#fff5f5;border:1px solid #f3caca;border-radius:8px;padding:20px 25px;">
          <p style="margin:0 0 12px;font-size:15px;">
            <span style="display:inline-block;width:90px;color:#777;">Email</span>
            <strong style="color:#b71c1c;">${email}</strong>
          </p>
          <p style="margin:0;font-size:15px;">
            <span style="display:inline-block;width:90px;color:#777;">Password</span>
            <strong style="color:#b71c1c;">${password}</strong>
          </p>
        </div>

        <p style="font-size:16px;line-height:1.8;">
          🔐 For your security, please <strong>log in and change your password</strong>
          as soon as possible, and do not share these credentials with anyone.
        </p>

        <hr style="border:none;border-top:1px solid #e5e5e5;margin:30px 0;">

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
