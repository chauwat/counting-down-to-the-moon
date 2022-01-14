
var Queue = [];
var Timer = null;

var status = ""
// call API
var Plans = [
    // {
    //     name: "coding mc",
    //     hh: 0,
    //     mm:30,
    //     ss: 0
    // },
];

// call API
var CurrentPlan = {
    // name: "Coding mc",
    // hh: 0,
    // mm: 3,
    // ss: 0
}

function main() {
    resetTimer();
    fetchData();
    _fetchTimer = setInterval(fetchUpdate, 1000);
}

function fetchData() {
    fetch('/schedule')
        .then((response)=>response.json())
        .then(function(data) {
            Plans = data.result;
            renderPlan();
        });
    fetch('/status')
        .then((response)=>response.json())
        .then(function(data) {
            status = data.status;
            if (status == "alert") document.getElementById("skip").disabled = true;
            else document.getElementById("skip").disabled = false;
            fetch('/currentplan')
                .then((response)=>response.json())
                .then(function(data){
                    CurrentPlan = data.result;
                    renderCurrentPlan(1);
                    if (CurrentPlan.name == null) return;

                    future = data.result.future;
                    if (status == "ready")
                        if (Timer == null) {
                            Timer = setInterval(displayInterval, 100);
                        }
                    if (status == "pause") {
                        future = new Date().valueOf() + data.result.interval;
                        document.getElementById("pause").innerHTML = "Continue";
                        document.getElementById("pause").setAttribute('state', 1);
                        displayInterval();
                    }

                });
        });
}

var all = null;
var _pauseAt = new Date();
function fetchUpdate() {
    if (new Date() - _pauseAt < 2000) return;
    fetch('/status')
        .then((response)=>response.json())
        .then(function({status: _status, all: _all}) {
            if (all == null) all = _all;
            // console.log(all, _all);
            // schedule change
            if (all != _all) {
                all = _all;
                fetchData();
            }

            if (status == _status) return;

            // Pause state
            // state = 0; Pause
            // state = 1; Continue
            if (_status == "pause") {
                // pause -> continue
                pause(document.getElementById("pause"), 0);
            } else if (_status == "ready" && 
                document.getElementById("pause").getAttribute("state") == 1) {
                // continue -> pause
                pause(document.getElementById("pause"), 0);
            }

            // status change
            status = _status;
        });
}

function renderPlan() {
    // render Plans
    myList = document.getElementById('list');
    render = '';
    for (var i=0; i<Plans.length; i++) {
        plan = Plans[i];
        render += `
        <div class="list">
            <div class="list-left">
                <h4 style="margin: 0; margin-left: 5px; margin-bottom: 8px;">${plan.name}</h4>
                <span>+ ${add0(plan.hh)} : ${add0(plan.mm)} : ${add0(plan.ss)}</span>
            </div>
            <div class="list-right">
                <button class="btn btn-edit" onclick="editSchedule(${i})">Edit</button>
                <button class="btn btn-delete" onclick="deleteSchedule(${i})">-</button>
            </div>
        </div>`
    }
    myList.innerHTML = render;
}

function deleteSchedule(i){
    Plans.splice(i,1);
    fetch(`/schedule/${i}` ,{method: ['DELETE']})
    renderPlan();
}

function renderCurrentPlan(renderOnly = 0) {
    // render Current Plan, renderOnly = update text only NOT countdown 
    if (CurrentPlan.name == null) {
        document.getElementById("activity").innerHTML = "TIMER";
        return;
    }
    var {name, hh, mm, ss} = CurrentPlan;
    document.getElementById("activity").innerHTML = name;
    if (renderOnly) {
        if (hh == null) return;
        document.getElementById("timer").innerHTML = `${add0(hh)}:${add0(mm)}:${add0(ss)}`;
    } else {
        countDown(hh, mm, ss);
    }
}

function addSchedule() {
    openPopup();
    editpopup({name: '', hh: '', mm: '', ss: '', type: 1});

}

function editSchedule(x) {
    openPopup();
    document.getElementById("popup").setAttribute('a', x);
    editpopup({...Plans[x], type: 0});
}

function editpopup( {name, hh, mm, ss, type} ) {
    document.getElementById("popup").setAttribute('type', type);
    document.getElementById("activityname").value = name;
    document.getElementById("hours").value = hh;
    document.getElementById("minutes").value = mm;
    document.getElementById("seconds").value = ss;
}

function closee(){
    document.getElementById("popup").classList.add("hide");
}


