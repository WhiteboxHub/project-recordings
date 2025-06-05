
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const mysql = require("mysql2");
const { spawn } = require("child_process");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const connection = mysql.createConnection(dbConfig);
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

const subjectMapping = {
  SDLC: 65,
  "JIRA-Agile": 4,
  UNIX: 12,
  "HTTP Webservices": 1,
  RestAssured: 23,
  NOSQL: 5,
  MYSQL: 5,
  SQL1: 5,
  SQL2: 5,
  SQL3: 5,
  SQL4: 5,
  SQL5: 5,
  Python: 59,
  HTML: 64,
  HTML5: 29,
  CSS: 6,
  "Tailwind CSS": 46,
  DOM: 47,
  ReactJS: 42,
  Router: 48,
  Redux: 27,
  Webpack: 36,
  NextJS: 49,
  Cypress: 11,
  GraphQL: 13,
  MongoDB: 7,
  NodeJS: 34,
  ExpressJS: 35,
  ReactNative: 43,
  "Software Architecture": 2,
  NumPy: 54,
  Pandas: 55,
  Matplotlib: 63,
  EssentialMathForML: 56,
  SuperivisedLearningAlgorithms: 57,
  UnsupervisedLearningAlgorithms: 58,
  "ReinforcementLearning ": 62,
  NeuralNetwork: 60,
  DeepLearning: 61,
  "NaturalLanguageProcess(NLP)": 51,
  "Gen AI": 52,
  "ComputerVisionTechnigues(CVT)": 53,
  Docker: 67,
  "Git and GitHub": 66,
  RestApi: 68,
  Pytorch: 52,
  ML: 54,
  "Scikit Learn": 56
};

async function uploadVideo(filePath, auth) {
  console.log("Starting upload process for:", filePath);
  try {
    const youtube = google.youtube({ version: "v3", auth });
    const fileSize = fs.statSync(filePath).size;

    const fileName = path.basename(filePath);
    const parts = fileName.split("_");
    const batchId = parts[1];
    const subject = parts[4].split(".")[0];
    const subjectId = subjectMapping[subject];

    if (!subjectId) {
      console.error("Invalid subject:", subject);
      return;
    }

    const res = await youtube.videos.insert(
      {
        part: "snippet,status",
        notifySubscribers: false,
        requestBody: {
          snippet: {
            title: fileName,
            description: fileName,
          },
          status: {
            privacyStatus: "unlisted",
            quality: "high",
          },
        },
        media: {
          body: fs.createReadStream(filePath),
        },
      },
      {
        onUploadProgress: (evt) => {
          const progress = (evt.bytesRead / fileSize) * 100;
          console.log(`${Math.round(progress)}% complete`);
        },
      }
    );

    console.log("Upload complete:", res.data);
    console.log("YouTube Video ID:", res.data.id);

    const videoId = res.data.id;
    const videoTitle = res.data.snippet.title;
    const currentDate = new Date();
    const batchname = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    const classDate = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

    const lastModDateTime = currentDate.toISOString().slice(0, 10);
    const youtubeLink = `https://www.youtube.com/watch?v=${videoId}`;

    const query = `
            INSERT INTO recording (
                batchname, description, type, classdate, link, videoid, subject, filename, lastmoddatetime, new_subject_id
            ) VALUES (?, ?, 'class', ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      batchname,
      videoTitle,
      classDate,
      youtubeLink,
      videoId,
      subject,
      fileName,
      lastModDateTime,
      subjectId,
    ];

    connection.query(query, values, (err, results) => {
      if (err) {
        console.error("Error inserting video ID into MySQL:", err);
      } else {
        console.log("Video ID inserted into MySQL:", results);

        const additionalQuery = `
        INSERT INTO whitebox_learning.recording_batch (recording_id, batch_id)
        SELECT nr.id AS recording_id, b.batchid AS batch_id
        FROM recording nr
        JOIN batch b ON nr.batchname = b.batchname
        WHERE NOT EXISTS (
            SELECT 1
            FROM recording_batch rb
            WHERE rb.recording_id = nr.id
            AND rb.batch_id = b.batchid
        );
    `;

        connection.query(additionalQuery, (err, results) => {
          if (err) {
            console.error("Error executing additional query:", err);
          } else {
            console.log("Additional query executed successfully:", results);

            // ✅ Absolute path to Python script
            const scriptPath = path.resolve(__dirname, "backup_script.py");

            console.log(` Running Python script at: ${scriptPath}`);
            console.log(` Video to process: ${filePath}`);

            const convertProcess = spawn("python", [scriptPath, filePath]);

            convertProcess.stdout.on("data", (data) => {
              console.log(` Python stdout: ${data}`);
            });

            convertProcess.stderr.on("data", (data) => {
              console.error(`Python stderr: ${data}`);
            });

            convertProcess.on("close", (code) => {
              if (code === 0) {
                console.log(`✅ Python script completed successfully for: ${filePath}`);
              } else {
                console.error(`❌ Python script failed for ${filePath} with exit code ${code}`);
              }
            });
          }
        });
      }
    });

    return res.data;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
}

module.exports = uploadVideo;

