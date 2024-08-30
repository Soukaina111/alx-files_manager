import DBClient from './utils/db'; // Import database client utility

const Bull = require('bull'); // Import Bull for queue management
const { ObjectId } = require('mongodb'); // Import ObjectId for MongoDB
const imageThumbnail = require('image-thumbnail'); // Import image-thumbnail for thumbnail generation
const fs = require('fs'); // Import file system module
const fileQueue = new Bull('fileQueue'); // Create a queue for file processing
const userQueue = new Bull('userQueue'); // Create a queue for user processing

// Function to create an image thumbnail
const createImageThumbnail = async (path, options) => {
  try {
    const thumbnail = await imageThumbnail(path, options); // Generate thumbnail
    const pathNail = `${path}_${options.width}`; // Define thumbnail path

    await fs.writeFileSync(pathNail, thumbnail); // Save thumbnail to disk
  } catch (error) {
    console.log(error); // Log any errors that occur
  }
};

// Process jobs in the file queue
fileQueue.process(async (job) => {
  const { fileId } = job.data; // Extract fileId from job data
  if (!fileId) throw Error('Missing fileId'); // Check for missing fileId

  const { userId } = job.data; // Extract userId from job data
  if (!userId) throw Error('Missing userId'); // Check for missing userId

  // Retrieve the file document from the database
  const fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!fileDocument) throw Error('File not found'); // Check if file exists

  // Create thumbnails of different sizes
  createImageThumbnail(fileDocument.localPath, { width: 500 });
  createImageThumbnail(fileDocument.localPath, { width: 250 });
  createImageThumbnail(fileDocument.localPath, { width: 100 });
});

// Process jobs in the user queue
userQueue.process(async (job) => {
  const { userId } = job.data; // Extract userId from job data
  if (!userId) throw Error('Missing userId'); // Check for missing userId

  // Retrieve the user document from the database
  const userDocument = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!userDocument) throw Error('User not found'); // Check if user exists

  console.log(`Welcome ${userDocument.email}`); // Log welcome message for the user
});