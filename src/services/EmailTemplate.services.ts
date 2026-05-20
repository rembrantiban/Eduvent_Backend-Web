export const emailTemplate = (otp: number, firstName: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EduVent OTP Verification</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f7fb; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td align="center" style="background:#7c2d12; padding:35px 30px;">

              <!-- Logo -->
              <table cellpadding="0" cellspacing="0" align="center" style="
                width:72px;
                height:72px;
                border:2px solid #6E1E14;
                border-radius:10px;
                background:#DED6D5;
                margin-bottom:18px;
              ">
                <tr>
                  <td align="center" valign="middle">
                    <span style="
                      color:#6E1E14;
                      font-size:50px;
                      font-weight:800;
                      font-family:Arial, sans-serif;
                      line-height:72px;
                    ">
                      E
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="
                color:#ffffff;
                margin:0;
                font-size:30px;
                font-weight:700;
                letter-spacing:0.5px;
              ">
                EduVent
              </h1>

              <p style="
                color:#fed7aa;
                margin-top:10px;
                font-size:14px;
              ">
                Secure Verification Code
              </p>

            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:45px 38px; color:#334155;">

              <h2 style="
                margin-top:0;
                font-size:26px;
                color:#7c2d12;
              ">
                Verify Your Account
              </h2>

              <p style="
                font-size:16px;
                line-height:1.8;
                margin-bottom:18px;
              ">
                Hello, ${firstName}
              </p>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#475569;
              ">
                Use the verification code below to continue accessing your EduVent account.
              </p>

              <!-- OTP BOX -->
              <div style="text-align:center; margin:40px 0;">

                <span style="
                  display:inline-block;
                  background:#fff7ed;
                  color:#c2410c;
                  font-size:38px;
                  letter-spacing:12px;
                  font-weight:bold;
                  padding:20px 34px;
                  border-radius:16px;
                  border:2px dashed #fdba74;
                  box-shadow:0 4px 12px rgba(251,146,60,0.15);
                ">
                  ${otp}
                </span>

              </div>

              <p style="
                font-size:15px;
                color:#64748b;
                line-height:1.7;
              ">
                This code will expire in <strong>5 minutes</strong>.
              </p>

              <p style="
                font-size:15px;
                color:#64748b;
                line-height:1.7;
              ">
                If you did not request this code, please ignore this email.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="
              background:#fff7ed;
              padding:24px;
              font-size:13px;
              color:#9a3412;
            ">
              © 2026 EduVent. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};

