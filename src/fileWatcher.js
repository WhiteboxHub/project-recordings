
// ---------------****************************---------Class recordings------------------




// const chokidar = require('chokidar');
// const path = require('path');
// const fs = require('fs');
// const mysql = require('mysql2');
// const uploadVideo = require('./uploader');
// require('dotenv').config();


// // Set up MySQL connection
// const dbConfig = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
// };
// const connection = mysql.createConnection(dbConfig);


// function watchFolder(uploadPath, donePath, auth) {
//     const watcher = chokidar.watch(uploadPath, {
//         persistent: true,
//         ignoreInitial: true,
//         followSymlinks: false,
//         depth: 0,
//         awaitWriteFinish: {
//             stabilityThreshold: 2000,
//             pollInterval: 100,
//         },
//     });

//     watcher.on('add', async (filePath) => {
//         console.log(`File added: ${filePath}`);

//         try {
//             const fileName = path.basename(filePath);

//             // Check if video has already been uploaded
//             const query = 'SELECT COUNT(*) AS count FROM new_recording WHERE filename = ?';
//             connection.query(query, [fileName], async (err, results) => {
//                 if (err) {
//                     console.error('Error querying MySQL:', err);
//                     return;
//                 }

//                 if (results[0].count > 0) {
//                     console.log(`Video already uploaded and saved to DB: ${fileName}`);
//                     return; // Exit if video already exists
//                 }

//                 // Proceed with video upload if not already in DB
//                 const videoDetails = await uploadVideo(filePath, auth);
//                 console.log(`Video uploaded successfully. YouTube Video ID: ${videoDetails.id}`);

//                 // Move file to donePath after upload
//                 const doneFilePath = path.join(donePath, fileName);
//                 fs.renameSync(filePath, doneFilePath);
//                 console.log(`Moved uploaded file to: ${doneFilePath}`);
//             });
//         } catch (error) {
//             console.error(`Error processing file ${filePath}:`, error);
//         }
//     });

//     watcher.on('error', (error) => {
//         console.error('Error watching folder:', error);
//     });
// }

// module.exports = watchFolder;




// **************************for sessions recordings**********************



// const chokidar = require('chokidar');
// const path = require('path');
// const fs = require('fs');
// const mysql = require('mysql');
// const uploadVideo = require('./uploader');
// require('dotenv').config();

// // Set up MySQL connection
// const dbConfig = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
// };
// const connection = mysql.createConnection(dbConfig);

// function watchFolder(uploadPath, donePath, auth) {
//     const watcher = chokidar.watch(uploadPath, {
//         persistent: true,
//         ignoreInitial: true,
//         followSymlinks: false,
//         depth: 0,
//         awaitWriteFinish: {
//             stabilityThreshold: 2000,
//             pollInterval: 100,
//         },
//     });

//     watcher.on('add', async (filePath) => {
//         console.log(`File added: ${filePath}`);

//         try {
//             const fileName = path.basename(filePath);

//             if (fileName.startsWith('Class')) {
//                 // Existing logic for Class files
//                 const query = 'SELECT COUNT(*) AS count FROM new_recording WHERE filename = ?';
//                 connection.query(query, [fileName], async (err, results) => {
//                     if (err) {
//                         console.error('Error querying MySQL:', err);
//                         return;
//                     }

//                     if (results[0].count > 0) {
//                         console.log(`Video already uploaded and saved to DB: ${fileName}`);
//                         return; // Exit if video already exists
//                     }

//                     const videoDetails = await uploadVideo(filePath, auth);
//                     console.log(`Video uploaded successfully. YouTube Video ID: ${videoDetails.id}`);

//                     const doneFilePath = path.join(donePath, fileName);
//                     fs.renameSync(filePath, doneFilePath);
//                     console.log(`Moved uploaded file to: ${doneFilePath}`);
//                 });
//             } else if (fileName.startsWith('Session')) {
//                 // New logic for Session files
//                 const query = 'SELECT COUNT(*) AS count FROM new_session WHERE title = ?';
//                 connection.query(query, [fileName], async (err, results) => {
//                     if (err) {
//                         console.error('Error querying MySQL:', err);
//                         return;
//                     }

//                     if (results[0].count > 0) {
//                         console.log(`Session already uploaded and saved to DB: ${fileName}`);
//                         return; // Exit if session already exists
//                     }

//                     const videoDetails = await uploadVideo(filePath, auth);
//                     console.log(`Video uploaded successfully. YouTube Video ID: ${videoDetails.id}`);

//                     const doneFilePath = path.join(donePath, fileName);
//                     fs.renameSync(filePath, doneFilePath);
//                     console.log(`Moved uploaded file to: ${doneFilePath}`);
//                 });
//             }
//         } catch (error) {
//             console.error(`Error processing file ${filePath}:`, error);
//         }
//     });

//     watcher.on('error', (error) => {
//         console.error('Error watching folder:', error);
//     });
    
// }

// module.exports = watchFolder;


// ***************************************-------------------------------*********************************************

const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const uploadVideo = require('./uploader');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// 🔁 Function to run the Python script with the uploaded file path
function callPythonScript(doneFilePath) {
  const scriptPath = path.resolve(__dirname, 'backup_script.py');
  console.log(` Running Python script at: ${scriptPath}`);
  console.log(` Video to process: ${doneFilePath}`);

  const command = `python "${scriptPath}" "${doneFilePath}"`;

  const python = spawn(command, { shell: true });

  python.stdout.on('data', (data) => {
    console.log(` Python stdout: ${data}`);
  });

  python.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });

  python.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Python script completed successfully for: ${doneFilePath}`);
    } else {
      console.error(`❌ Python script failed for ${doneFilePath} with exit code ${code}`);
    }
  });
}

async function watchFolder(uploadPath, donePath, auth) {
  const connection = await mysql.createConnection(dbConfig);

  const watcher = chokidar.watch(uploadPath, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on('add', async (filePath) => {
    if (path.extname(filePath).toLowerCase() !== '.mp4') return;

    const fileName = path.basename(filePath);
    console.log(`📥 File added: ${filePath}`);

    try {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) AS count FROM recording WHERE filename = ?',
        [fileName]
      );

      if (rows[0].count > 0) {
        console.log(`⚠️ Already processed: ${fileName}`);
        return;
      }

      const videoDetails = await uploadVideo(filePath, auth);
      console.log(`📤 Video uploaded successfully. YouTube Video ID: ${videoDetails.id}`);

      const doneFilePath = path.join(donePath, fileName);
      fs.renameSync(filePath, doneFilePath);
      console.log(`📁 Moved uploaded file to: ${doneFilePath}`);

      // ✅ Run Python script AFTER move
      callPythonScript(doneFilePath);

    } catch (err) {
      console.error(`❌ Error processing ${fileName}:`, err);
    }
  });

  watcher.on('error', (err) => {
    console.error('Watcher error:', err);
  });

  console.log(` Watching folder: ${uploadPath}`);
}

module.exports = watchFolder;

