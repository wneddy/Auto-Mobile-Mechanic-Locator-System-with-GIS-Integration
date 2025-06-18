const axios = require("axios")
const getAccessToken = require("./mpesaAuth")
require("dotenv").config()

async function stkPushP2P(senderPhone, recipientPhone, amount) {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return { error: "Failed to obtain access token" }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ]/g, "")
      .slice(0, 14)
    const shortCode = process.env.BUSINESS_SHORT_CODE || "174379" // Your M-Pesa shortcode
    const passkey = process.env.PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" // Your M-Pesa passkey
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64")

    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

    // Use a hardcoded callback URL that is guaranteed to be valid
    // M-Pesa requires a publicly accessible HTTPS URL
    const callbackUrl = "https://webhook.site/c78a9a3f-5d93-4f9c-9c9a-1a76c0f5c4e1"

    const requestData = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Use standard STK push for now
      Amount: amount,
      PartyA: senderPhone, // The person sending the money
      PartyB: shortCode, // The business receiving the money
      PhoneNumber: senderPhone, // The sender's phone number
      CallBackURL: callbackUrl,
      AccountReference: `Payment to ${recipientPhone}`,
      TransactionDesc: `Payment to mechanic ${recipientPhone}`,
    }

    console.log("STK Push request data:", requestData)

    const response = await axios.post(url, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    console.log("STK Push response:", response.data)

    // Store the recipient phone for later use
    response.data.recipientPhone = recipientPhone

    return response.data
  } catch (error) {
    console.error("STK Push Error", error.response?.data || error.message)
    return { error: error.response?.data?.errorMessage || error.message }
  }
}

module.exports = stkPushP2P

