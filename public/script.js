let currentUrl = '/rasp?groupId=531030143';
let currentWeek;
let currentDay = new Date().getDay() === 6 ? 5 : new Date().getDay();
let styleSheet = document.createElement("style");
styleSheet.classList.add("style-sheet");

window.addEventListener("resize", () => {
    if (window.innerWidth < 481) {
        enableMobileActions();
    } else if (document.querySelector(".style-sheet")) {
        document.head.removeChild(styleSheet);
    }
});

fetch('/rasp?groupId=531030143')
    .then((data) => data.json())
    .then((res) => {
        console.log(res);
        generateSchedule(res);
        currentWeek = parseInt(res.currentWeek);
        if (currentWeek === 1) {
            document.querySelector("#previousWeek").style.visibility = "hidden";
        } else {
            document.querySelector("#previousWeek").style.visibility = "visible";
        }

        fetch('/groupsAndTeachers')
            .then((data) => data.json())
            .then((res) => {
                console.log(res);
                let selectElement = document.querySelector("#select");
                for (let group of res.groupsAndTeachers) {
                    let groupElement = document.createElement("option");
                    groupElement.innerHTML = group.name;
                    groupElement.setAttribute("value", group.link);
                    selectElement.appendChild(groupElement);
                }
                selectElement.addEventListener("change", () => {
                    getNewData(selectElement.value);
                    document.querySelector(".selected-group").innerHTML = res.groupsAndTeachers.find((a) => a.link === selectElement.value).name;
                    selectElement.value = "Выбрать";
                })
            })
    })

function enableMobileActions(goNextDay = undefined) {
    styleSheet.innerText = "";
    if (typeof goNextDay !== "undefined") {
        document.head.removeChild(styleSheet);
        if (goNextDay) {
            currentDay++;
            if (currentDay === 6) {
                currentDay = 0;
            }
        } else {
            currentDay--;
            if (currentDay === -1) {
                currentDay = 5;
            }
        }
    }

    for (let i = 0; i < 6; i++) {
        if (i === currentDay) continue;
        styleSheet.innerText += `
            .column-${i} {
                display: none;
            }
            
        `
    }
    document.head.appendChild(styleSheet);
}

function getNewData(url) {
    currentUrl = url;
    fetch(url)
        .then((data) => data.json())
        .then((res) => {
            generateSchedule(res);
            console.log(res);
            currentWeek = parseInt(res.currentWeek);
            document.querySelector("#previousWeek").style.visibility = `${currentWeek === 1 ? "hidden" : "visible"}`;
        })
}

function generateSchedule(data) {
    if (window.innerWidth < 481) {
        enableMobileActions();
    }
    let table = document.querySelector("#schedule");
    for (let child of table.childNodes) {
        table.removeChild(child);
    }
    table.insertRow();
    if (data.dates.length === 0) {
        table.querySelector("tr").insertCell().appendChild(document.createTextNode("Расписание отсутствует"));
        return;
    }
    table.querySelector("tr").insertCell().appendChild(document.createTextNode("Время"));

    for (let i = 0; i < data.dates.length; i++) {
        let entity = table.querySelector("tr").insertCell();
        entity.appendChild(document.createTextNode(data.dates[i]));
        entity.classList.add(`column-${i}`);
    }
    let rows = [];
    for (let time of data.leftColumn) {
        let row = table.insertRow();
        rows.push(row);
        row.insertCell().appendChild(document.createTextNode(time));
    }
    data.lessons = data.lessons.slice(6, data.lessons.length);
    for (let i = 0; i < data.leftColumn.length; i++) {
        for (let j = 0; j < 6; j++) {
            if (!data.lessons[j].subject) {
                rows[i].insertCell().classList.add(`column-${j}`);
                continue;
            }
            console.log(i, j);
            let dayData = data.lessons[j];
            let groupsInfo = dayData.groups;
            let resultDiv = document.createElement("div");
            resultDiv.innerHTML = `${dayData.subject}<br>${dayData.place}<br>`;
            let teacherLink = document.createElement("div");
            teacherLink.innerHTML = JSON.parse(dayData.teacher).name;
            teacherLink.addEventListener("click", () => {
                getNewData(JSON.parse(dayData.teacher).link);
                document.querySelector(".selected-group").innerHTML = JSON.parse(dayData.teacher).name;
            });
            teacherLink.classList.add("teacher-link");
            resultDiv.appendChild(teacherLink);
            for (let group of groupsInfo) {
                let parsedGroup = JSON.parse(group);
                let groupLink = document.createElement("div");
                groupLink.innerHTML = parsedGroup.name;
                if (parsedGroup.link) {
                    groupLink.classList.add("group-link");
                    groupLink.addEventListener("click", () => {
                        getNewData(parsedGroup.link);
                        document.querySelector(".selected-group").innerHTML = parsedGroup.name;
                    });
                }
                resultDiv.appendChild(groupLink);
            }
            let cell = rows[i].insertCell();
            cell.appendChild(resultDiv);
            cell.classList.add(`column-${j}`);
        }
        console.log(rows[i]);
        data.lessons = data.lessons.slice(6, data.lessons.length);
    }
}

function changeWeek(goNextPage) {
    let index = currentUrl.indexOf("&");
    if (index !== -1) {
        currentUrl = currentUrl.slice(0, index);
    }
    currentUrl += "&selectedWeek=" + (goNextPage ? ++currentWeek : --currentWeek);
    getNewData(currentUrl);
}