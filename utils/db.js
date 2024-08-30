import { MongoClient } from 'mongodb'; // Import MongoDB client

// Set database connection parameters from environment variables or defaults
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`; // Construct the MongoDB connection URL

class DBClient {
  constructor() {
    this.db = null; // Initialize the database reference as null
    // Connect to the MongoDB server
    MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
      if (error) console.log(error); // Log any connection errors
      this.db = client.db(database); // Set the database reference
      // Create necessary collections
      this.db.createCollection('users');
      this.db.createCollection('files');
    });
  }

  // Check if the database client is alive
  isAlive() {
    return !!this.db; // Return true if db is initialized
  }

  // Get the number of users in the 'users' collection
  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  // Retrieve a user by a query
  async getUser(query) {
    console.log('QUERY IN DB.JS', query); // Log the query for debugging
    const user = await this.db.collection('users').findOne(query); // Find a single user
    console.log('GET USER IN DB.JS', user); // Log the retrieved user
    return user; // Return the user object
  }

  // Get the number of files in the 'files' collection
  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

// Create an instance of DBClient
const dbClient = new DBClient();

// Export the database client for use in other modules
export default dbClient;