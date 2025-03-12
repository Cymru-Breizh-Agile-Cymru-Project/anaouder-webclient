
    'use strict'

    const STT_BASE_API_URL="https://stt-br.techiaith.cymru/api";
    //const STT_BASE_API_URL="http://localhost:5011";
    
    //
    var stt_id = '';
    var api_ver = undefined;

    var nextSegmentStart = 0;
    
    var params = (new URL(window.location)).searchParams;
    stt_id = params.get("stt_id");
    api_ver = params.get("api_ver");

    var mediaEle = undefined;
    var transcriptionJson = undefined;

    var recorder = undefined;
    var audioContext = undefined;
    var audioStream = undefined;

    var soundfile = undefined;


    //
    function _(id){
        return document.getElementById(id);
    }


    function GetSttApiUrl(){
        return STT_BASE_API_URL; 
    }

    function createMediaPreview(type, src){

        mediaEle = document.createElement(type);
        if (type=="video"){
            mediaEle.setAttribute("height",480);
            mediaEle.setAttribute("width",640);
        }
        //
        mediaEle.setAttribute("src", src);
        mediaEle.setAttribute("controls", "controls");

        mediaEle.ontimeupdate = function() { mediaTimeUpdate() };
        
        //
        let mediaFilePreview = _("mediaFilePreview");
        mediaFilePreview.innerHTML = "";
        mediaFilePreview.append(mediaEle);
    }

    function addTranscriptionLinks() {
        let pageUrl = location.origin + location.pathname;
        let transcription_url = pageUrl + "?stt_id=" + stt_id;

        _("sttid_value").innerHTML = 
            "<p>" +
            "<a href=\"" + pageUrl + "\">Submit again a different file</a>" + 
            "</p>" +
            "<p>" +
            "<a href=\"" + transcription_url + "\">" + stt_id + "</a>" +
            "</p>";
    }

    function UserInterfaceReady(){

        if ((stt_id==null) || (stt_id.length==0)) {
            //
            let blob = window.URL || window.webkitURL;
            if (blob) {    
                _("soundfile").addEventListener('change', function(event){
                    //
                    let input = event.target;
                    soundfile = input.files[0];

                    let mediafileUrl = blob.createObjectURL(soundfile);
                    
                    //
                    if (soundfile.name.endsWith(".wav") || soundfile.name.endsWith(".mp3"))
                    { 
                        createMediaPreview("audio", mediafileUrl);   
                    } 
                    else if ( soundfile.name.endsWith(".mp4")) 
                    {
                        createMediaPreview("video", soundfile);
                    }
                    else
                    {
                        alert("Unknown media file type");
                        return;
                    }
                });
            }
        }
        else 
        {
            //
            _("selectFileContainer").style.display="none";
            _("audioDataSubmit").style.display="none";

            //
            _("transcribeResultsContainer").style.display="block";

            addTranscriptionLinks();

            _("transcriptions").innerHTML = "";

            //
            createMediaPreview("audio", GetSttApiUrl() + "/get_wav/?stt_id=" + stt_id);

            //
            fetchTranscription();

            //
            initialiseDownloadTranscriptionsButtons();
        }

    }

    function fetchTranscription(){
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

    function populateTranscription(currentTime){
        
        if (transcriptionJson == undefined)
            return;

        if (currentTime < nextSegmentStart)
            return;

        _("transcriptionContent").innerHTML="";

        let transcriptionTableEle = document.createElement("table")
        transcriptionTableEle.classList.add("table");

        for (var tx=0; tx<transcriptionJson["segments"].length; tx++)
        {
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

            if (currentTime > transcription.start && currentTime < transcription.end){
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

    function mediaTimeUpdate() {
        populateTranscription(mediaEle.currentTime);
    }

    function uploadNextChunk(stt_id, start, chunk){
        console.log(start);
        
        //
        var ajax_upload = new XMLHttpRequest();
        ajax_upload.open("POST", GetSttApiUrl() + "/transcribe_long_form_chunk/" + stt_id + "/", false);
        ajax_upload.send(chunk);
    }

    function uploadChunks(file) {
        var upload_progress = {loaded: 0, total: 0};
        var ajax = new XMLHttpRequest();
        
        //
        ajax.onreadystatechange = function () { 
            if (this.readyState == 4 && this.status == 200) {
                var result = JSON.parse(this.responseText);
                if (result.success==true) {
                    var stt_id = result.id;

                    let start = 0;
                    const chunkSize = 1024 * 1024; // !Mb

                    upload_progress.total = file.size;
                    updateProgressBar(upload_progress);

                    //
                    let uploadIntervalId = setInterval(() => {
                        var end = start + chunkSize;
                        var chunk = file.slice(start, end);
                        
                        //
                        uploadNextChunk(stt_id, start, chunk);

                        upload_progress.loaded = end;
                        updateProgressBar(upload_progress);

                        start = end;
                        if (start > file.size) {
                            
                            clearInterval(uploadIntervalId);

                            // finished...
                            var ajax_begin_transcribing = new XMLHttpRequest();
                            ajax_begin_transcribing.onreadystatechange = function () { 
                                if (this.readyState == 4 && this.status == 200) {
                                    var result = JSON.parse(this.responseText);
                                    if (result.success==true) {
                                        uploadCompleted(stt_id);
                                    }
                                }
                            }

                            //
                            ajax_begin_transcribing.open("GET", GetSttApiUrl() + "/transcribe_long_form_begin/" + stt_id + "/", false);

                            //
                            ajax_begin_transcribing.send();

                        }
                    }, 100);
                }
            }
        }
        ajax.open("GET", GetSttApiUrl() + "/transcribe_long_form_initiate/", true); 
        ajax.send(); 
    } 

    function SubmitFileForUpload() {

        if (soundfile == undefined)
            return;

        _("selectFileContainer").style.display="none";
        _("audioDataSubmit").style.display="none";

        _("uploadProgressContainer").style.display="block";

        uploadChunks(soundfile);
        
    }

    function uploadProgressEventHandler(event) {
        updateProgressBar(event);
    }

    function updateProgressBar(progress) {
        console.log(progress.loaded);

        if (progress.loaded > progress.total){
            progress.loaded = progress.total;
        }

        //
        var percent = (progress.loaded / progress.total) * 100;

        _("progressBar").value = Math.round(percent);
        _("status").innerHTML = Math.round(percent) + "% wedi ei llwytho i fyny.";

        var loadedMb = progress.loaded / 1024 / 1024;
        var totalMb = progress.total / 1024 / 1024;

        //
        loadedMb = loadedMb.toFixed(2);
        totalMb = totalMb.toFixed(2);

        //
        _("loaded_n_total").innerHTML = "Wedi llwytho "  + loadedMb + " megabeit allan o " + totalMb;

        //
        if (progress.loaded  == progress.total) {
            _("uploadProgressContainer").style.display="none";
            _("uploadStreamUploadAnimation").style.display="block";
        }
    }

    function uploadCompletedEventHandler(event) {
        var result = JSON.parse(event.target.responseText);
        uploadCompleted(result.id);
    }

    function uploadCompleted(new_stt_id){
        stt_id = new_stt_id;

        addTranscriptionLinks();
        
        //
        _("uploadStreamUploadAnimation").style.display="none";

        //
        _("transcribeResultsContainer").style.display="block";
        _("transcriptionInProgressContainer").style.display="block";
    }

    function uploadErrorEventHandler(event) {
        _("status").innerHTML = "Methwyd llwytho i fyny.";
    }

    function uploadAbortEventHandler(event) {
        _("status").innerHTML = "Atalwyd llwytho i fyny.";
    }

    function submitGetStatus(){
        var ajax = new XMLHttpRequest(); 
        ajax.onload = function () { 
            if (this.readyState == 4) { 
                var result = JSON.parse(this.responseText);
                if (result.status=="SUCCESS") {
                    _("transcriptionInProgressContainer").style.display="none";
                    _("transcriptions").innerHTML = "";
                    initialiseDownloadTranscriptionsButtons();
                    //fetchTranscription();
                } else {
                    _("transcriptions").innerHTML = _("transcriptions").innerHTML + this.responseText; 
                }
            }
        }
        ajax.open("GET", GetSttApiUrl() + "/get_status/?stt_id=" + stt_id, true); 
        ajax.send(); 
    }

    function initialiseDownloadTranscriptionsButtons(){

        if (stt_id==null) return;
        if (stt_id.length==0) return;

        _("transriptionCompletedResultsContainer").style.display="block";

        var _url =  window.location.protocol + "//" + window.location.host + window.location.pathname;
        
        var btnDownload_VTT = _("btnDownloadVTT");
        if (btnDownload_VTT){
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

    function startRecording(){
    	
    	if (navigator.mediaDevices.getUserMedia === undefined) {
    	    console.log("This browser doesn't support getUserMedia.");
    	}

        try{
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream){
                audioStream = stream;
                
                if(audioContext==undefined){
                    audioContext = new AudioContext();
                }

                var source = audioContext.createMediaStreamSource(stream);
                recorder = audioRecorder.fromSource(source);
                recorder.record();
            })
            .catch(function(err){
                console.log("Error occurred while getting audio stream: " + err);
            })
        }
        catch (err){
            console.log(err.message);
        }
    }

    function stopRecording(){
    	recorder.stop();
    	recorder.exportWAV(function(blob){
            audioStream.getTracks()[0].stop();
            audioStream = undefined;
            
            soundfile = blob;
            var url = URL.createObjectURL(blob);
            
            createMediaPreview("audio", url);
            
        }, true);
        recorder.clear();
    }
