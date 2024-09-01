import express from 'express'; // Import the Express framework
import controllerRouting from './routes/index'; // Import routing logic from the routes directory

const app = express(); // Create an instance of an Express application
const port = process.env.PORT || 5000; // Set the port to either the environment variable or fallback to 5000

app.use(express.json()); // Middleware to parse JSON request bodies
controllerRouting(app); // Apply routing logic to the app

app.listen(port, () => { // Start the server and listen on the specified port
  console.log(`Server running on port ${port}`); // Log the running status
});

export default app; // Export the app for use in other modules