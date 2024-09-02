import redisClient from './redis'; // Import Redis client for caching
import dbClient from './db'; // Import database client for MongoDB

// Function to get the authentication token from request headers
async function getAuthToken(request) {
  const token = request.headers['x-token']; // Retrieve token from headers
  return `auth_${token}`; // Format and return the token
}

// Checks authentication against verified information
// Returns userId of user if found, otherwise null
async function findUserIdByToken(request) {
  const key = await getAuthToken(request); // Get the formatted auth token
  const userId = await redisClient.get(key); // Retrieve userId from Redis
  return userId || null; // Return userId or null if not found
}

// Gets user by userId
// Returns exactly the first user found or null if not found
async function findUserById(userId) {
  const userExistsArray = await dbClient.users.find(`ObjectId("${userId}")`).toArray(); // Query database for user
  return userExistsArray[0] || null; // Return the first user found or null
}

// Export the functions for use in other modules
export {
  findUserIdByToken, findUserById,
};