function closePopup() {
    var type = document.getElementById("popup").getAttribute('type');
    var name = document.getElementById("activityname").value;
    hh = document.getElementById("hours").value;
    mm = document.getElementById("minutes").value;
    ss = document.getElementById("seconds").value;
    if(name == "" || ss == "") return;
    if (hh == "") hh = 0; else hh = parseInt(hh);
    if (mm == "") mm = 0; else mm = parseInt(mm);
    if (ss == "") ss = 0; else ss = parseInt(ss);

    if (type==1) {
        // ADD
        if (CurrentPlan.name == null) {
            CurrentPlan = {name, hh, mm, ss};
            renderCurrentPlan();
            CurrentPlan.future = future;
            // call api
            fetch('/currentplan', {
                method : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(CurrentPlan)
            });
        } else {
            // add schedule
            Plans.push({name,hh,mm,ss});
            renderPlan();
            // call API
            fetch('/schedule', {
                method : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({name, hh, mm, ss})
            });
        }
    } else {
        // EDIT
        i = document.getElementById("popup").getAttribute('a');
        fetch(`/schedule/${i}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({name, hh, mm, ss})
        });
        Plans[i] = {name,hh,mm,ss}
        renderPlan();
    }

    box = document.getElementById("popup");
    box.classList.add("hide");
}

function openPopup() {
    box = document.getElementById("popup");
    box.classList.remove("hide");
}

function add0(x) {
    if (x < 10) return `0${x}`;
    return x;
}
    
var future;
function countDown(
        hours = document.getElementById("hours").value,
        minutes = document.getElementById("minutes").value,
        seconds = document.getElementById("seconds").value
    ) { 
    // 1 get input from user
    
    // 2 find total interval in ms
    seconds = seconds*1000
    minutes = minutes*60*1000
    hours = hours*60*60*1000;
    
    total = hours+minutes+seconds;
    
    // 3 find future date time 
    future = (new Date().valueOf()) + total + 900;

    if (Timer == null) {
        Timer = setInterval(displayInterval, 100);
    }
}

var present, interval;
function displayInterval() {
    // 4 find time-interval ( hh mm ss )
    present = new Date().valueOf();
    interval = new Date(future-present);

    if (interval.valueOf() < 800) {
        // Time Out! //
        document.getElementById("skip").disabled = true;
    
        // Call API, wait for hardware to call reset()   :>
        clearInterval(Timer);
        Timer = null;
        return;
    }
        
    hh = interval.getUTCHours();
    mm = interval.getMinutes();
    ss = interval.getSeconds();
    document.getElementById("timer").innerHTML = `${add0(hh)}:${add0(mm)}:${add0(ss)}`;
}

function pause(ele, send=1) {
    state = ele.getAttribute('state');
    // state = 0; Pause
    // state = 1; Continue
    if (state == 0 && Timer == null) return;
    if (send) {
        _pauseAt = new Date();
    }
    if (state == 0) {
        clearInterval(Timer);
        status = "pause"
        Timer = null;
        ele.innerHTML = "Continue";
        ele.setAttribute('state', 1);
        if (!send) return;
        // call API, send interval
        fetch('/pause', {
            method : "POST",
            headers : { "Content-Type": "application/json" },
            body: JSON.stringify({interval : interval.valueOf()})
        })
    } else {
        future = future + (new Date().valueOf() - present);
        continueToPause(ele);
        status = "ready"
        if (Timer == null) {
            Timer = setInterval(displayInterval, 100);
        }
        if (!send) return;
        // call API, send future
        fetch('/continue', {
            method : "POST",
            headers : { "Content-Type": "application/json" },
            body: JSON.stringify({future : future})
        })
    }
}

function continueToPause(ele) {
    ele.innerHTML = "Pause";
    ele.setAttribute('state', 0);
}

function skip() {
    // delete currentplan when press skip bttton
    // fetch('/currentplan', {method: "DELETE"})

    // delete first schedule when press skip button
    // if (Plans.length != 0) {
    //     fetch('/schedule/0', {method: "DELETE"})
    // }

    fetch('/skip');
    _pauseAt = new Date();

    continueToPause(document.getElementById("pause"))
    if (Plans.length == 0){
        // No Schedule -> RESET TIMER
        resetTimer();
        return;
    }

    CurrentPlan = Plans.shift();
    renderCurrentPlan();
    renderPlan();
    CurrentPlan.future = future;
    fetch ('/currentplan', {
        method : "POST",
        headers : { "Content-Type": "application/json" },
        body: JSON.stringify(CurrentPlan)
    });
}

function resetTimer() {
    CurrentPlan = {name: "TIMER", hh: 0, mm:0, ss:0};
    renderCurrentPlan(1);
    CurrentPlan = {};
    clearInterval(Timer);
    Timer = null;
}

// var sum;
// function TimetoMS(x){
//     hh = x["hh"]*60*60*1000;
//     mm = x["mm"]*60*1000;
//     ss = x["ss"]*1000;
//     sum = hh+mm+ss;
//     return sum;
// }


function reset() {
    skip();
    document.getElementById("skip").disabled = false;
}