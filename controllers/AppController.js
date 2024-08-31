import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * Returns the status of Redis and DB: { "redis": true, "db": true }
   * with a 200 status code.
   */
  static getStatus(request, response) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    response.status(200).send(status);
  }

  /**
   * Returns the number of users and files: { "users": 12, "files": 1231 }
   * with a 200 status code.
   */
  static async getStats(request, response) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    response.status(200).send(stats);
  }
}

module.exports = AppController;
