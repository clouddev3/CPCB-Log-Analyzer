/* =========================================
   GLOBAL VARIABLES
========================================= */

Dropzone.autoDiscover = false;

var uploadedFiles = [];
var parsedTransactions = [];
var currentFilter = "All";
var debounceTimer = null;

/* =========================================
   CACHE SELECTORS
========================================= */

var $loaderOverlay = $("#loaderOverlay");
var $loaderText = $("#loaderText");
var $transactionsTableBody = $("#transactionsTableBody");

/* =========================================
   DATE TIME
========================================= */

function updateDateTime() {

    $("#currentDateTime").text(
        new Date().toLocaleString(
            "en-IN",
            {
                timeZone: "Asia/Kolkata"
            }
        )
    );

}

setInterval(updateDateTime, 1000);

updateDateTime();

/* =========================================
   DROPZONE
========================================= */

var logDropzone = new Dropzone(
    "#logDropzone",
    {

        url: "/",

        autoProcessQueue: false,

        acceptedFiles: ".log,.txt",

        addRemoveLinks: true,

        parallelUploads: 1,

        maxFiles: 1,

        maxFilesize: 50,

        previewTemplate: `
            <div class="dz-preview dz-file-preview">

                <div class="dz-details">

                    <div>

                        <div class="dz-filename">
                            <span data-dz-name></span>
                        </div>

                        <div class="dz-size"
                            data-dz-size>

                        </div>

                    </div>

                    <a class="dz-remove"
                        href="javascript:undefined;"
                        data-dz-remove>

                        <i class="fa fa-trash"></i>
                        Remove

                    </a>

                </div>

            </div>
        `,

        init: function () {

            var self = this;

            self.on(
                "maxfilesexceeded",
                function (file) {

                    self.removeAllFiles();

                    uploadedFiles = [];

                    self.addFile(file);

                }
            );

            self.on(
                "addedfile",
                function (file) {

                    uploadedFiles = [file];

                    updateUploadStats();

                }
            );

            self.on(
                "removedfile",
                function () {

                    uploadedFiles = [];

                    updateUploadStats();

                }
            );

        }

    }
);

/* =========================================
   HELPERS
========================================= */

function formatBytes(bytes) {

    if (!bytes) {
        return "0 KB";
    }

    var sizes =
        ["Bytes", "KB", "MB", "GB"];

    var i =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        (
            bytes /
            Math.pow(1024, i)
        ).toFixed(2)
        + " "
        + sizes[i]
    );

}

function updateUploadStats() {

    $("#uploadedFileCount").text(
        uploadedFiles.length
    );

    var totalSize = 0;

    $.each(
        uploadedFiles,
        function (index, file) {

            totalSize += file.size;

        }
    );

    $("#uploadedFileSize").text(
        formatBytes(totalSize)
    );

}

function showLoader(show, text) {

    if (show) {

        $loaderText.text(
            text || "Loading..."
        );

        $loaderOverlay.css(
            "display",
            "flex"
        );

    } else {

        $loaderOverlay.hide();

    }

}

function updateProgress(value) {

    $("#parseProgressBar").css(
        "width",
        value + "%"
    );

}

function convertUtcToIst(dateValue) {

    if (!dateValue) {
        return "";
    }

    var dateObj;

    if (
        typeof dateValue === "number" ||
        /^\d{13}$/.test(dateValue)
    ) {

        dateObj =
            new Date(
                parseInt(dateValue, 10)
            );

    } else {

        dateObj =
            new Date(dateValue);

    }

    if (
        Object.prototype.toString.call(dateObj)
        !== "[object Date]" ||
        isNaN(dateObj.getTime())
    ) {

        return dateValue;

    }

    var options = {

        timeZone: "Asia/Kolkata",

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

        second: "2-digit",

        hour12: true

    };

    return dateObj
        .toLocaleString(
            "en-IN",
            options
        )
        .replace(/,/g, "");

}

