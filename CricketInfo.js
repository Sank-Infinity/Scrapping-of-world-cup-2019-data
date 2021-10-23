
// node CricketInfo.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=worldCup.csv --jsonFile=teams.json --folder=data

// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let fs = require("fs");
let excel = require("excel4node");
let pdf = require("pdf-lib");
const { match } = require("assert");
let path = require("path");

let args = minimist(process.argv);

let promise = axios.get(args.source);

promise.then(function(response){

    let html = response.data;
    
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let title = document.querySelector("title");
    console.log(title.textContent);

    let matchesDiv = document.querySelectorAll("div.match-score-block");
    // console.log(matchesDiv.length);

    let matchesObject = [];

    for(let i = 0; i< matchesDiv.length; i++){

        let match = matchesDiv[i];

        let Object = {
            status : "",
            team1 : "",
            team2 : "",
            team1Score : "",
            team2Score : "",
            result : ""
        }; 

        let status = match.querySelector("div.match-info > div.description");
        // console.log(status.textContent)
        Object.status = status.textContent;

        let result = match.querySelector("div.status-text");
        // console.log(result.textContent);
        Object.result = result.textContent;

        let teams = match.querySelectorAll("p.name");
        // console.log(teams[0].textContent);
        // console.log(teams[1].textContent);
        Object.team1 = teams[0].textContent;
        Object.team2 = teams[1].textContent;


        let scores = match.querySelectorAll("span.score");
        // console.log(scores.length);

        if(scores.length==2){
            Object.team1Score = scores[0].textContent;
            Object.team2Score = scores[1].textContent;
        }else if(scores.length==1){
            Object.team1Score = scores[0].textContent;
            Object.team2Score = "";
        }else{
            Object.team1Score = "";
            Object.team2Score = "";
        }

        matchesObject.push(Object);
    }
    
    // console.log(matchesObject);

    let totalTeams = [];

    for(let i = 0; i < matchesObject.length; i++){
        extractAllTeams(totalTeams, matchesObject[i]);
    }
    
    // console.log(totalTeams);

    for(let i = 0; i < matchesObject.length; i++){
        seperateAllTeamMathces(totalTeams, matchesObject[i]);
    }

    let totalTeamsJSON = JSON.stringify(totalTeams);
    // console.log(totalTeamsJSON);
    fs.writeFileSync(args.jsonFile, totalTeamsJSON, "utf-8");

    // Create Excel sheet
    let workBook = new excel.Workbook();

    for(let i = 0; i<totalTeams.length; i++){
        writeInExelFile(workBook, totalTeams[i]);
    }

    workBook.write(args.excel);

    createFolder(totalTeams);

    
});

function extractAllTeams(totalTeams, match){

    let idx1 = -1;
    for(let i = 0; i<totalTeams.length; i++){
        if(totalTeams[i].name == match.team1){
            idx1 = i;
        }
    }

    if(idx1==-1){
        totalTeams.push({
            name : match.team1,
            matches : []
        });
    }

    let idx2 = -1;
    for(let i = 0; i<totalTeams.length; i++){
        if(totalTeams[i].name == match.team2){
            idx2 = i;
        }
    }

    if(idx2==-1){
        totalTeams.push({
            name : match.team2,
            matches : []
        });
    }


}

function seperateAllTeamMathces(totalTeams, match){

    let idx1 = -1;
    for(let i = 0; i<totalTeams.length; i++){

        if(totalTeams[i].name==match.team1){
            totalTeams[i].matches.push({
                opponent : match.team2,
                selfScore : match.team1Score,
                opponentScore : match.team2Score,
                result : match.result
            })
        }

    }

    let idx2 = -1;
    for(let i = 0; i<totalTeams.length; i++){

        if(totalTeams[i].name==match.team2){
            totalTeams[i].matches.push({
                opponent : match.team1,
                selfScore : match.team2Score,
                opponentScore : match.team1Score,
                result : match.result
            })
        }

    }



}

function writeInExelFile(workBook, team ){
    
    let workSheet = workBook.addWorksheet(team.name);
    
    workSheet.cell(1,1).string("opponent");
    workSheet.cell(1,2).string("SelfScore");
    workSheet.cell(1,3).string("opponentScore");
    workSheet.cell(1,4).string("Result");


    for(let i = 0; i < team.matches.length; i++){
        workSheet.cell(i + 2, 1).string(team.matches[i].opponent);
        workSheet.cell(i + 2, 2).string(team.matches[i].selfScore);
        workSheet.cell(i + 2, 3).string(team.matches[i].opponentScore);
        workSheet.cell(i + 2 ,4).string(team.matches[i].result);
    }

}

function createFolder(totalTeams){
    
    fs.mkdirSync(args.folder);

    for(let i = 0; i < totalTeams.length; i++){

        let subFolder = path.join(args.folder, totalTeams[i].name);
        fs.mkdirSync(subFolder);

        for(let j = 0; j < totalTeams[i].matches.length; j++){
            let fileName = path.join(subFolder, (j+1) + totalTeams[i].matches[j].opponent + ".pdf" );
            createScoreCard(totalTeams[i].name, totalTeams[i].matches[j], fileName);
        }

    }
}

function createScoreCard(teamName, match, matchFileName){

    let t1 = teamName;
    let t2 = match.opponent;
    let t1Score = match.selfScore;
    let t2Score = match.opponentScore;
    let result = match.result;

    let byteOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfDocPromise = pdf.PDFDocument.load(byteOfPDFTemplate);

    pdfDocPromise.then(function(pdfDoc){

        let page = pdfDoc.getPage(0);

        page.drawText(t1 , {
            x: 320,
            y: 660,
            size: 16
        });
        page.drawText(t2, {
            x: 320,
            y: 625,
            size: 16
        });
        page.drawText(t1Score, {
            x: 320,
            y: 595,
            size: 16
        });
        page.drawText(t2Score, {
            x: 320,
            y: 565,
            size: 16
        });
        page.drawText(result, {
            x: 320,
            y: 535,
            size: 16
        });

        let finalPDFBytePromise = pdfDoc.save();
        finalPDFBytePromise.then(function(finalPDFBytes){

            fs.writeFileSync(matchFileName, finalPDFBytes);

        });

    });


}
