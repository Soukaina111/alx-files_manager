import express from 'express'; // Import Express framework
import AppController from '../controllers/AppController'; // Import AppController for app-related routes
import UsersController from '../controllers/UsersController'; // Import UsersController for user-related routes
import AuthController from '../controllers/AuthController'; // Import AuthController for authentication routes
import FilesController from '../controllers/FilesController'; // Import FilesController for file-related routes

const router = express.Router(); // Create a new router instance

const routeController = (app) => {
  app.use('/', router); // Use the router for the root path

  // App Controller routes
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res); // Get application status
  });

  router.get('/stats', (req, res) => {
    AppController.getStats(req, res); // Get application statistics
  });

  // Users Controller routes
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res); // Create a new user
  });

  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res); // Get current user details
  });

  // Authentication Controller routes
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res); // Connect user
  });

  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res); // Disconnect user
  });

  // Files Controller routes
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res); // Upload a new file
  });

  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res); // Get a file by ID
  });

  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res); // Get a list of files
  });

  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res); // Publish a file by ID
  });

  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res); // Unpublish a file by ID
  });

  router.post('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res); // Get file data by ID
  });
};

// Export the routeController function for use in other modules
export default routeController;