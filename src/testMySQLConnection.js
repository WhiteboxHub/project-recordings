
const mysql = require('mysql2/promise');

// Create a database pool
const pool = mysql.createPool({
    host: '35.193.16.142',
    user: 'whitebox_learning',
    password: 'Innovapath1',
    database: 'whitebox_learning',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Function to execute a query within a transaction
async function executeTransaction(query, values) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); // Start transaction
        const [result] = await connection.execute(query, values); // Execute query
        await connection.commit(); // Commit transaction
        return result; // Return query result
    } catch (error) {
        await connection.rollback(); // Rollback transaction on error
        console.error("Transaction failed:", error.message);
        throw error;
    } finally {
        connection.release(); // Release the connection
    }
}

module.exports = { executeTransaction };
