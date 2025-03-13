
window.onload = function () {
    populatelog();
};

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function populatelog() {
    const table = _("log-table")
    let stt_ids = getSttIDLog().reverse()
    stt_ids.forEach(stt_id => {
        // Create row and add elements
        let row = document.createElement("tr")

        // Create the link
        var a = document.createElement('a');
        var linkText = document.createTextNode(stt_id);
        a.appendChild(linkText);
        a.title = stt_id;
        a.href = "/?stt_id=" + stt_id;
        let first = document.createElement("td")
        first.appendChild(a)
        row.append(first)

        let date = document.createElement("td");

        // Create the status element
        let status = document.createElement("td")
        status.innerText = "Unknown"
        fetch(STT_BASE_API_URL + "/get_status/?stt_id=" + stt_id)
            .then(res => res.json())
            .then(out => {
                console.log(out)
                status.innerText = capitalizeFirstLetter(out['status'].toLowerCase())
                if ('done' in out){
                    let done = new Date(out['done'])
                    date.innerText = done.toLocaleString()
                }
            })
            .catch(err => console.log(err));
        row.appendChild(status)
        row.appendChild(date);

        // Add row to table
        table.appendChild(row)
    });
}