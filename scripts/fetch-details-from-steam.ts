import {readFileSync, writeFileSync} from 'node:fs'
import PQueue from 'p-queue';
import {resolve} from "node:path";

// Fetch IDs that've been previously parsed
const steamIds = JSON.parse(readFileSync(resolve(__dirname, "../outputs/steamIds.json"), 'utf8'))

const fetchSteamDetailsById = async (steamId: number | string) => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamId}` // We can only ask for one ID at a time if we want the full details
    const response = await fetch(url)
    const json = await response.json()
    return json
}

// Rate-limit our fetches so we don't overwhelm the Steam API
const queue = new PQueue({
    timeout: 2000,
    throwOnTimeout: false,
    intervalCap: 3,
    interval: 1000, // three per second
    carryoverConcurrencyCount: true, // wait for requests to finish before adding more to the queue
});

const fetchFunctions = steamIds.map(id => async () => {
    const steamDetails = await fetchSteamDetailsById(id)
    writeFileSync(resolve(__dirname, `../outputs/steamDetails/${id}.json`), JSON.stringify(steamDetails, null, 2))
})

console.log(`Starting fetch for ${steamIds.length} games...`)
queue.addAll(fetchFunctions).then(() => console.log('All done'))
queue.on('active', () => {
    console.log(`Queue Size: ${queue.size}  Pending: ${queue.pending}`);
});