function transformJsonDates(obj) {

    if (
        obj === null ||
        obj === undefined
    ) {

        return obj;

    }

    if ($.isArray(obj)) {

        $.each(
            obj,
            function (index, value) {

                obj[index] =
                    transformJsonDates(value);

            }
        );

        return obj;

    }

    if (typeof obj === "object") {

        $.each(
            obj,
            function (key, value) {

                if (
                    typeof value === "number" &&
                    String(value).length === 13
                ) {

                    obj[key] =
                        convertUtcToIst(value);

                } else {

                    obj[key] =
                        transformJsonDates(value);

                }

            }
        );

        return obj;

    }

    return obj;

}

function prettyPrintJSON(json) {

    try {

        var parsedJson =
            JSON.parse(json);

        parsedJson =
            transformJsonDates(parsedJson);

        return JSON.stringify(
            parsedJson,
            null,
            4
        );

    }
    catch {

        return json;

    }

}

function safeJsonParse(json) {

    try {

        return JSON.parse(json);

    }
    catch {

        return null;

    }

}

function escapeHtml(text) {

    if (!text) {
        return "";
    }

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/* =========================================
   READ FILE
========================================= */

function readFileContent(file) {

    return new Promise(
        function (resolve, reject) {

            var reader =
                new FileReader();

            reader.onload =
                function (e) {

                    resolve(
                        e.target.result
                    );

                };

            reader.onerror = reject;

            reader.readAsText(file);

        }
    );

}

/* =========================================
   PARSE LOGS
========================================= */

function parseLogs(content) {

    var lines =
        content.split(/\r?\n/);

    return groupTransactions(lines);

}

function groupTransactions(lines) {

    var transactions = [];
    var currentTransaction = null;

    $.each(
        lines,
        function (index, line) {

            var timestampMatch =
                line.match(
                    /\[(\d{2}:\d{2}:\d{2},\d{3})\]/
                );

            var timestamp =
                timestampMatch
                    ? timestampMatch[1]
                    : "";

            if (
                line.indexOf("Data:")
                !== -1
            ) {

                if (
                    currentTransaction &&
                    !currentTransaction.completed
                ) {

                    currentTransaction.status =
                        "Failed";

                    transactions.push(
                        currentTransaction
                    );

                }

                currentTransaction = {

                    timestamp: timestamp,

                    request:
                        extractJson(
                            line,
                            "Data:"
                        ),

                    response: "",

                    status: "Pending",

                    completed: false

                };

            }

            else if (
                line.indexOf("Response:")
                !== -1 &&
                currentTransaction
            ) {

                var responseJson =
                    extractJson(
                        line,
                        "Response:"
                    );

                currentTransaction.response =
                    responseJson;

                var parsedResponse =
                    safeJsonParse(
                        responseJson
                    );

                currentTransaction.status =
                    parsedResponse &&
                        parsedResponse.status === 1
                        ? "Success"
                        : "Failed";

                currentTransaction.completed =
                    true;

                transactions.push(
                    currentTransaction
                );

                currentTransaction = null;

            }

        }
    );

    if (currentTransaction) {

        currentTransaction.status =
            "Failed";

        transactions.push(
            currentTransaction
        );

    }

    return transactions;

}

function extractJson(line, prefix) {

    var index =
        line.indexOf(prefix);

    if (index === -1) {
        return "{}";
    }

    return line
        .substring(
            index + prefix.length
        )
        .trim();

}

/* =========================================
   FILTER
========================================= */

function filterTransactions(
    transactions
) {

    var filtered =
        $.extend([], transactions);

    /* STATUS FILTER */

    if (currentFilter !== "All") {

        filtered =
            $.grep(
                filtered,
                function (item) {

                    return (
                        item.status ===
                        currentFilter
                    );

                }
            );

    }

    /* GLOBAL SEARCH */

    var globalSearch =
        $("#globalSearch")
            .val()
            .toLowerCase();

    if (globalSearch) {

        filtered =
            $.grep(
                filtered,
                function (item) {

                    return JSON.stringify(item)
                        .toLowerCase()
                        .indexOf(globalSearch)
                        > -1;

                }
            );

    }

    /* JSON SEARCH */

    var jsonSearch =
        $("#jsonSearch")
            .val()
            .toLowerCase();

    if (jsonSearch) {

        filtered =
            $.grep(
                filtered,
                function (item) {

                    return (
                        item.request +
                        item.response
                    )
                        .toLowerCase()
                        .indexOf(jsonSearch)
                        > -1;

                }
            );

    }

    /* TIMESTAMP FILTER */

    var timestampFilter =
        $("#timestampFilter").val();

    if (timestampFilter) {

        filtered =
            $.grep(
                filtered,
                function (item) {

                    return (
                        item.timestamp ===
                        timestampFilter
                    );

                }
            );

    }

    return filtered;

}

/* =========================================
   TABLE
========================================= */

function renderTable(transactions) {

    var filtered =
        filterTransactions(
            transactions
        );

    $("#visibleRecordsCount").text(
        filtered.length
    );

    if (!filtered.length) {

        $transactionsTableBody.html(`
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        Upload log files to begin analysis
                    </div>
                </td>
            </tr>
        `);

        return;

    }

    var rows = "";

    $.each(
        filtered,
        function (index, transaction) {

            var requestId =
                "request_" + index;

            var responseId =
                "response_" + index;

            var statusClass =
                transaction.status === "Success"
                    ? "status-success"
                    : "status-failed";

            rows += `
                <tr>

                    <td>

                        <div class="
                            status-pill
                            ${statusClass}
                        ">

                            <span class="status-dot"></span>

                            ${transaction.status}

                        </div>

                    </td>

                    <td>

                        <div class="json-actions">

                            <button
                                class="json-btn"
                                data-toggle="collapse"
                                data-target="#${requestId}">

                                <i class="fa fa-code"></i>
                                View JSON

                            </button>

                            <button
                                class="json-btn copy-btn"
                                data-json='${escapeHtml(transaction.request)}'>

                                <i class="fa fa-copy"></i>
                                Copy

                            </button>

                        </div>

                        <div
                            id="${requestId}"
                            class="collapse">

                            <div class="json-viewer">

                                <div class="json-code">

<pre><code class="json">${escapeHtml(prettyPrintJSON(transaction.request))}</code></pre>

                                </div>

                            </div>

                        </div>

                    </td>

                    <td>

                        <div class="json-actions">

                            <button
                                class="json-btn"
                                data-toggle="collapse"
                                data-target="#${responseId}">

                                <i class="fa fa-code"></i>
                                View JSON

                            </button>

                            <button
                                class="json-btn copy-btn"
                                data-json='${escapeHtml(transaction.response)}'>

                                <i class="fa fa-copy"></i>
                                Copy

                            </button>

                        </div>

                        <div
                            id="${responseId}"
                            class="collapse">

                            <div class="json-viewer">

                                <div class="json-code">

<pre><code class="json">${escapeHtml(prettyPrintJSON(transaction.response))}</code></pre>

                                </div>

                            </div>

                        </div>

                    </td>

                    <td>

                        <div class="timestamp">

                            ${transaction.timestamp}

                        </div>

                    </td>

                </tr>
            `;

        }
    );

    $transactionsTableBody.html(rows);

    $("pre code").each(
        function (i, block) {

            hljs.highlightElement(block);

        }
    );

}

/* =========================================
   STATS
========================================= */

function updateDashboardStats(
    transactions
) {

    var expected = 96;

    var actual =
        transactions.length;

    var success =
        $.grep(
            transactions,
            function (item) {

                return item.status === "Success";

            }
        ).length;

    var failed =
        $.grep(
            transactions,
            function (item) {

                return item.status === "Failed";

            }
        ).length;

    var missing =
        expected - actual;

    if (missing < 0) {
        missing = 0;
    }

    $("#expectedRequests").text(expected);

    $("#actualRequests").text(actual);

    $("#successRequests").text(success);

    $("#failedRequests").text(failed);

    $("#missingRequests").text(missing);

}

/* =========================================
   EXPORT CSV
========================================= */

function exportToCSV() {

    if (!parsedTransactions.length) {
        return;
    }

    var rows = [
        [
            "Status",
            "Request",
            "Response",
            "Timestamp"
        ]
    ];

    $.each(
        parsedTransactions,
        function (index, item) {

            rows.push([
                item.status,
                item.request,
                item.response,
                item.timestamp
            ]);

        }
    );

    var csv =
        $.map(
            rows,
            function (row) {

                return $.map(
                    row,
                    function (col) {

                        return (
                            '"' +
                            String(col)
                                .replace(/"/g, '""')
                            + '"'
                        );

                    }
                ).join(",");

            }
        ).join("\n");

    var blob =
        new Blob(
            [csv],
            {
                type: "text/csv"
            }
        );

    var link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "transactions.csv";

    link.click();

}

/* =========================================
   EVENTS
========================================= */

$("#parseLogsBtn").on(
    "click",
    async function () {

        if (!uploadedFiles.length) {

            alert(
                "Please upload log file."
            );

            return;

        }

        showLoader(
            true,
            "Parsing enterprise logs..."
        );

        parsedTransactions = [];

        var file =
            uploadedFiles[0];

        $("#parseStatus").text(
            "Parsing..."
        );

        updateProgress(40);

        var content =
            await readFileContent(file);

        updateProgress(70);

        parsedTransactions =
            parseLogs(content);

        updateProgress(100);

        renderTable(
            parsedTransactions
        );

        updateDashboardStats(
            parsedTransactions
        );
        populateTimestampFilter(
            parsedTransactions
        );

        $("#parseStatus").text(
            "Completed"
        );

        showLoader(false);

    }
);

$("#clearLogsBtn").on(
    "click",
    function () {

        parsedTransactions = [];
        uploadedFiles = [];

        logDropzone.removeAllFiles(true);

        renderTable([]);

        updateDashboardStats([]);

        updateUploadStats();

        $("#parseStatus").text(
            "Waiting"
        );

        updateProgress(0);

    }
);

$(".filter-tab").on(
    "click",
    function () {

        $(".filter-tab")
            .removeClass("active");

        $(this)
            .addClass("active");

        currentFilter =
            $(this).data("filter");

        renderTable(
            parsedTransactions
        );

    }
);

$("#globalSearch,#jsonSearch")
    .on(
        "keyup",
        function () {

            clearTimeout(
                debounceTimer
            );

            debounceTimer =
                setTimeout(
                    function () {

                        renderTable(
                            parsedTransactions
                        );

                    },
                    250
                );

        }
    );

$("#refreshBtn").on(
    "click",
    function () {

        renderTable(
            parsedTransactions
        );

        updateDashboardStats(
            parsedTransactions
        );

    }
);

$("#exportCsvBtn").on(
    "click",
    exportToCSV
);
function populateTimestampFilter(
    transactions
) {

    var timestamps = [];

    $.each(
        transactions,
        function (index, item) {

            if (
                item.timestamp &&
                $.inArray(
                    item.timestamp,
                    timestamps
                ) === -1
            ) {

                timestamps.push(
                    item.timestamp
                );

            }

        }
    );

    var $timestampFilter =
        $("#timestampFilter");

    $timestampFilter.html(`
<option value="">
    All Timestamps
</option>
    `);

    $.each(
        timestamps,
        function (index, timestamp) {

            $timestampFilter.append(`
        <option value="${timestamp}">
            ${timestamp}
        </option>
    `);

        }
    );

}

$("#timestampFilter").on(
    "change",
    function () {

        renderTable(
            parsedTransactions
        );

    }
);
$(document).on(
    "click",
    ".copy-btn",
    function () {

        var $button = $(this);

        var json =
            $button.attr("data-json");

        navigator.clipboard.writeText(
            json
        );

        var originalHtml =
            $button.html();

        $button.html(`
            <i class="fa fa-check"></i>
            Copied
        `);

        setTimeout(
            function () {

                $button.html(
                    originalHtml
                );

            },
            1200
        );

    }
);


