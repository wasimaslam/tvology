import throttle from "../../libs/utils/throttle";
import tq from "throttled-queue";
const evenQueue = new tq(1, 25);
import prisma from "../../../client/prismaClient";

async function getTVShowsPaginated(pageSize, pageNumber) {
    return await prisma.tVShow.findMany({
        take: pageSize,
        where: {
            seasons: { none: {} },
        },
        orderBy: {
            id: "asc",
        },

    });
}

async function getTotalPages(pageSize) {
    const totalTVShowCount = await prisma.tVShow.count({
        where: {
            seasons: { none: {} }
        }
    })

    return Math.ceil(totalTVShowCount / pageSize);
}

async function fetchAndStoreSeasonsForShow(show) {
    let seasons = [];
    try {
        seasons = await fetchSeasons(show);
    } catch (e) {
        console.error(e.message);
        return Promise.reject(e);
    }
    console.info(`${show.id} ${show.title} Seasons fetched`);
    await storeSeasons(show, seasons);
}

async function fetchSeasons(show) {
    return evenQueue(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/seasons`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status != 404) {
                    return fetchSeasons(show);
                }
                return [];
            });
    });
}

async function storeSeasons(show, seasons) {
    seasons = convertSeasonsToPrismaData(show, seasons);
    await prisma.season.createMany({
        data: seasons,
    });
    console.info(`${show.id} ${show.title} Seasons stored`)
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

async function syncSeasonData() {
    const pageSize = 250;
    const numberOfPages = await getTotalPages(pageSize);
    // let promisesBurst = [];
    for (let pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
        // promisesBurst.push(...tvShows.map(s => fetchAndStoreSeasonsForShow(s)))
        // if(pageNumber%4 == 0){
        //     await Promise.all(promisesBurst);
        //     promisesBurst = [];
        // }
    }
}

async function fetchForMissedShows() {
    let showWithoutSeasons = await prisma.tVShow.findMany({
        where: {
            seasons: { none: {} },
        },
    });
    for (let index = 0; index < showWithoutSeasons.length; index++) {
        fetchAndStoreSeasonsForShow(showWithoutSeasons[index]);
    }

}

export default async function handler(req, res) {
    await syncSeasonData();

    res.status(200).json({ message: "Done updating data" });
}