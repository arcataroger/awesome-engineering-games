import * as dotenv from 'dotenv';
import {buildClient, LogLevel} from "@datocms/cma-client-node";
import {ItemInstancesHrefSchema, ItemCreateSchema} from "@datocms/cma-client/dist/types/generated/SimpleSchemaTypes";
import PQueue from 'p-queue';
import {readFileSync} from 'node:fs'
import {resolve} from "node:path";
import {SteamGame} from "./steamTypes";
import {parseDate} from 'chrono-node';

dotenv.config(); // Read env variables (like the API key) from .env

const client = buildClient({
    apiToken: process.env.DATOCMS_TOKEN as string,
    extraHeaders: {"X-Exclude-Invalid": "true"},
    // logLevel: LogLevel.BASIC, // Turn on to see HTTP methods and codes
});

const queue = new PQueue({
    timeout: 60000,
    throwOnTimeout: true, // The queue will error if any requests time out
    intervalCap: 10, // Maximum requests per interval cycle
    interval: 1000, // Interval cycle. DatoCMS rate limit is 60 requests every 3 seconds (https://www.datocms.com/docs/content-management-api/rate-limits)
    carryoverConcurrencyCount: true,
});

const getSteamGamesFromDato = async (type: ItemInstancesHrefSchema['filter']['type']): Promise<Map<number, string>> => {
    console.log(`Fetching all records of type "${type}"...`);
    let steamIdToDatoIdMap: Map<number, string> = new Map()
    for await (const record of client.items.listPagedIterator({
            filter: {type: type},
        },
        {
            perPage: 200,
            concurrency: 3,
        })) {

        steamIdToDatoIdMap.set(Number(record.steam_id), record.id)
    }
    console.log(`I fetched ${steamIdToDatoIdMap.size} record IDs.`);
    return steamIdToDatoIdMap;
};

const gamesOnDatoMap = await getSteamGamesFromDato("game");
const allEngineeringGames: Array<number> = JSON.parse(readFileSync(resolve(__dirname, `../outputs/steamIds.json`), 'utf8'))
const engineeringGamesAlreadyOnDato = [...gamesOnDatoMap.keys()]
const engineeringGamesNotYetOnDato = allEngineeringGames.filter(steamId => !gamesOnDatoMap.has(steamId))
const gfnGames: Set<number> = new Set(JSON.parse(readFileSync(resolve(__dirname, `../outputs/games-on-geforce-now.json`), 'utf8')))

const createOrUpdateGameRecord = async (steamId: number, update?: boolean, skipImages?: boolean) => {
    const steamDetails: SteamGame = JSON.parse(readFileSync(resolve(__dirname, `../outputs/steamDetails/${steamId}.json`), 'utf8'))[steamId].data
    if (!steamDetails) return;
    const capsuleUrl = steamDetails.capsule_image;
    const headerUrl = steamDetails.header_image;

    const capsuleImage = capsuleUrl && !skipImages ? await client.uploads.createFromUrl({
        url: capsuleUrl,
        filename: `${steamId}-capsule`,
        skipCreationIfAlreadyExists: true,
    }) : undefined;

    const headerImage = headerUrl && !skipImages ? await client.uploads.createFromUrl({
        url: headerUrl,
        filename: `${steamId}-header`,
        skipCreationIfAlreadyExists: true,
    }) : undefined;

    const parsedDate: Date | undefined = steamDetails.release_date ? parseDate(steamDetails.release_date.date, {timezone: 'America/Los_Angeles'}) : undefined
    const isoDate: string = parsedDate.toISOString().split("T")[0]

    const data: ItemCreateSchema = {
        item_type: {
            type: 'item_type',
            id: 'MD-Tx1HTQdyQtR5kV5zN5Q'
        },
        steam_id: steamId.toString(),
        title: steamDetails.name,
        capsule_image: capsuleImage?.id ? {
            upload_id: capsuleImage.id
        } : undefined,
        header_image: headerImage?.id ? {
            upload_id: headerImage.id
        } : undefined,
        steam_json: JSON.stringify(steamDetails, null, 2),
        about_the_game: steamDetails.about_the_game,
        short_description: steamDetails.short_description,
        detailed_description: steamDetails.detailed_description,
        windows: steamDetails.platforms.windows,
        mac: steamDetails.platforms.mac,
        linux: steamDetails.platforms.linux,
        recommendations: steamDetails.recommendations?.total ?? null,
        early_access: steamDetails.genres.some(genre => genre.id === '70'),
        co_op: steamDetails.categories.some(category => category.id === 9 || category.id === 38),
        pvp: steamDetails.categories.some(category => category.id === 49 || category.id === 36),
        controller_support: steamDetails.categories.some(category => category.id === 28 || category.id === 18),
        f2p: steamDetails.genres.some(genre => genre.id === '37'),
        gfn: gfnGames.has(steamId),
        release_date_raw: steamDetails.release_date.date,
        release_date_parsed: isoDate,
    }

    if (update) {
        const updated = await client.items.update(gamesOnDatoMap.get(steamId), data)
        console.log(`Updated ${steamDetails.name} (Dato ID "${updated.id}")`)
    } else {
        const added = await client.items.create(data)
        console.log(`Added ${steamDetails.name} (Dato ID "${added.id})"`)
    }
}


queue.addAll(
    [
        ...engineeringGamesNotYetOnDato.map(id => () => createOrUpdateGameRecord(id)),
        ...engineeringGamesAlreadyOnDato.map((steamId) => () => createOrUpdateGameRecord(steamId, true, true))
    ]
).then(() => console.log('All done.'))

const initialQueueSize = allEngineeringGames.length;

queue.on('active', () => {
    console.log(`Process queue remaining: ${queue.size}/${initialQueueSize}. Pending: ${queue.pending}`);
});
