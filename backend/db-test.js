const mysql = require('mysql2');
console.log('Attempting direct MySQL connection...');

// Create the connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mindfulmeet'
});

// Connect and test
connection.connect((err) => {
  if (err) {
    console.error('Failed to connect to MySQL:', err);
    return;
  }
  
  console.log('Connected to MySQL database successfully!');
  
  // Test query
  connection.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return;
    }
    console.log('Test query result:', results[0].solution);
    connection.end();
  });
});