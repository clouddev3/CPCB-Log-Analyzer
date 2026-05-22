# CPCB Log Analyzer

A responsive, frontend-only dashboard for uploading CPCB API log files, parsing request and response transactions, reviewing JSON payloads, filtering records, and exporting parsed results as CSV.

## Overview

The application runs directly in the browser from `index.html`. It does not require a backend server for parsing logs. Users can upload a `.log` or `.txt` file, parse it locally, inspect request and response JSON, and monitor request counts through dashboard cards.

## Features

- Drag-and-drop log upload with Dropzone
- Single-file parsing for `.log` and `.txt` files
- Upload file count and total file size display
- Parse progress and loader state
- Expected, actual, successful, failed, and missing request counters
- Status filters for all, success, and failed transactions
- Global transaction search
- JSON payload search
- Timestamp-based filtering
- Collapsible JSON viewers with syntax highlighting
- Copy-to-clipboard buttons for request and response payloads
- CSV export for parsed transactions
- Responsive layout for desktop and mobile screens
- Favicon support

## Project Structure

```text
project-root/
|-- index.html
|-- README.md
|-- assets/
|   |-- css/
|   |   `-- style.css
|   |-- js/
|   |   `-- script.js
|   |-- images/
|   |   `-- favicon.ico
|   `-- fonts/
```

## File Responsibilities

| File | Purpose |
| --- | --- |
| `index.html` | Main dashboard markup and external dependency links |
| `assets/css/style.css` | Application layout, responsive styles, cards, table, upload UI, loaders, and visual states |
| `assets/js/script.js` | Upload handling, log parsing, filtering, table rendering, dashboard stats, copy actions, and CSV export |
| `assets/images/favicon.ico` | Browser favicon |
| `README.md` | Project documentation |

## External Dependencies

The page loads these libraries from CDNs:

- Bootstrap 3.4.1
- jQuery 3.7.1
- Dropzone 5.9.3
- Font Awesome 4.7.0
- Highlight.js 11.9.0
- Google Font: Inter

An internet connection is required for these CDN assets unless they are downloaded and hosted locally.

## Usage

1. Open `index.html` in a modern browser.
2. Drag and drop a `.log` or `.txt` file into the upload area, or click the upload area to browse.
3. Click **Parse Logs**.
4. Review parsed transactions in the table.
5. Use filters, search fields, and timestamp selection to narrow results.
6. Expand request or response JSON with **View JSON**.
7. Copy JSON payloads with **Copy**.
8. Export parsed data with **CSV**.
9. Use **Clear** to reset the dashboard.

## Supported Log Format

The parser expects log lines containing request data with `Data:` and response data with `Response:`.

Example:

```text
[12:30:15,123] Data: {"deviceId":"ABC001","value":42}
[12:30:16,456] Response: {"status":1,"message":"Success"}
```

The timestamp format extracted by the app is:

```text
[HH:MM:SS,mmm]
```

## Transaction Status Rules

- A transaction starts when a line containing `Data:` is found.
- The next matching `Response:` line completes the current transaction.
- If the response JSON contains `"status": 1`, the transaction is marked as `Success`.
- Any other response status, invalid response JSON, or missing response is marked as `Failed`.
- The expected request count is currently fixed at `96`.

## Dashboard Sections

### Upload Panel

The sidebar contains the log upload area, uploaded file count, total uploaded size, parse status, progress indicator, and action buttons.

### Header

The header displays the current India-local date and time, global search, refresh, and CSV export controls.

### Stats Cards

The dashboard shows:

- Expected Requests
- Actual Requests
- Successful Requests
- Failed Requests
- Missing Requests

### Filters

Available filters include:

- All transactions
- Successful transactions
- Failed transactions
- JSON content search
- Timestamp filter

### Transactions Table

The table displays:

- Status
- Request payload
- Response payload
- Timestamp

Request and response payloads can be expanded, syntax-highlighted, and copied.

## Browser Compatibility

The app uses standard browser APIs such as:

- `FileReader`
- `Blob`
- `URL.createObjectURL`
- `navigator.clipboard`

Use a modern browser such as Chrome, Edge, Firefox, or Safari for best results.

## Notes

- Parsing is done entirely on the client side.
- Uploaded files are not sent to a server.
- Maximum file size is configured as `50 MB`.
- Only one uploaded file is processed at a time.
- The UI timezone display uses `Asia/Kolkata`.
