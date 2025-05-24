
# TODO

## Doing

- Don't show the END_OF_GAME_STAT for the last game.

## Done

- Outro: 1st vs 2nd
  - also add the denom.
- Outro: Add a table of all the points in emojis
  - Scaling may be difficult (may need to zoom out at the end or truncate long games or add extra lines)

## P1

- Welcome to the mid-match toilet break, brought to you by my buddy, Stefanos.
  - Mid-match stats
  - Drone shots
- Smart replayer

- Add a stat column for deuce and ad side breakdown

- Sorting
  - Sort by descending start time as the last dimension (default when no other dim is specified)
  - When a column header is pressed, sort and then move to the very bottom for easy replaying purposes.

### Design sort and filter

- E2E
  - Encapsulate them together in select state
  - Do this selection before passing it to the table and special replayer
  - Just worry about watch mode; when we filter using stats, we start from the first point, hiding other points
- How does replaying works if the select state is not the default?
  - The special replayer checks every 2 seconds whether an end point is passed and move to the next start poing.
  - Give a buffer of 4 seconds before automatically going to the next point
  - Need to display the first vs second serve since we will exclude faults when replaying
  - No need to hide spoilers if non-default select state


### Create a video with the score

- Press x to export.
- M1: Will ask for the video file

### Design stats impl

- Slice stats by current game and current set and overall???
  - Can then use it for things like break pt #2.

- P2 stats
  - Num game pts
  - Game pt conversion %
  - Num break pts
  - Break pt conversion %
  - Num break opportunities

