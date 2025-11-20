# Session CSV Import

This feature allows you to import tournament session schedules from a CSV file, automatically creating sessions and matchups based on lane assignments.

## CSV Format

The CSV file must have the following structure:

```csv
Session,Date,Lane1,Lane2,Lane3,Lane4,...
1a,Nov 11,TEAM1,TEAM2,TEAM3,TEAM4,...
2a,Nov 18,TEAM5,TEAM6,TEAM7,TEAM8,...
```

**The lane numbers in your CSV should match your bowling alley's lane configuration.** The parser automatically detects lane columns, so you can use any lane numbering scheme.

### Examples for Different Lane Configurations:

**Standard bowling alley (lanes 1-20):**
```csv
Session,Date,Lane1,Lane2,Lane3,Lane4,...,Lane20
1a,Nov 11,TEAM1,TEAM2,TEAM3,TEAM4,...,TEAM20
```

**Bol Insurgentes (lanes 17-34):**
```csv
Session,Date,Lane17,Lane18,Lane19,Lane20,...,Lane34
1a,Nov 11,TEAM1,TEAM2,TEAM3,TEAM4,...,TEAM18
```

**Custom configuration (lanes 5-14):**
```csv
Session,Date,Lane5,Lane6,Lane7,Lane8,...,Lane14
1a,Nov 11,TEAM1,TEAM2,TEAM3,TEAM4,...,TEAM10
```

### Columns:

1. **Session**: Session identifier (e.g., "1a", "2a", "3a")
2. **Date**: Session date in format "Month Day" (e.g., "Nov 11", "Jan 20")
3. **Lane{N}**: Team names assigned to each lane. Column names must follow the pattern `Lane{number}` (e.g., Lane1, Lane17, Lane25)

### Requirements:

- **Teams must already exist** in the tournament before importing sessions
- Team names in the CSV must match exactly (case-insensitive) with team names in the database
- **Lane columns are detected automatically** - use whatever lane numbers match your bowling alley
- Lanes must be configured in the database with opponent pairings (see Lane Configuration section below)
- Dates can span multiple years (tournament year context is used)

## Lane Configuration

### Lane Pairing

Teams are automatically matched based on opponent lane configuration in your database. Each lane must have an opponent lane configured for proper matchup creation.

**Example: Bol Insurgentes (lanes 17-34):**
- Lane 17 ↔ Lane 18
- Lane 19 ↔ Lane 20
- Lane 21 ↔ Lane 22
- Lane 23 ↔ Lane 24
- Lane 25 ↔ Lane 26
- Lane 27 ↔ Lane 28
- Lane 29 ↔ Lane 30
- Lane 31 ↔ Lane 32
- Lane 33 ↔ Lane 34

**Example: Standard alley (lanes 1-10):**
- Lane 1 ↔ Lane 2
- Lane 3 ↔ Lane 4
- Lane 5 ↔ Lane 6
- Lane 7 ↔ Lane 8
- Lane 9 ↔ Lane 10

### Setting Up Lane Pairs

Before importing session schedules, ensure your lanes are configured with opponent pairings in the database. Lanes are typically paired in odd-even pairs (1-2, 3-4, 5-6, etc.) but can be configured differently based on your bowling alley's layout.

When you create a bowling alley in the system, you can specify the lane range (start and end lane numbers), and the system will automatically create pairs.

## How to Import Sessions

### Using the Web Interface (Recommended)

1. Navigate to your tournament page
2. Click on the **Sessions** tab
3. If no sessions exist, you'll see a CSV import form
4. Click "Choose File" and select your CSV file
5. Optionally enter the year for date parsing
6. Click "Import Schedule"

The interface will show success messages and any errors or warnings from the import process.

### Using the API Directly

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

1. **Flexible Lane Configuration**: The CSV parser automatically detects lane columns from your CSV headers. Use whatever lane numbering matches your bowling alley (lanes 1-20, 17-34, 5-14, etc.)
2. **Team Names**: Must match exactly (case-insensitive) with teams in the database
3. **Date Format**: Supports abbreviated and full month names (e.g., "Nov" or "November")
4. **Year Handling**:
   - If sessions span multiple years (e.g., Nov-Feb), provide the starting year
   - Dates will automatically roll over to the next year when appropriate
5. **Empty Lanes**: Lanes can be left empty (BYE) if a team has no opponent
6. **Transaction Safety**: All sessions are created in a single database transaction
7. **Error Handling**: Partial failures are reported but don't stop the entire import
8. **Lane Column Format**: Lane columns must be named exactly as `Lane{number}` (e.g., Lane1, Lane17, Lane25). Case-insensitive.

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

### "No lane columns found in CSV" error
- Ensure your CSV has columns named like `Lane1`, `Lane2`, `Lane17`, etc.
- Lane column names must follow the pattern: `Lane{number}`
- Check that column names don't have extra spaces or typos

### "Team not found" errors
- Verify team names in CSV match database exactly
- Check for extra spaces or special characters
- Team names are case-insensitive but must match otherwise

### "Lane not found" errors
- Ensure the lanes referenced in your CSV exist in the database
- Verify your bowling alley has lanes configured with the correct numbers
- Check that lane numbers in CSV match your bowling alley's configuration

### "Invalid date format" errors
- Use format "Month Day" (e.g., "Nov 11", "January 20")
- Check for typos in month names

### "No opponent lane configured" errors
- Verify lane opponent relationships are set up correctly
- Each lane must have an opponent lane configured in the database
- When creating a bowling alley, ensure lanes are created in pairs

### Sessions imported but matchups are missing
- Check that your lanes have opponent pairings configured
- Verify team names in CSV exactly match team names in database
- Review the response for any error messages or warnings
