import sha1 from 'sha1'; // Import SHA-1 hashing library
import { v4 as uuidv4 } from 'uuid'; // Import UUID generation for token creation
import redisClient from '../utils/redis'; // Import Redis client utility
import dbClient from '../utils/db'; // Import database client utility

class AuthController {
  // Handle user login and authentication
  static async getConnect(request, response) {
    const authHeader = request.headers.authorization; // Get authorization header
    if (!authHeader) {
      response.status(401).json({ error: 'Unauthorized' }); // Send error if no auth header
      return; // Exit early
    }

    try {
      // Decode base64 credentials
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const email = auth[0]; // Extract email
      const pass = sha1(auth[1]); // Hash the password

      const user = await dbClient.getUser({ email }); // Retrieve user from database
      // console.log('USER IN AUTH GETCONNECT()', user);

      if (!user) {
        response.status(401).json({ error: 'Unauthorized' }); // Send error if user not found
        return; // Exit early
      }

      if (pass !== user.password) {
        response.status(401).json({ error: 'Unauthorized' }); // Send error if password does not match
        return; // Exit early
      }

      const token = uuidv4(); // Generate a new UUID token
      const key = `auth_${token}`; // Create a key for Redis
      const duration = (60 * 60 * 24); // Set token expiration duration (24 hours)
      await redisClient.set(key, user._id.toString(), duration); // Store user ID in Redis with the token

      response.status(200).json({ token }); // Send the token as response
    } catch (err) {
      console.log(err); // Log any errors that occur
      response.status(500).json({ error: 'Server error' }); // Send server error response
    }
  }

  // Handle user logout and token invalidation
  static async getDisconnect(request, response) {
    try {
      const userToken = request.header('X-Token'); // Get user token from headers
      // console.log('USER TOKEN DISCONNECT', userToken);
      const userKey = await redisClient.get(`auth_${userToken}`); // Get user key from Redis

      // console.log('USER KEY DISCONNECT', userKey);
      if (!userKey) {
        response.status(401).json({ error: 'Unauthorized' }); // Send error if token not found
        return; // Exit early
      }

      await redisClient.del(`auth_${userToken}`); // Delete the token from Redis
      response.status(204).send('Disconnected'); // Send success response for disconnection
    } catch (err) {
      console.log(err); // Log any errors that occur
      response.status(500).json({ error: 'Server error' }); // Send server error response
    }
  }
}

// Export the AuthController for use in other modules
export default AuthController;