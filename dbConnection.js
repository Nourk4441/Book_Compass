const mysql = require('mysql');

const connection = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"Nour@2002",
    database:"sys"
});

connection.connect(function(error){
    if(error) throw error
    else console.log('connected to database')
})

module.exports=connection