import Queue from 'bull'; // Import Bull for queue management
import { ObjectId } from 'mongodb'; // Import ObjectId for MongoDB
import { v4 as uuidv4 } from 'uuid'; // Import UUID generation for unique file identifiers
import { mkdir, writeFile, readFileSync } from 'fs'; // Import file system functions
import mime from 'mime-types'; // Import mime-types for handling file types
import dbClient from '../utils/db'; // Import database client utility
import { getIdAndKey, isValidUser } from '../utils/users'; // Import user utility functions

class FilesController {
  // Handle file upload
  static async postUpload(request, response) {
    const fileQ = new Queue('fileQ'); // Create a new queue for file processing
    const dir = process.env.FOLDER_PATH || '/tmp/files_manager'; // Set directory for file storage

    const { userId } = await getIdAndKey(request); // Get user ID from token
    if (!isValidUser(userId)) return response.status(401).send({ error: 'Unauthorized' }); // Check user validity

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) }); // Find user in database
    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Check if user exists

    const fileName = request.body.name; // Get file name from request
    if (!fileName) return response.status(400).send({ error: 'Missing name' }); // Check for missing name

    const fileType = request.body.type; // Get file type from request
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return response.status(400).send({ error: 'Missing type' }); // Validate file type

    const fileData = request.body.data; // Get file data from request
    if (!fileData && fileType !== 'folder') return response.status(400).send({ error: 'Missing data' }); // Check for missing data

    const publicFile = request.body.isPublic || false; // Determine if file is public
    let parentId = request.body.parentId || 0; // Get parent ID from request
    parentId = parentId === '0' ? 0 : parentId; // Normalize parent ID

    // Validate parent file if it exists
    if (parentId !== 0) {
      const parentFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!parentFile) return response.status(400).send({ error: 'Parent not found' }); // Check parent existence
      if (parentFile.type !== 'folder') return response.status(400).send({ error: 'Parent is not a folder' }); // Validate parent type
    }

    // Prepare data for file insertion
    const fileInsertData = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: publicFile,
      parentId,
    };

    // Handle folder creation
    if (fileType === 'folder') {
      await dbClient.files.insertOne(fileInsertData); // Insert folder into database
      return response.status(201).send(fileInsertData); // Send response with folder details
    }

    const fileUid = uuidv4(); // Generate a unique ID for the file
    const decData = Buffer.from(fileData, 'base64'); // Decode base64 file data
    const filePath = `${dir}/${fileUid}`; // Define file storage path

    // Create directory if it doesn't exist
    mkdir(dir, { recursive: true }, (error) => {
      if (error) return response.status(400).send({ error: error.message });
    });

    // Write file to disk
    writeFile(filePath, decData, (error) => {
      if (error) return response.status(400).send({ error: error.message });
    });

    fileInsertData.localPath = filePath; // Store local path in file data
    await dbClient.files.insertOne(fileInsertData); // Insert file data into database

    fileQ.add({ // Add file processing job to the queue
      userId: fileInsertData.userId,
      fileId: fileInsertData._id,
    });

    return response.status(201).send(fileInsertData); // Send response with file details
  }

  // Retrieve a specific file's information
  static async getShow(request, response) {
    const { userId } = await getIdAndKey(request); // Get user ID from token
    if (!isValidUser(userId)) return response.status(401).send({ error: 'Unauthorized' }); // Check user validity

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) }); // Find user in database
    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Check if user exists

    const fileId = request.params.id || ''; // Get file ID from request parameters
    const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return response.status(404).send({ error: 'Not found' }); // Check if file exists

    return response.status(200).send({ // Send file information as response
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Retrieve a list of files
  static async getIndex(request, response) {
    const { userId } = await getIdAndKey(request); // Get user ID from token
    if (!isValidUser(userId)) return response.status(401).send({ error: 'Unauthorized' }); // Check user validity

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) }); // Find user in database
    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Check if user exists

    let parentId = request.query.parentId || 0; // Get parent ID from query parameters
    if (parentId === '0') parentId = 0; // Normalize parent ID
    if (parentId !== 0) {
      if (!isValidUser(parentId)) return response.status(401).send({ error: 'Unauthorized' }); // Validate user for parent ID

      parentId = ObjectId(parentId); // Convert to ObjectId

      const folder = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!folder || folder.type !== 'folder') return response.status(200).send([]); // Check if parent is a folder
    }

    const page = request.query.page || 0; // Get pagination page from query

    const agg = { $and: [{ parentId }] }; // Prepare aggregation query
    let aggData = [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];
    if (parentId === 0) aggData = [{ $skip: page * 20 }, { $limit: 20 }];

    const pageFiles = await dbClient.files.aggregate(aggData); // Execute aggregation query
    const files = []; // Initialize array for files

    // Collect files from aggregation result
    await pageFiles.forEach((file) => {
      const fileObj = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      files.push(fileObj); // Add file object to array
    });

    return response.status(200).send(files); // Send list of files as response
  }

  // Publish a file (make it public)
  static async putPublish(request, response) {
    const { userId } = await getIdAndKey(request); // Get user ID from token
    if (!isValidUser(userId)) return response.status(401).send({ error: 'Unauthorized' }); // Check user validity

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) }); // Find user in database
    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Check if user exists

    const fileId = request.params.id || ''; // Get file ID from request parameters

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return response.status(404).send({ error: 'Not found' }); // Check if file exists

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return response.status(200).send({ // Send updated file information as response
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Unpublish a file (make it private)
  static async putUnpublish(request, response) {
    const { userId } = await getIdAndKey(request); // Get user ID from token
    if (!isValidUser(userId)) return response.status(401).send({ error: 'Unauthorized' }); // Check user validity

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) }); // Find user in database
    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Check if user exists

    const fileId = request.params.id || ''; // Get file ID from request parameters

    let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return response.status(404).send({ error: 'Not found' }); // Check if file exists

    await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

    return response.status(200).send({ // Send updated file information as response
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Retrieve file content
  static async getFile(request, response) {
    const fileId = request.params.id || ''; // Get file ID from request parameters
    const size = request.query.size || 0; // Get requested size from query

    const file = await dbClient.files.findOne({ _id: ObjectId(fileId) }); // Find file in database
    if (!file) return response.status(404).send({ error: 'Not found' }); // Check if file exists

    const { isPublic, userId, type } = file; // Destructure file properties

    const { userId: user } = await getIdAndKey(request); // Get user ID from token

    // Check access permissions for the file
    if ((!isPublic && !user) || (user && userId.toString() !== user && !isPublic)) return response.status(404).send({ error: 'Not found' });
    if (type === 'folder') return response.status(400).send({ error: 'A folder doesn\'t have content' }); // Validate file type

    const path = size === 0 ? file.localPath : `${file.localPath}_${size}`; // Determine file path based on size

    try {
      const fileData = readFileSync(path); // Read file data from disk
      const mimeType = mime.contentType(file.name); // Get MIME type for the file
      response.setHeader('Content-Type', mimeType); // Set response content type
      return response.status(200).send(fileData); // Send file data as response
    } catch (err) {
      return response.status(404).send({ error: 'Not found' }); // Handle file read errors
    }
  }
}

// Export the FilesController for use in other modules
export default FilesController;
