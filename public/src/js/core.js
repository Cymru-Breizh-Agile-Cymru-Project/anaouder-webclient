'use strict'

//const STT_BASE_API_URL="https://stt-br.techiaith.cymru/api";
const STT_BASE_API_URL = "http://localhost:5511";

var nextSegmentStart = 0;

var params = (new URL(window.location)).searchParams;
var stt_id = params.get("stt_id");
var api_ver = params.get("api_ver");

let mediaEle = undefined;

//
function _(id) {
    return document.getElementById(id);
}


function getSttIDLog() {
    let log_string = localStorage.getItem("stt_ids")
    if (log_string == null)
        log_string = ""
    return log_string.split("|").filter(str => str.length > 0)
}

function addIDtoLog(stt_id) {
    let stt_ids = getSttIDLog();
    stt_ids.push(stt_id);
    localStorage.setItem("stt_ids", stt_ids.join("|"))
}

function activateSubmit() {
    const button = _("submit-button")
    button.disabled = false;
    button.innerText = "Transcribe file"
}

function GetSttApiUrl() {
    return STT_BASE_API_URL;
}

function createMediaPreview(type, src) {

    mediaEle = document.createElement(type);
    if (type == "video") {
        mediaEle.setAttribute("height", 480);
        mediaEle.setAttribute("width", 640);
    }
    //
    mediaEle.setAttribute("src", src);
    mediaEle.setAttribute("controls", "controls");

    mediaEle.ontimeupdate = function () { mediaTimeUpdate() };

    //
    let mediaFilePreview = _("mediaFilePreview");
    mediaFilePreview.innerHTML = "";
    mediaFilePreview.append(mediaEle);
}

function mediaTimeUpdate() {
    populateTranscription(mediaEle.currentTime);
}
