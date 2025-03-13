'use strict'

var recorder = undefined;
var audioContext = undefined;
var audioStream = undefined;

var soundfile = undefined;

window.onload = UserInterfaceReady;

function UserInterfaceReady() {

    if ((stt_id == null) || (stt_id.length == 0)) {
        //
        let blob = window.URL || window.webkitURL;
        if (blob) {
            _("soundfile").addEventListener('change', function (event) {
                //
                let input = event.target;
                soundfile = input.files[0];

                let mediafileUrl = blob.createObjectURL(soundfile);

                //
                if (soundfile.name.endsWith(".wav") || soundfile.name.endsWith(".mp3")) {
                    createMediaPreview("audio", mediafileUrl);
                }
                else if (soundfile.name.endsWith(".mp4")) {
                    createMediaPreview("video", soundfile);
                }
                else {
                    alert("Unknown media file type");
                    return;
                }
            });
        }
    }
    else {
        // redirect to results page
        uploadCompleted(stt_id)
    }

}

function uploadNextChunk(stt_id, start, chunk) {
    console.log(start);

    //
    var ajax_upload = new XMLHttpRequest();
    ajax_upload.open("POST", GetSttApiUrl() + "/transcribe_long_form_chunk/" + stt_id + "/", false);
    ajax_upload.send(chunk);
}

function uploadChunks(file) {
    var upload_progress = { loaded: 0, total: 0 };
    var ajax = new XMLHttpRequest();

    //
    ajax.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var result = JSON.parse(this.responseText);
            if (result.success == true) {
                var stt_id = result.id;

                // Add the UUID to the logs
                addIDtoLog(stt_id)

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
                                if (result.success == true) {
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

    _("selectFileContainer").style.display = "none";
    _("audioDataSubmit").style.display = "none";

    _("uploadProgressContainer").style.display = "block";

    uploadChunks(soundfile);

}

function uploadProgressEventHandler(event) {
    updateProgressBar(event);
}

function updateProgressBar(progress) {
    console.log(progress.loaded);

    if (progress.loaded > progress.total) {
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
    _("loaded_n_total").innerHTML = "Wedi llwytho " + loadedMb + " megabeit allan o " + totalMb;

    //
    if (progress.loaded == progress.total) {
        _("uploadProgressContainer").style.display = "none";
        _("uploadStreamUploadAnimation").style.display = "block";
    }
}

function uploadCompletedEventHandler(event) {
    var result = JSON.parse(event.target.responseText);
    uploadCompleted(result.id);
}

function uploadCompleted(new_stt_id) {
    stt_id = new_stt_id;
    window.location.href = window.location.href = "/result.html?stt_id=" + new_stt_id
}

function uploadErrorEventHandler(event) {
    _("status").innerHTML = "Methwyd llwytho i fyny.";
}

function uploadAbortEventHandler(event) {
    _("status").innerHTML = "Atalwyd llwytho i fyny.";
}

function startRecording() {

    if (navigator.mediaDevices.getUserMedia === undefined) {
        console.log("This browser doesn't support getUserMedia.");
    }

    try {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                audioStream = stream;

                if (audioContext == undefined) {
                    audioContext = new AudioContext();
                }

                var source = audioContext.createMediaStreamSource(stream);
                recorder = audioRecorder.fromSource(source);
                recorder.record();
            })
            .catch(function (err) {
                console.log("Error occurred while getting audio stream: " + err);
            })
    }
    catch (err) {
        console.log(err.message);
    }
}

function stopRecording() {
    recorder.stop();
    recorder.exportWAV(function (blob) {
        audioStream.getTracks()[0].stop();
        audioStream = undefined;

        soundfile = blob;
        var url = URL.createObjectURL(blob);

        createMediaPreview("audio", url);

    }, true);
    recorder.clear();
}
