const nodemailer = require("nodemailer");

const getTransporter = () => {
  const user = (process.env.EMAIL_USER || process.env.EMAIL || "").trim();
  const pass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "").trim();
  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    }),
    from: user,
  };
};

// send email function
const sendEmail = async (to, subject, text) => {
  const { transporter, from } = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
};

module.exports = sendEmail;