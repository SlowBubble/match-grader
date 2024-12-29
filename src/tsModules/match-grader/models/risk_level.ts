import { RallyContext } from "./rally_context";


export function getShotRatingStr(lookAtWinner: boolean, rallyContext: RallyContext) {
  const rally = rallyContext.rally;
    const shotQuality = lookAtWinner ?
      rally.stat.winnerLastShotQuality :
      rally.stat.loserPreviousShotQuality;
    const winnerIsMe = rallyContext.winnerIsMe();
    let shouldReverseStr = winnerIsMe;
    if (!lookAtWinner) {
      shouldReverseStr = !shouldReverseStr;
    }
    const mapping = shouldReverseStr ? shotRatingToVerboseStr : shotRatingToReverseVerboseStr;
    let shotRatingStr = mapping.get(shotQuality);
    shotRatingStr = shotRatingStr?.replace(/[a-zA-Z]/g, '');
    return shotRatingStr || '';
}

export function getRiskLevelStr(rallyContext: RallyContext) {
  const rally = rallyContext.rally;
  const rallyIsDoubleFault = rallyContext.isDoubleFault();
  const winnerIsMe = rallyContext.winnerIsMe();
  if (rallyIsDoubleFault) {
    return winnerIsMe ? '◯ Double' : 'Double ◯';
  }
  const winnerLastShot = rally.stat.winnerLastShotQuality;
  const loserPrevShot = rally.stat.loserPreviousShotQuality;
  if (winnerLastShot === 0) {
    return '';
  } else if (winnerLastShot === 1) {
    return winnerIsMe ? '⬜⬜⬜ Free++' :  'Free++ ⬜⬜⬜';
  } else if (winnerLastShot === 2) {
    return winnerIsMe ? '⬜⬜ Free+' :  'Free+ ⬜⬜';
  } else if (winnerLastShot === 3) {
    return winnerIsMe ? '⬜ Free' :  'Free ⬜';
  }

  // TODO see if we need to adjust this (2:1 for elite, 3:2 for pro, 4:3 for rec).
  const shotRatingForToss = rallyContext.isSecondServe() ? 3 : 2;
  const loserPrevShotOrDefault = loserPrevShot || shotRatingForToss;
  const riskLevel =  winnerLastShot - (3 - (loserPrevShotOrDefault - 3));
  if (winnerIsMe) {
    return riskLevelToStr.get(riskLevel) || riskLevel.toString();
  }
  return riskLevelToReverseStr.get(riskLevel) || riskLevel.toString();
}

const shotRatingToVerboseStr = new Map([
  [5, '🟩🟩 Stretcher'],
  [4, '🟩 Rusher'],
  [3, '⬜ Neutral'],
  [2, '🟥 Weak'],
  [1, '🟥🟥 Sitter'],
  [0, ''],
]);

const shotRatingToReverseVerboseStr = new Map([
  [5, 'Stretcher 🟩🟩'],
  [4, 'Rusher 🟩'],
  [3, 'Neutral ⬜'],
  [2, 'Weak 🟥'],
  [1, 'Sitter 🟥🟥'],
  [0, ''],
]);

const riskLevelToStr = new Map([
  [4, '🟥🟥 Steal+'],
  [3, '🟥 Steal'],
  [2, '🟨 Aggro+'],
  [1, '🟩 Aggro'],
  [0, '🟩🟩 Patient'],
  // Should not be used
  [-1, '⬜ Passive'],
  [-2, '⬜ Passive+'],
  [-3, '⬜ Passive++'],
  [-4, '⬜ Passive+++'],
]);



const riskLevelToReverseStr = new Map([
  [4, 'Steal+ 🟥🟥'],
  [3, 'Steal 🟥'],
  [2, 'Aggro+ 🟨'],
  [1, 'Aggro 🟩'],
  [0, 'Patient 🟩🟩'],
  // Should not be used
  [-1, 'Passive ⬜'],
  [-2, 'Passive+ ⬜'],
  [-3, 'Passive++ ⬜'],
  [-4, 'Passive+++ ⬜'],
]);