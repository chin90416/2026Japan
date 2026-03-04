const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Example function: Fetch Weather Data (Proxy)
// This function will use the API key stored in environment variables to fetch weather data
// and return only the necessary information to the client.
// 
// Usage from client:
// const getWeather = httpsCallable(functions, 'getWeather');
// getWeather({ location: 'Tokyo' }).then(result => ...);

exports.getWeather = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'The function must be called while authenticated.'
    );
  }

  const location = data.location;
  // TODO: Implement actual API call using process.env.WEATHER_API_KEY
  // For now, return mock data
  
  return {
    location: location,
    condition: "Sunny",
    temp: 25,
    feelsLike: 27
  };
});

exports.getExchangeRate = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated', 
          'The function must be called while authenticated.'
        );
      }
    
    // TODO: Implement actual API call using process.env.EXCHANGE_RATE_API_KEY
    // For now, return mock data
    return {
        base: 'JPY',
        target: 'TWD',
        rate: 0.21
    };
});