- Think about what stats to highlight
  - (e.g. serving stats at the end of a server's game)
  - If a certain stats have enough sample size and dips below a certain threshold or much worse than the oppo.

## P2

- Get some AI generated drone shots in between games
  - That may allow for adding a mid-match toilet break
- Store the sort state in url for easier sharing
- Consider making upDownArrowJumpsToStartTime = true always (remove impl that uses it).
- Design a better pub-sub for when video time passes a key point.
- Think of other features for watch mode
  - Option: Skip the pauses automatically
  - Option: Skip the single faults
  - Option: Skip things shorter than 5 seconds.

- Add UTR or USTA rating

- Add a column for 1st or 2nd serve
  - This will allow slicing
- Remove Score deps from Rally
  - RallyContext depends on Score, depends on Rally.

- Bold the border between games and bolder between sets
- color the table (using thicker right border for the duration)

- If a serve is modified, confirm if they want to change it for the rest of the points.
- scoreOverride
  - Score data can be done with 4 buttons (incre/decrement me or oppo points)

- Think about a final shot normalized rating columns

- Undo, Unsave status
- Project title above menu button
  - Edit
  - Show Unsave status


# Done


# Design

### Design video gen

- X: Record and save as webm file
  - X: Intake the footage file on record
  - X: Add score
  - X: Add cuts
  - X: Use * in the points for second serve
  - X: Coloring based on score
- Add an option for automatic score swapping?

- Timing
  - right after the point ends: rightPaddingMs
  - before the next point starts: leftPaddingMs
- Timing for story telling 
  - leftPadding for set pts, break pts, duece, 40-30 and 0-0
  - Zoom in at the start of the set
  - Zoom out for game points
  - Zoom in when exiting game points

- Triggers for climax:
  - Set point
  - Break point
  - Deuce
- Trigger for frustrating situations:
  - Double fault #2, 4, ...: # second serves | # double faults | %
  - Unforced error #2, 4, ...: # unforced error | # forcing wins
  - Getting broken
  - Reaching deuce after failing to convert game points
  - Finishing a long point
  - Long service game >= 5, 8, ... minutes
- Trigger for positive situations:
  - winning consecutive pts #3, 5, ...: # consecutive pts
  - breaking a losing streak of >= 3 pts
  - Forced error #3, 5, ...: # forced error | 1st serve | 2nd serve | 1st serve return
  - Saving break point #2, 4, ...
  - Converting break point #2, 3, ...
  - Converting game point #2, 4

- Triggers for predictive narrative:
  - After reaching deuce
    - > 3 "deuce":
      - How many games reach deuce as a server
      - Num of deuce games won
  - After reaching break point
    - > 1 break point:
      - Num of "deuce" as a returner
      - Num of break points
      - Num of games with break points
      - Num of breaks
- Triggers for exlamative narrative:
  - After a long point
    - point duration
    - > 3 long points:
      - Num of long points as a server
      - Num of long points won
  - After reaching deuce #2
    - The game duration
    - > 5 games:
      - Average game length
  - After reaching deuce
    - The game's history
  - After reaching break point
    - first break point
  - After reaching game point
    - > 3 game points:
      - Number of game points
      - Number of games with game points
  - After winning 4 of last 5 points:
    - Show ???
  - After 2 out of last 3 points being short:
    - ???
  - After 2 out of last 3 points being unforced errors
    - ???
  
- Story telling: Think about when to add pauses in between points
  - plot line
  - I should mark replay-worthy shots explicitly by picking the starting point.
  - pre-made audio with trite advice
    - That is outrageous
    - He has got to hit with more depth
    - He has got to have fewer unforced errors
  - 
- Generate prompt to get podcast
  - I will need to manually cut things to avoid it being too long
- Intake podcast files and other footages
- P2: Add stats during the podcast
- P3: Add highlights during the podcast
- P3: Add interesting plot lines (add in slow mo to let user digest it)
  - Game pt: game pt chances | game pt converted
- P3: See if I can split up the podcast and put it in later breaks

## Watch mode

- Remove Start, Result, Winner's, Loser's.
- Reveal only the start time for the current point
  - reveal everything for the previous points
  - Can use up arrow to reveal more
- up, down for the entire row
  - automatically jump to the start time when you press up or down
- left, right will move video.
- P2: design custom sorting

## Edit mode

- May be just use words for Result if I do input Winner's and Loser's.
  - clearer because I'll see Pt Tiafoe vs Pt Isner and realize I input incorrectly.

Goal: make UI more explanatory by providing buttons for all the keyboard shortcuts

Hints: tell users to use j and l when they press left and right the first time.

## Stats

### P1

- Game point #n: Within a game
  - Break point #n: Within a game
  - Set point #n: Within a set
- Double fault #n: within a match
  - Single fault #n: within a match
  - Service win #n: within a match
  - Service loss #n: within a match

### P2

- Num of games with game point: within a set
  - Num of games with break point: within a set

### Need extra input

- Num of converted attack pts: within a match
  - Num of failed attacks pts: within a match
  - Num of converted defense pts: within a match
  - Num of failed defense pts: within a match
  - Num of converted neutral pts: within a match
  - Num of failed neutral pts: within a match
  - Input needed: Who is on the attack at the end of the point (Me/Oppo/None).
  - Optional input: Attack origin
    - Good serve, good return, good FH, good BH, ???
  - Optional input: Failed attack/defense reason
    - Missing (net), Missing (deep), Missing (cross), Missing (line), Too good

## How to operate on rallies

- rallies and layout --> relevantRallies
  - relevantRallies and cursor --> displayedRallies
  - in the future, we should allow exposing layout and cursor via URL for sharing
- We will use startTime to identify rallies (e.g. to add, remove and sort)
  - So we will not allow 2 rallies to have the same startTime.
  - Embed the rally obj in the onclick function (deprecated: use startTime.toString() to embed the info in html data). onkeydown should also be able to get rally obj based on cursor (getCurrRally)

## UX for entering data

- Press enter to insert or get a modal for insert options
  - Jump to the next appropriate cell after the insert
    - Should we even open the next cell's modal?
      - A: let's try no for now.
- Should we use press tab to go to the next cell without entering things?
- start/end time
  - new/edit: just use current time
  - backspace: delete the entire row/rally.
- result
  - Q: should we auto-fill
    - Let's autofill W for server.
  - new/edit: modal of choices
- notes
  - Q: should we even have this column or make it configurable?
  - new/edit: text prompt

## Flexible table system

- Within GradebookProject, should I have these?
  - Metadata
  - TableLayout
    - extraNotesColumnHeaders
    - what columns to display by default?
    - how to display row to not cause spoiler?
      - only move the row down to y=0 when the point is finished.
