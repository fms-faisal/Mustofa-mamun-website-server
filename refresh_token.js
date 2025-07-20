// require('dotenv').config(); // Load environment variables
// const { google } = require('googleapis');
// const readline = require('readline');

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// // Step 1: Generate Authorization URL
// const authUrl = oauth2Client.generateAuthUrl({
//   access_type: 'offline', 
//   scope: ['https://www.googleapis.com/auth/drive'],
//   // prompt: 'consent' // Forces user to reauthorize and get a new refresh token
// });

// console.log('Visit this URL and authorize the app:', authUrl);


// // check vercel log for refresh token.


// // // Step 2: User must paste the authorization code
// // const rl = readline.createInterface({
// //   input: process.stdin,
// //   output: process.stdout
// // });

// // rl.question('Enter the authorization code: ', (code) => {
// //   oauth2Client.getToken(code, (err, tokens) => {
// //     if (err) {
// //       console.error('Error retrieving access token:', err);
// //       rl.close();
// //       return;
// //     }

// //     console.log('Access Token:', tokens.access_token);
// //     console.log('Refresh Token:', tokens.refresh_token);
// //     console.log('Store the refresh token securely!');

// //     rl.close();
// //   });
// // });



//check access token validity 

// require('dotenv').config(); // Load environment variables
// const { google } = require('googleapis');

// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// // The refresh token should be stored securely
// const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// if (!REFRESH_TOKEN) {
//   console.error('No refresh token found. Please authorize the app to get a refresh token.');
//   process.exit(1);
// }

// // Set credentials with the refresh token
// oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// // Function to check refresh token validity
// async function checkRefreshToken() {
//   try {
//     const { credentials } = await oauth2Client.refreshAccessToken(); // Attempt to refresh token
//     console.log('Access Token:', credentials.access_token);
//     console.log('Token is valid. Expires in:', credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown');
//   } catch (error) {
//     console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
//     if (error.response && error.response.status === 400) {
//       console.error('The refresh token might be invalid or expired. Re-authentication is required.');
//     }
//   }
// }

// checkRefreshToken();


//check refresh token 

require('dotenv').config(); // Load environment variables
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// The refresh token should be stored securely
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!REFRESH_TOKEN) {
  console.error('No refresh token found. Please authorize the app to get a refresh token.');
  process.exit(1);
}

// Set credentials with the refresh token
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Function to check refresh token validity
async function checkRefreshToken() {
  try {
    const { token } = await oauth2Client.getAccessToken(); // Attempt to use refresh token
    if (token) {
      console.log('Refresh token is valid.');
    } else {
      console.log('Refresh token is invalid or expired.');
    }
  } catch (error) {
    console.error('Invalid or expired refresh token:', error.response ? error.response.data : error.message);
  }
}

checkRefreshToken();