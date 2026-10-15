# Student Registration Automation using n8n

## Overview
This project collects student registration details using an n8n form and saves them to Google Sheets.

## Features
- Student registration form
- Student name, email, phone number, and course selection
- Automatic Google Sheets row insertion
- Workflow automation using n8n

## Technologies Used
- n8n
- Google Sheets

## Workflow
1. Student submits the registration form.
2. n8n receives the submitted details.
3. Google Sheets appends a new student record.

## Setup
1. Import `workflow/student-registration.json` into n8n.
2. Configure Google Sheets credentials.
3. Select the spreadsheet and worksheet.
4. Map the form fields to the correct columns.
5. Test the workflow and verify the new row.

## Screenshots
See the `screenshots/` folder for workflow and Google Sheets screenshots.

## Security
Do not commit credentials, API keys, or private student information.