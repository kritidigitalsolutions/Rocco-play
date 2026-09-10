require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");

async function testAuth() {
  const baseURL = "http://localhost:8000/api/auth";
  
  const testCases = [
    { phone: "9999900001", otp: "123456" },
    { phone: "+919999900007", otp: "123456" },
    { phone: "9999900015", otp: "123456" },
    { phone: "9999999999", otp: "123456" },
  ];

  console.log("=== Testing 15 Test Accounts Login Flow ===");

  for (const tc of testCases) {
    console.log(`\nTesting Phone: ${tc.phone} ...`);
    try {
      // 1. Send OTP
      const sendRes = await axios.post(`${baseURL}/send-otp`, {
        phone: tc.phone,
      });
      console.log(`  [Send OTP] Response:`, sendRes.data);

      // 2. Verify OTP
      const verifyRes = await axios.post(`${baseURL}/verify-otp`, {
        phone: tc.phone,
        otp: tc.otp,
      });
      console.log(`  [Verify OTP] Status: Success! User: ${verifyRes.data.user.name} (${verifyRes.data.user.phone}), Email: ${verifyRes.data.user.email}, Token Generated: ${Boolean(verifyRes.data.token)}`);
    } catch (err) {
      console.error(`  ❌ Failed for ${tc.phone}:`, err.response?.data || err.message);
    }
  }
}

testAuth();
