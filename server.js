import express from 'express'; // Import Express framework
import controllerRouting from './routes/index'; // Import routing controller

const app = express(); // Create an Express application
const port = process.env.PORT || 5000; // Set port from environment variable or default to 5000

app.use(express.json()); // Middleware to parse JSON request bodies
controllerRouting(app); // Set up routing for the application

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Log server start message
});

// Export the Express app for use in other modules
export default app;