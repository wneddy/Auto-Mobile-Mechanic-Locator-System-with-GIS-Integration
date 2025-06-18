const axios = require("axios")
require("dotenv").config()

async function getAccessToken() {
  try {
    const consumerKey = process.env.CONSUMER_KEY || "86i8cHhlZXPlHoaTZ733LQSGLbnpLxkEkGPnj3rE8vhS5VRi"
    const consumerSecret =
      process.env.CONSUMER_SECRET || "LTYPnnWWaDgOdCjtps3DKpa0cqfSqODIOSiaZYFaHoe8GWYjAGxk4I4nEJlGvbGE"

    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

    console.log("Getting M-Pesa access token...")

    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Access token received")
    return response.data.access_token
  } catch (error) {
    console.error("Error getting access token", error.response?.data || error.message)
    return null
  }
}

module.exports = getAccessToken

