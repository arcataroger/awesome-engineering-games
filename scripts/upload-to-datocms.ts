import * as dotenv from 'dotenv';
import {buildClient, LogLevel} from "@datocms/cma-client-node";
import {ItemInstancesHrefSchema, ItemCreateSchema} from "@datocms/cma-client/dist/types/generated/SimpleSchemaTypes";
import PQueue from 'p-queue';
import {chunk} from 'remeda';
import {readFileSync, writeFileSync} from 'node:fs'
import {GameRecord, RecordInterface} from "./datocms-graphql/datocms-graphql-types";
import {resolve} from "node:path";

dotenv.config(); // Read env variables (like the API key) from .env

const client = buildClient({
    apiToken: process.env.DATOCMS_TOKEN as string,
    extraHeaders: {"X-Exclude-Invalid": "true"},
    logLevel: LogLevel.BASIC,
});

const queue = new PQueue({
    timeout: 1000 * 60 * 2, // Each request times out after 2 minutes. It takes a while to delete each batch of 200 records.
    throwOnTimeout: false, // The queue will error if any requests time out
    intervalCap: 30, // Maximum requests per interval cycle. We'll set it a little lower just to be conservative (half the real limit)
    interval: 3000, // Interval cycle. DatoCMS rate limit is 60 requests every 3 seconds (https://www.datocms.com/docs/content-management-api/rate-limits)
    carryoverConcurrencyCount: true,
});

const getRecordIdsByItemType = async (type: ItemInstancesHrefSchema['filter']['type']): Promise<string[]> => {
    console.log(`Fetching all records of type ${type}`);
    let ids: string[] = [];
    for await (const record of client.items.listPagedIterator({
            filter: {type: type},
        },
        {
            perPage: 200,
            concurrency: 3,
        })) {
        ids.push(record.id);
    }
    console.log(`I fetched ${ids.length} record IDs.`);
    return ids;
};

const allGames = await getRecordIdsByItemType("game");

console.log(allGames)

const gfnGames = new Set(JSON.parse(readFileSync(resolve(__dirname, `../outputs/games-on-geforce-now.json`), 'utf8')))

const createNewGameRecord = async (id: string | number) => {
    const steamDetails = JSON.parse(readFileSync(resolve(__dirname, `../outputs/steamDetails/${id}.json`), 'utf8'))[id].data
    const capsuleUrl = steamDetails.capsule_image;
    const headerUrl = steamDetails.header_image;

    let tags = []
    if(gfnGames.has(id)) tags.push('gfn')

    const capsuleImage = capsuleUrl ? await client.uploads.createFromUrl({
        url: capsuleUrl,
        filename: `${id}-capsule`,
        skipCreationIfAlreadyExists: true,
    }) : undefined;

    const headerImage = headerUrl ? await client.uploads.createFromUrl({
        url: headerUrl,
        filename: `${id}-header`,
        skipCreationIfAlreadyExists: true,
    }) : undefined;

    console.log(capsuleImage)

    const data: ItemCreateSchema = {
        item_type: {
            type: 'item_type',
            id: 'MD-Tx1HTQdyQtR5kV5zN5Q'
        },
        steam_id: id.toString(),
        title: steamDetails.name,
        // curator_thoughts: "",
        capsule_image: capsuleImage?.id ? {
           upload_id: capsuleImage.id
        } : undefined,
        header_image: headerImage?.id ? {
            upload_id: headerImage.id
        } : undefined,
        steam_json: JSON.stringify(steamDetails, null, 2),
        tags: JSON.stringify(tags)
    }

    await client.items.create(data)
}

await createNewGameRecord(2330750)

/*
const batchedRecords = chunk(recordIdsToDestroy, 200)
const deleteBatch = async (batch: string[]) => {
    await client.items.bulkDestroy({
        items: batch.map(id => ({
                type: 'item',
                id: id
            }
        ))
    })
}

queue.on('active', () => {
    console.log(`Queue Size: ${queue.size}  Pending: ${queue.pending}`);
});

queue.addAll(
    batchedRecords.map((batch:string[]) => () => deleteBatch(batch))
).then(() => console.log('All done.'))
*/
