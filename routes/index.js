import express from 'express'; // Import the Express framework
import AppController from '../controllers/AppController'; // Import the AppController for app-related routes
//import UsersController from '../controllers/UsersController'; // Import the UsersController for user-related routes
//import AuthController from '../controllers/AuthController'; // Import the AuthController for authentication routes
//import FilesController from '../controllers/FilesController'; // Import the FilesController for file-related routes

const router = express.Router(); // Create a new router instance

const routeController = (app) => {
  app.use('/', router); // Mount the router on the root path

  // App Controller
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res); // Handle GET request for app status
  });

  router.get('/stats', (req, res) => {
    AppController.getStats(req, res); // Handle GET request for app statistics
  });

  /* User-related routes
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res); // Handle POST request to create a new user
  });

 //Authentication routes
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res); // Handle GET request for user connection
  });

  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res); // Handle GET request for user disconnection
  });

  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res); // Handle GET request to retrieve current user info
  });

  // File-related routes
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res); // Handle POST request to upload a new file
  });

  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res); // Handle GET request to show a specific file by ID
  });

  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res); // Handle GET request to list all files
  });

  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res); // Handle PUT request to publish a file by ID
  });

  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res); // Handle PUT request to unpublish a file by ID
  });

  router.post('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res); // Handle POST request to retrieve data for a specific file by ID
  });

*/
};
export default routeController;
