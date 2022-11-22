const PORT = process.env.PORT || 2000;
const XMLHttpRequest = require('xhr2');
const http = require('http');
const express = require('express');
const app = express();
const server = http.Server(app);
const path = require('path');
const bp = require('body-parser');
const HTMLParser = require('node-html-parser');

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});
server.listen(PORT, function() {
    console.log('Server port 2000');
});

app.get('/rasp', (req, res) => {
    console.log(req.url);
    let request = new XMLHttpRequest();
    let url = "https://ssau.ru" + req.url;
    request.open("GET", url, true);
    request.send(null);
    request.onreadystatechange = () => {
        if (request.readyState == 4) {
            let parser = new htmlParser(request.responseText);
            res.send(JSON.stringify(parser.getRasp()));
        }
    };
})

app.get('/groups', (req, res) => {
    let allGroupsHTMLs = [];
    let result = { groups: [] }
    for (let i = 1; i < 6; i++) {
        let request = new XMLHttpRequest();
        let url = "https://ssau.ru/rasp/faculty/492430598?course=" + i;
        request.open("GET", url, true);
        request.send(null);
        request.onreadystatechange = () => {
            if (request.readyState == 4) {
                allGroupsHTMLs.push(request.responseText);
                if (i === 5) {
                    for (let group of allGroupsHTMLs) {
                        let parser = new htmlParser(group);
                        result.groups.push(...parser.getGroups().groups);
                    }
                    res.send(JSON.stringify(result));
                }
            }
        };
    }
})

class htmlParser {
    constructor(htmlString) {
        this.html = htmlString;
    }

    getGroups() {
        let root = HTMLParser.parse(this.html);
        let groups = root.querySelectorAll(".group-catalog__groups > a");
        let result = { groups: [] };
        for (let group of groups) {
            const id = group.getAttribute("href").replace(/\D/g, '');
            result.groups.push({ name: group.innerText, link: `/rasp?groupId=${id}` })
        }
        return result;
    }

    getRasp() {
        let schedule = {
            dates: [],
            lessons: [],
            leftColumn: []
        };
        let root = HTMLParser.parse(this.html);

        for (let cell of root.querySelectorAll(".schedule__item")) {
            if (cell.querySelector(".lesson-color")) {
                let cellGroups = [];
                if (!!cell.querySelectorAll(".schedule__group").length) {
                    for (let group of cell.querySelectorAll(".schedule__group")) {
                        if (group.innerText.trim() !== "") {
                            cellGroups.push(JSON.stringify({
                                name: group.innerText,
                                link: group.getAttribute("href") ?? null
                            }))
                        } else {
                            cellGroups.push(JSON.stringify({
                                name: "",
                                link: null
                            }))
                        }
                    }
                } else if (!!cell.querySelectorAll(".schedule__groups").length) {
                    for (let group of cell.querySelectorAll(".schedule__groups")) {
                        if (group.innerText.trim() !== "") {
                            cellGroups.push(JSON.stringify({
                                name: group.innerText,
                                link: group.getAttribute("href") ?? null
                            }))
                        } else {
                            cellGroups.push(JSON.stringify({
                                name: "",
                                link: null
                            }))
                        }
                    }
                }
                schedule.lessons.push({
                    subject: cell.querySelector(".lesson-color").innerText,
                    place: cell.querySelector(".schedule__place").innerText,
                    teacher: JSON.stringify(cell.querySelector(".schedule__teacher > .caption-text") === null ?
                        {
                            name: "",
                            link: null,
                        } :
                        {
                            name: cell.querySelector(".schedule__teacher > .caption-text") ? cell.querySelector(".schedule__teacher > .caption-text").innerText : "",
                            link: cell.querySelector(".schedule__teacher > .caption-text").getAttribute("href")
                        }),
                    groups: cellGroups
                })
            } else if (!!root.querySelectorAll(".schedule__item + .schedule__head").length && !schedule.dates.length) {
                for (let cell of root.querySelectorAll(".schedule__item + .schedule__head")) {
                    schedule.dates.push(cell.childNodes[0].innerText + cell.childNodes[1].innerText)
                }
            } else {
                schedule.lessons.push({
                    subject: null
                })
            }
        }
        for (let cell of root.querySelectorAll(".schedule__time")) {
            schedule.leftColumn.push(cell.childNodes[0].innerText + " - " + cell.childNodes[1].innerText);
        }
        schedule["currentWeek"] = root.querySelector(".week-nav-current_week")?.innerText;

        return schedule;
    }
}