import throttle from "../../libs/utils/throttle";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient;

async function startFetchingFromID() {
    const firstShowWithoutSeason = (await prisma.tVShow.findFirst({
        where: {
            seasons: { none: {} },
        },
        orderBy: {
            id: 'asc'
        },
    }));

    if (firstShowWithoutSeason == null) {
        throw new Error("No tv shows in table.");
    }

    return firstShowWithoutSeason.id;
}

async function getTVShowsPaginated(pageSize, pageNumber) {
    let startFetchingFromID = 1;
    try {
        startPaginationFromID = await startFetchingFromID();
    } catch (e) {
        return [];
    }
    const cursorID = (pageSize * pageNumber) + startPaginationFromID;
    if (pageSize == 0) {
        return [];
    }

    return await prisma.tVShow.findMany({
        orderBy: {
            id: "asc",
        },
        take: pageSize,
        cursor: {
            id: cursorID,
        }
    });
}

async function getTotalPages(pageSize) {
    let startingID = 1;
    try {
        startingID = await startFetchingFromID();
    }
    catch (e) {
        return 0;
    }
    const totalTVShowCount = await prisma.tVShow.count({
        where: {
            id: {
                gt: startingID,
            }
        }
    });

    return Math.ceil(totalTVShowCount / pageSize);
}

async function fetchAndStoreSeasonsForShow(show) {
    return throttle(() => {
        return fetch(`https://api.tvmaze.com/shows/${show.externalID}/seasons`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else if (res.status == 429) {
                    throttle(() => fetchAndStoreSeasonsForShow(show));
                }

                throw new Error(`Couldn't fetch seasons for ID: ${show.id}, ExternalID: ${show.externalID}, Name: ${show.title}, httpStatus: ${res.status}`);
            });
    })
        .then((seasons) => {
            console.info(`${show.id} ${show.title} Seasons fetched`);
            seasons = convertSeasonsToPrismaData(show, seasons);
            prisma.season.createMany({
                data: seasons,
            }).then(() => console.info(`${show.id} ${show.title} Seasons stored`));
        })
        .catch((e) => {
            console.error(e.message);
        });
}

function convertSeasonsToPrismaData(show, seasons) {
    return seasons.map(season => {
        return {
            name: `Season ${season.number}`,
            summary: season.summary,
            premierDate: new Date(season.premiereDate),
            endDate: new Date(season.endDate),
            image: season.image?.original,
            imageLowRes: season.image?.medium,
            showID: show.id,
        };
    });
}

async function getNumberOfStoredTVShows() {
    return (await prisma.tVShow.count());
}

async function syncSeasonData() {
    const pageSize = 250;
    const numberOfPages = await getTotalPages(pageSize);
    for (let pageNumber = 0; pageNumber < numberOfPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreSeasonsForShow(s)));
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
    fetchForMissedShows();

    res.status(200).json({ message: "Done updating data" });
}