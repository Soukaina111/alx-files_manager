import sha1 from 'sha1'; // Import SHA-1 hashing library
import { ObjectId } from 'mongodb'; // Import ObjectId for MongoDB
import dbClient from '../utils/db'; // Import database client utility
import redisClient from '../utils/redis'; // Import Redis client utility

class UsersController {
  // Create a new user
  static async postNew(request, response) {
    const { email, password } = request.body; // Destructure email and password from request body

    // Check for missing email
    if (!email) {
      response.status(400).json({ error: 'Missing email' }); // Send error response
      return; // Exit early if email is missing
    }
    
    // Check for missing password
    if (!password) {
      response.status(400).json({ error: 'Missing password' }); // Send error response
      return; // Exit early if password is missing
    }

    const hashPwd = sha1(password); // Hash the password using SHA-1

    try {
      const collection = dbClient.db.collection('users'); // Get users collection
      const user1 = await collection.findOne({ email }); // Check if user already exists

      // If user already exists, send error response
      if (user1) {
        response.status(400).json({ error: 'Already exist' });
      } else {
        // Insert new user into the collection
        await collection.insertOne({ email, password: hashPwd });
        const newUser = await collection.findOne(
          { email }, { projection: { email: 1 } } // Retrieve only the email
        );
        response.status(201).json({ id: newUser._id, email: newUser.email }); // Send success response
      }
    } catch (error) {
      console.log(error); // Log any errors that occur
      response.status(500).json({ error: 'Server error' }); // Send server error response
    }
  }

  // Retrieve the current user's information
  static async getMe(request, response) {
    try {
      const userToken = request.header('X-Token'); // Get user token from headers
      const authKey = `auth_${userToken}`; // Create authentication key
      const userID = await redisClient.get(authKey); // Retrieve user ID from Redis using token

      // If user ID is not found, send unauthorized response
      if (!userID) {
        response.status(401).json({ error: 'Unauthorized' });
        return; // Exit early if user is unauthorized
      }

      const user = await dbClient.getUser({ _id: ObjectId(userID) }); // Retrieve user from database
      response.json({ id: user._id, email: user.email }); // Send user information as response
    } catch (error) {
      console.log(error); // Log any errors that occur
      response.status(500).json({ error: 'Server error' }); // Send server error response
    }
  }
}

// Export the UsersController for use in other modules
export default UsersController;