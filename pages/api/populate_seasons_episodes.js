import { PrismaClient } from "@prisma/client";
import tq from "throttled-queue";
const https = require('https');
const throttle = new tq(1, 25, true);
const prisma = new PrismaClient;
const httpsAgent = new https.Agent({ keepAlive: true });

let numberOfFetchErrors = 0;

async function getTVShowsPaginated(pageSize, pageNumber) {
    return await prisma.tVShow.findMany({
        take: pageSize,
        skip: pageSize * pageNumber,
        orderBy: {
            id: "asc",
        },
    });
}

async function getTotalPages(pageSize) {
    const totalTVShowCount = await prisma.tVShow.count();

    return Math.ceil(totalTVShowCount / pageSize);
}

async function fetchAndStoreSeasonsForShow(show) {
    // const seasonFetchTimeStart = Date.now();
    const seasonsFetched = await fetchSeasons(show);
    console.info(`${show.id} ${show.title} Seasons fetched`);

    if (seasonsFetched.length != 0) {
        // const seasonStoreTimeStart = Date.now();
        const seasonsStored = await storeSeasons(show, seasonsFetched);
        console.info(`${show.id} ${show.title} Seasons stored`);

        // const episdoeFetchStartTime = Date.now();
        const episodesFetched = await fetchEpisodes(show);
        console.info(`${show.id} ${show.title} Episodes fetched`);

        if (episodesFetched.length != 0) {
            // const episodeStoreStartTime = Date.now();
            await storeEpisodes(show, seasonsStored, episodesFetched);
            console.info(`${show.id} ${show.title} Episodes stored`);
        }
    }
}

async function fetchAndStoreEpisodesForShow(show) {
    const episodesFetched = await fetchEpisodes(show);
    console.info(`${show.id} ${show.title} Episodes fetched`);

    if (episodesFetched.length != 0) {
        // const episodeStoreStartTime = Date.now();
        await storeEpisodes(show, seasonsStored, episodesFetched);
        console.info(`${show.id} ${show.title} Episodes stored`);
    }
}

async function fetchSeasons(show) {
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/seasons`, { agent: httpsAgent })
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status != 404) {
                    console.error(`- (Rate Limited) Failed fetching seasons for ${show.id} ${show.title}. Response status: ${res.status}. Refetching`);
                    numberOfFetchErrors++;
                    return fetchSeasons(show);
                }
                return [];
            }).catch(e => {
                console.error(`- (Errored out) Failed fetching seasons for ${show.id} ${show.title}.`);
                numberOfFetchErrors++;
                fetchSeasons(show)
            });;
    });
}

async function storeSeasons(show, seasons) {
    seasons = convertSeasonsToPrismaData(show, seasons);
    await prisma.season.createMany({
        data: seasons,
    });
    return await prisma.season.findMany({
        where: {
            showID: show.id,
        },
        orderBy: {
            number: "asc",
        }
    });
}

async function fetchEpisodes(show) {
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/episodes`, { agent: httpsAgent })
            .then(async res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status != 404) {
                    console.error(`- (Rate limited) Failed fetching episdoes for ${show.id} ${show.title}. Response status: ${res.status}. Refetching`);
                    numberOfFetchErrors++;
                    return fetchEpisodes(show);
                }
                return [];
            }).catch(e => {
                console.error(`- (Errored out) Failed fetching episdoes for ${show.id} ${show.title}. `);
                numberOfFetchErrors++;
                fetchEpisodes(show)
            });
    });
}

async function storeEpisodes(show, seasons, episodes) {
    episodes = await convertEpisodesToPrismaData(seasons, episodes).catch(e => {
        console.error(`Failed to convert ${show.title} to prisma data`);
    });
    return await prisma.episode.createMany({
        data: episodes,
    });
}

function convertSeasonsToPrismaData(show, seasons) {
    return seasons.map(season => {
        return {
            externalID: season.id,
            name: season.name,
            number: season.number,
            summary: season.summary,
            premierDate: new Date(season.premiereDate),
            endDate: new Date(season.endDate),
            image: season.image?.original,
            imageLowRes: season.image?.medium,
            showID: show.id,
        };
    });
}

async function convertEpisodesToPrismaData(seasons, episodes) {
    let seasonsGroupedByNumber = {};
    seasons.forEach(s => {
        seasonsGroupedByNumber[s.number] = s;
    });

    return episodes.map(e => {
        return {
            name: e.name,
            airDate: new Date(e.airdate),
            image: e.image?.original,
            imageLowRes: e.image?.medium,
            number: e.number,
            seasonNumber: e.season,
            rating: e.rating,
            runtime: e.runtime,
            summary: e.summary,
            type: e.type,
            externalID: e.id,
            seasonID: seasonsGroupedByNumber[e.season].id,
        }
    });
}

async function syncSeasonData() {
    const pageSize = 50;
    const numberOfPages = await getTotalPages(pageSize);
    for (let pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
        if (numberOfFetchErrors > 0) {
            await delay(3000);
            numberOfFetchErrors = 0;
        }
    }
}

async function syncSeasonAndEpisodes() {
    const pageSize = 100;
    const numberOfPages = await getTotalPages(pageSize);
    for (let pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
    }
}


function delay(ms) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
}

export default async function handler(req, res) {
    syncSeasonData();

    res.status(200).json({ message: "Done updating data" });
}