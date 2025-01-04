
# TODO

## Doing

- Advanced stats like set pt number, double fault number.

### Sorting

- Certain display that depends on prevRallyCtx will break
  - Have an option to display always (not conditioned on prevRallyCtx)
- Do sorting --> Do rendering independent of prevRallyCtx and rallyIdx
  - Need to consider how cursor works (cursor should be based on the sorted list, not the list before sorting)

## Done
- Enter key should be the same as going up.
- moveCursorUpFromVideoTime = true

## P1


- Think about the UX for adding these stats (start with an overlay when you press a keyboard shortcut):
  - % serve pts won
    - slice by first vs second serve
  - Serve %
    - slice by first vs second serve
  - % return pts won
    - slice by first vs second serve
  - % winning pts that are green
    - slice by first vs second and serve vs return
  - % free pts you gave to the opponent
    - slice by first vs second and serve vs return

- Consider making upDownArrowJumpsToStartTime = true always (remove impl that uses it).



## P2

- Think of other features for watch mode
  - Option: Skip the pauses automatically
  - Option: Skip the single faults
  - Option: Skip things shorter than 5 seconds.

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
