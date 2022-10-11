import { PrismaClient } from "@prisma/client";
import tq from "throttled-queue";
const throttle = new tq(1, 25);
const prisma = new PrismaClient;

async function getTVShowsPaginated(pageSize, pageNumber) {
    return await prisma.tVShow.findMany({
        take: pageSize,
        where: {
            seasons: {none: {}},
        },
        orderBy: {
            id: "asc",
        },

    });
}

async function getTotalPages(pageSize) {
    const totalTVShowCount = await prisma.tVShow.count({
        where: {
            seasons: {none: {}}
        }
    })

    return Math.ceil(totalTVShowCount / pageSize);
}

async function fetchAndStoreSeasonsForShow(show) {
    const seasonFetchTimeStart = Date.now();
    const seasonsFetched = await fetchSeasons(show);
    console.info(`${show.id} ${show.title} Seasons fetched in ${Date.now() - seasonFetchTimeStart}`);

    const seasonStoreTimeStart = Date.now();
    const seasonsStored = await storeSeasons(show, seasonsFetched);
    console.info(`${show.id} ${show.title} Seasons stored in ${Date.now() - seasonStoreTimeStart}`);

    const episdoeFetchStartTime = Date.now();
    const episodesFetched = await fetchEpisodes(show);
    console.info(`${show.id} ${show.title} Episodes fetched in ${Date.now() - episdoeFetchStartTime}`);

    const episodeStoreStartTime = Date.now();
    await storeEpisodes(show, seasonsStored, episodesFetched);
    console.info(`${show.id} ${show.title} Episodes stored in ${Date.now() - episodeStoreStartTime}`);
}

async function fetchSeasons(show) {
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/seasons`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status != 404) {
                    return fetchSeasons(show);
                }
                return [];
            }).catch(e => fetchSeasons(show));;
    });
}

async function storeSeasons(show, seasons)
{
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
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/episodes`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status != 404) {
                    return fetchEpisodes(show);
                }
                return [];
            }).catch(e => fetchEpisodes(show));
    });
}

async function storeEpisodes(show, seasons, episodes) {
    episodes = await convertEpisodesToPrismaData(seasons, episodes).catch(e => {
        console.log(`Failed to convert ${show.name} to prisma data`);
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

async function convertEpisodesToPrismaData(seasons, episodes){
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
    const pageSize = 250;
    const numberOfPages = await getTotalPages(pageSize);
    for (let pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
    }
}

export default async function handler(req, res) {
    await syncSeasonData();

    res.status(200).json({ message: "Done updating data" });
}