import { ObjectID } from 'mongodb'; // Import ObjectID type from MongoDB
import fs from 'fs'; // Import filesystem module for file operations
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator for unique file IDs
import Queue from 'bull'; // Import Bull for job queue management
import { findUserIdByToken } from '../utils/others'; // Import helper function to find user by token
import dbClient from '../utils/db'; // Import database client for MongoDB
import redisClient from '../utils/redis'; // Import Redis client for caching

class FilesController {
  /**
   * Should create a new file in DB and on disk
   */
  static async postUpload(request, response) {
    const fileQueue = new Queue('fileQueue'); // Initialize job queue for file processing
    // Retrieve the user based on the token
    const userId = await findUserIdByToken(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' }); // Check if user is authenticated

    let fileInserted;

    // Validate the request data
    const { name } = request.body; // Extract file name from request
    if (!name) return response.status(400).json({ error: 'Missing name' }); // Ensure name is provided
    const { type } = request.body; // Extract file type from request
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing type' }); // Validate file type
    }

    const isPublic = request.body.isPublic || false; // Determine if file should be public
    const parentId = request.body.parentId || 0; // Get parent ID or default to 0 (root)
    const { data } = request.body; // Extract file data from request
    if (!data && !['folder'].includes(type)) {
      return response.status(400).json({ error: 'Missing data' }); // Ensure data is provided for non-folder types
    }

    // Validate parent file if a parentId is provided
    if (parentId !== 0) {
      const parentFileArray = await dbClient.files.find({ _id: ObjectID(parentId) }).toArray();
      if (parentFileArray.length === 0) return response.status(400).json({ error: 'Parent not found' }); // Check if parent exists
      const file = parentFileArray[0];
      if (file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' }); // Ensure parent is a folder
    }

    // If type is 'folder', insert into DB without file data
    if (type === 'folder') {
      fileInserted = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
      });
    } else {
      // If not a folder, store the file on disk
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager'; // Define storage path
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true }, () => {});

      // Create a unique ID and path for the new file
      const filenameUUID = uuidv4(); // Generate a UUID for the file
      const localPath = `${folderPath}/${filenameUUID}`; // Define local file path

      // Decode data and write to the new path
      const clearData = Buffer.from(data, 'base64'); // Decode base64 data
      await fs.promises.writeFile(localPath, clearData.toString(), { flag: 'w+' }); // Write file to disk

      // Insert file metadata into the database
      fileInserted = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath, // Store the local path of the file
      });

      // If the file is an image, additionally queue it for processing
      if (type === 'image') {
        await fs.promises.writeFile(localPath, clearData, { flag: 'w+', encoding: 'binary' }); // Write image data
        await fileQueue.add({ userId, fileId: fileInserted.insertedId, localPath });
      }
    }

    // Return the new file metadata with a status code 201
    return response.status(201).json({
      id: fileInserted.ops[0]._id, userId, name, type, isPublic, parentId,
    });
  }

  // GET /files/:id
  // Return file by fileId
  static async getShow(request, response) {
    // Retrieve the user based on the token
    const token = request.headers['x-token'];
    if (!token) { return response.status(401).json({ error: 'Unauthorized' }); } // Check for token presence
    const keyID = await redisClient.get(`auth_${token}`); // Retrieve user ID from Redis
    if (!keyID) { return response.status(401).json({ error: 'Unauthorized' }); } // Check if user ID exists
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) }); // Find user in database
    if (!user) { return response.status(401).json({ error: 'Unauthorized' }); } // Check if user is valid

    const idFile = request.params.id || ''; // Get file ID from request parameters
    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectID(idFile), userId: user._id }); // Find the specific file
    if (!fileDocument) return response.status(404).send({ error: 'Not found' }); // Check if file exists

    // Return file metadata
    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // GET /files
  // Return the files attached to the user
  static async getIndex(request, response) {
    // Retrieve the user based on the token
    const token = request.headers['x-token'];
    if (!token) { return response.status(401).json({ error: 'Unauthorized' }); } // Check for token presence
    const keyID = await redisClient.get(`auth_${token}`); // Retrieve user ID from Redis
    if (!keyID) { return response.status(401).json({ error: 'Unauthorized' }); } // Check if user ID exists
    const parentId = request.query.parentId || '0'; // Get parent ID from query parameters
    const pagination = request.query.page || 0; // Get pagination page number from query parameters
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(keyID) }); // Find user in database
    if (!user) response.status(401).json({ error: 'Unauthorized' }); // Check if user is valid

    // Prepare aggregation query to fetch files
    const aggregationMatch = { $and: [{ parentId }] }; // Match by parentId
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 }, // Implement pagination
      { $limit: 20 },
    ];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await dbClient.db
      .collection('files')
      .aggregate(aggregateData); // Execute aggregation query
    const filesArray = []; // Array to hold file results
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem); // Add each file item to the array
    });

    return response.send(filesArray); // Return the array of files
  }
}

module.exports = FilesController; // Export the FilesController class
