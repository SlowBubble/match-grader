export function mod(x = 0, y = 1) {
  const res = x % y;
  if (res < 0) {
    return res + y;
  }
  return res;
}

export function formatSecondsToTimeString(numMs: number): string {
  const numSecs = Math.round(numMs / 1000)
  const hours = Math.floor(numSecs / 3600);
  const minutes = Math.floor((numSecs % 3600) / 60);
  const seconds = numSecs % 60;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  if (hours === 0) {
    return `${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
}

// https://stackoverflow.com/a/54200105
export function extractYoutubeId(url: string){
   const parts = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
   if (parts[2] === undefined) {
    return {success: false, id: ''};
   }
   return {success: true, id: parts[2].split(/[^0-9a-z_\-]/i)[0]};
}
