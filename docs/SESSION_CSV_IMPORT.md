# Session CSV Import

This feature allows you to import tournament session schedules from a CSV file, automatically creating sessions and matchups based on lane assignments.

## CSV Format

The CSV file must have the following structure:

```csv
Session,Date,Lane17,Lane18,Lane19,Lane20,...,Lane34
1a,Nov 11,TEAM1,TEAM2,TEAM3,TEAM4,...,TEAM18
2a,Nov 18,TEAM5,TEAM6,TEAM7,TEAM8,...,TEAM19
```

### Columns:

1. **Session**: Session identifier (e.g., "1a", "2a", "3a")
2. **Date**: Session date in format "Month Day" (e.g., "Nov 11", "Jan 20")
3. **Lane17 through Lane34**: Team names assigned to each lane (18 lanes total)

### Requirements:

- **Teams must already exist** in the tournament before importing sessions
- Team names in the CSV must match exactly (case-insensitive) with team names in the database
- Lanes 17-34 must be configured in the database with opponent pairings
- Dates can span multiple years (tournament year context is used)

## Lane Pairing

Teams are automatically matched based on opponent lane configuration:
- Lane 17 ↔ Lane 18
- Lane 19 ↔ Lane 20
- Lane 21 ↔ Lane 22
- Lane 23 ↔ Lane 24
- Lane 25 ↔ Lane 26
- Lane 27 ↔ Lane 28
- Lane 29 ↔ Lane 30
- Lane 31 ↔ Lane 32
- Lane 33 ↔ Lane 34

## API Endpoint

**POST** `/api/tournaments/{tournamentId}/import-session-csv`

### Request:

```
Content-Type: multipart/form-data

file: CSV file
year: (optional) Tournament year for date parsing (defaults to current year)
```

### Example using curl:

```bash
curl -X POST \
  http://localhost:3000/api/tournaments/1/import-session-csv \
  -F "file=@session-schedule.csv" \
  -F "year=2024"
```

### Example using JavaScript:

```javascript
const formData = new FormData()
formData.append('file', csvFile)
formData.append('year', '2024')

const response = await fetch('/api/tournaments/1/import-session-csv', {
  method: 'POST',
  body: formData,
})

const result = await response.json()
console.log(result)
```

## Response Format

### Success Response:

```json
{
  "success": true,
  "data": {
    "message": "Successfully imported 12 sessions",
    "sessions": [
      {
        "session": "1a",
        "date": "2024-11-11",
        "matchupsCount": 9,
        "matchups": [
          {
            "lane": 17,
            "teamA": "COYOTES",
            "teamB": "LO PLATICAMOS"
          },
          // ... more matchups
        ]
      }
    ],
    "errors": [] // Any non-critical errors or warnings
  }
}
```

### Error Response:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## CSV Template

A template CSV file is available at: `/public/session-import-template.csv`

You can download this template and modify it with your tournament's schedule.

## Important Notes

1. **Team Names**: Must match exactly (case-insensitive) with teams in the database
2. **Date Format**: Supports abbreviated and full month names (e.g., "Nov" or "November")
3. **Year Handling**:
   - If sessions span multiple years (e.g., Nov-Feb), provide the starting year
   - Dates will automatically roll over to the next year when appropriate
4. **Empty Lanes**: Lanes can be left empty (BYE) if a team has no opponent
5. **Transaction Safety**: All sessions are created in a single database transaction
6. **Error Handling**: Partial failures are reported but don't stop the entire import

## Workflow

1. **Create Tournament**: First create a tournament with all teams
2. **Prepare CSV**: Create CSV file with session schedule using the template
3. **Import Sessions**: Upload CSV via API to create all sessions and matchups
4. **Verify**: Check that sessions were created correctly
5. **Enter Scores**: Use the scoring interface to enter results for each session

## Example CSV

See the complete example in `/public/session-import-template.csv` which includes:
- 12 sessions spanning November through February
- 18 teams across 9 lane pairs
- Proper matchup rotation

## Troubleshooting

### "Team not found" errors
- Verify team names in CSV match database exactly
- Check for extra spaces or special characters
- Team names are case-insensitive but must match otherwise

### "Lane not found" errors
- Ensure lanes 17-34 are created in the database
- Run database migrations and seed if needed

### "Invalid date format" errors
- Use format "Month Day" (e.g., "Nov 11", "January 20")
- Check for typos in month names

### "No opponent lane configured" errors
- Verify lane opponent relationships are set up correctly
- Re-run database seed to create proper lane pairings
