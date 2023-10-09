const { exec } = require('child_process');
var express = require('express');
const { stderr } = require('process');
var app = express();

function getDate() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2,'0');
    const day = String(currentDate.getDate()).padStart(2,'0');
    const hours = String(currentDate.getHours()).padStart(2,'0');
    const minutes = String(currentDate.getMinutes()).padStart(2,'0');
    const seconds = String(currentDate.getSeconds()).padStart(2,'0');

    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDateTime;
}

app.get("/", async (req,res) => {
    var runTimeDate = getDate();
    console.log(`[${runTimeDate}]: Function Start`)

    const codeDir = 'code'
    const codeName = 'index'
    // exec(`node /${codeDir}/${codeName}`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`Error executing function: ${error.message}`)
    //         return;
    //     }
    //     if (stderr) {
    //         console.error(`Stderr: ${stderr}`);
    //         return;
    //     }
    //     try {
    //         const respFromCode = stdout;
    //         console.log(respFromCode);
    //         res.send('Hello World')
    //     } catch(err) {
    //         console.error(`Error parsing JSON: ${err.message}`)
    //     }
    // })
    const functionInvoke = require(`/${codeDir}/${codeName}`)
    const event = null;
    const context = null;
    const result = await functionInvoke.handlers(event,context);
    res.json(result);

    runTimeDate = getDate();
    console.log(`[${runTimeDate}]: Function End`)
})

const port = 9000

app.listen(port, ()=>{
    console.log(`Server is running on http://localhost:${port}`)
})
