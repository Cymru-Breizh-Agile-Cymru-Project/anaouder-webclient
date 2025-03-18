
'use strict'

window.onload = UserInterfaceReady

function addTranscriptionLinks() {
    let pageUrl = location.origin + location.pathname;
    let transcription_url = pageUrl + "?stt_id=" + stt_id;

    let sttid_value = _("sttid_value")
    sttid_value.href = transcription_url
    sttid_value.innerText = stt_id
}

function UserInterfaceReady() {
    // If no stt_id was provided, redirect to homepage
    if ((stt_id == null) || (stt_id.length == 0)) {
        window.location.href = "/"
    }

    addTranscriptionLinks();

    _("transcriptions").innerHTML = "";

    //
    createMediaPreview("audio", GetSttApiUrl() + "/get_wav/?stt_id=" + stt_id);

    //
    //fetchTranscription();

    //
    initialiseDownloadTranscriptionsButtons();

    submitGetStatus()
}



function fetchTranscription() {
    var ajax_transcription = new XMLHttpRequest();
    ajax_transcription.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            transcriptionJson = JSON.parse(this.responseText);
            populateTranscription(0);
        }
    }

    //
    ajax_transcription.open("GET", GetSttApiUrl() + "/get_json/?stt_id=" + stt_id, false);

    //
    ajax_transcription.send();
}

function populateTranscription(currentTime) {

    if (transcriptionJson == undefined)
        return;

    if (currentTime < nextSegmentStart)
        return;

    _("transcriptionContent").innerHTML = "";

    let transcriptionTableEle = document.createElement("table")
    transcriptionTableEle.classList.add("table");

    for (var tx = 0; tx < transcriptionJson["segments"].length; tx++) {
        let transcription = transcriptionJson["segments"][tx];

        //
        let transcriptionRowEle = document.createElement("tr");
        let startEle = document.createElement("td");
        startEle.innerText = transcription.start;
        transcriptionRowEle.append(startEle);

        let endEle = document.createElement("td");
        endEle.innerText = transcription.end;
        transcriptionRowEle.append(endEle);

        let textEle = document.createElement("td");
        textEle.innerText = transcription.text;
        transcriptionRowEle.append(textEle);

        if (currentTime > transcription.start && currentTime < transcription.end) {
            startEle.setAttribute("style", "font-weight:bold;");
            endEle.setAttribute("style", "font-weight:bold;");
            textEle.setAttribute("style", "font-weight:bold;");
            transcriptionRowEle.scrollIntoView();

            //
            nextSegmentStart = transcription.end;
        }

        transcriptionTableEle.append(transcriptionRowEle);
    }
    _("transcriptionContent").append(transcriptionTableEle);
}

function submitGetStatus() {
    fetch(GetSttApiUrl() + "/get_status?stt_id=" + stt_id)
        .then(res => res.json())
        .then(out => {
            console.log(out)
            if(out['status'] == "Success" || out['status'] == "SUCCESS"){
                _("transcribeResultsContainer").style.display = "block"
                const content =  _("transcriptionContent")
                fetch(GetSttApiUrl() + "/get_text?stt_id=" + stt_id)
                    .then(res => res.text())
                    .then(out => {
                        console.log(out)
                        content.innerHTML = out.split("\n").join("<br/>")
                    })
                    .catch(err => console.log(err));
            
            }
        })
        .catch(err => console.log(err));
}

function initialiseDownloadTranscriptionsButtons() {

    if (stt_id == null) return;
    if (stt_id.length == 0) return;

    _("transriptionCompletedResultsContainer").style.display = "block";

    var _url = window.location.protocol + "//" + window.location.host + window.location.pathname;

    var btnDownload_VTT = _("btnDownloadVTT");
    if (btnDownload_VTT) {
        btnDownload_VTT.setAttribute("href", GetSttApiUrl() + "/get_vtt/?stt_id=" + stt_id);
        btnDownload_VTT.setAttribute("download", stt_id + ".vtt");
    }

    var btnDownload_SRT = _("btnDownloadSRT");
    if (btnDownload_SRT) {
        btnDownload_SRT.setAttribute("href", GetSttApiUrl() + "/get_srt/?stt_id=" + stt_id);
        btnDownload_SRT.setAttribute("download", stt_id + ".srt");
    }

    var btnDownload_Elan = _("btnDownloadElan");
    if (btnDownload_Elan) {
        btnDownload_Elan.setAttribute("href", GetSttApiUrl() + "/get_elan/?stt_id=" + stt_id);
        btnDownload_Elan.setAttribute("download", stt_id + ".eaf");
    }

    var btnDownload_Elan = _("btnDownloadText");
    if (btnDownload_Elan) {
        btnDownload_Elan.setAttribute("href", GetSttApiUrl() + "/get_text/?stt_id=" + stt_id);
        btnDownload_Elan.setAttribute("download", stt_id + ".txt");
    }

    var btnDownload_Json = _("btnDownloadJson");
    if (btnDownload_Json) {
        btnDownload_Json.setAttribute("href", GetSttApiUrl() + "/get_json/?stt_id=" + stt_id);
        btnDownload_Json.setAttribute("download", stt_id + ".json");
    }

    var btnDownload_VadJson = _("btnDownloadVadJson");
    if (btnDownload_VadJson) {
        btnDownload_VadJson.setAttribute("href", GetSttApiUrl() + "/get_vad_json/?stt_id=" + stt_id);
        btnDownload_VadJson.setAttribute("download", stt_id + ".json");
    }

    var btnDownload_VadCsv = _("btnDownloadVadCsv");
    if (btnDownload_VadCsv) {
        btnDownload_VadCsv.setAttribute("href", GetSttApiUrl() + "/get_vad_csv/?stt_id=" + stt_id);
        btnDownload_VadCsv.setAttribute("download", stt_id + ".csv");
    }

    var btnDownload_Wav = _("btnDownladWav");
    if (btnDownload_Wav) {
        btnDownload_Wav.setAttribute("href", GetSttApiUrl() + "/get_wav/?stt_id=" + stt_id);
        btnDownload_Wav.setAttribute("download", stt_id + ".wav");
    }

    /*
    var btnDownload_Mp3 = _("btnDownladMp3");
    if (btnDownload_Mp3) {
        btnDownload_Mp3.setAttribute("href", GetSttApiUrl() + "/get_mp3/?stt_id=" + stt_id);
        btnDownload_Mp3.setAttribute("download", stt_id + ".mp3");
    }
    */

}