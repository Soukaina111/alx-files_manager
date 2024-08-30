import redisClient from '../utils/redis'; // Import Redis client utility
import dbClient from '../utils/db'; // Import database client utility

class AppController {
  // Get the status of Redis and database connections
  static getStatus(request, response) {
    try {
      const redis = redisClient.isAlive(); // Check if Redis is alive
      const db = dbClient.isAlive(); // Check if database is alive
      response.status(200).send({ redis, db }); // Send status as response
    } catch (error) {
      console.log(error); // Log any errors that occur
    }
  }

  // Get statistics about users and files in the database
  static async getStats(request, response) {
    try {
      const users = await dbClient.nbUsers(); // Get number of users
      const files = await dbClient.nbFiles(); // Get number of files
      response.status(200).send({ users, files }); // Send stats as response
    } catch (error) {
      console.log(error); // Log any errors that occur
    }
  }
}

// Export the AppController for use in other modules
export default AppController;