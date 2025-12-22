import axios from "axios";
import qs from "qs";

// Exchange OAuth code for access token
export const exchangeCodeForToken = async (code) => {
  console.log("Exchanging code for token:", code);
  const response = await axios.post(
    "https://api.etsy.com/v3/public/oauth/token",
    qs.stringify({
      grant_type: "authorization_code",
      client_id: process.env.ETSY_CLIENT_ID,
      redirect_uri: process.env.ETSY_REDIRECT_URI,
      code
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      auth: {
        username: process.env.ETSY_CLIENT_ID,
        password: process.env.ETSY_CLIENT_SECRET
      }
    }
  );

  return response.data;
};
