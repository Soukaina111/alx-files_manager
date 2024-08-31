const redis = require('redis'); // Import Redis library
// Import promisify utility for using promises
const { promisify } = require('util'); 

class RedisClient {
  constructor() {
    this.client = redis.createClient(); // Create a Redis client instance
    // Promisify the get method
    this.getAsync = promisify(this.client.get).bind(this.client); 
    // Handle connection errors
    this.client.on('error', (error) => {
      console.log(`Redis client not connected to the server: ${error.message}`);
    });
  }

  // Check if the Redis client is connected
  isAlive() {
    return this.client.connected;
  }

  // Retrieve a value by key using the promisified method
  async get(key) {
    return this.getAsync(key);
  }

  // Set a key-value pair with an expiration duration
  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  // Delete a key from Redis
  async del(key) {
    this.client.del(key);
  }
}

// Create an instance of RedisClient
const redisClient = new RedisClient();

// Export the Redis client for use in other modules
export default redisClient;