/*
===================================================
            Starting Point
===================================================
*/
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000


/*
===================================================
            Middleware
===================================================
*/

app.use(express.json())
app.use(cors())

app.get('/', (req, res)=>{
    res.send('The server is running')
})

app.listen(port, ()=>{
    console.log(`The server is running on port ${port}`);
})
