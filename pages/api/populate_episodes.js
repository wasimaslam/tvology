import tq from "throttled-queue";
const evenQueue = new tq(1, 25);
import prisma from "../../../client/prismaClient";


async function syncEpisodesData() {
    const pageSize = 250;
    const totalPages = await getTotalPages(pageSize);

    for (let pageNumber = 0; pageNumber < totalPages; pageNumber++) {
        const tvShows = await getTVShowsPaginated(pageSize, pageNumber);
        await Promise.all(tvShows.map(s => fetchAndStoreEpisodesForShow(s).catch((e) => {
            debugger;
            console.log("Error fetching or storing episodes");
        })));
    }
}

async function fetchAndStoreEpisodesForShow(show) {
    let episodes = await fetchEpisodes(show);
    console.info(`${show.id} ${show.title} Episodes fetched`);
    await storeEpisodes(episodes, show);
    console.info(`${show.id} ${show.title} Episodes stored`)
    return true;
}

async function fetchEpisodes(show) {
    return evenQueue(() => {
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

async function storeEpisodes(episodes, show) {
    episodes = await convertToPrismaData(episodes, show).catch(e => {
        console.log(`Failed to convert ${show.name} to prisma data`);
    });
    return await prisma.episode.createMany({
        data: episodes,
    });
}

async function convertToPrismaData(episodes, show) {
    let seasons = await prisma.season.findMany({
        where: {
            showID: show.id
        },
        orderBy: {
            number: "asc",
        }
    });
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

async function getTVShowsPaginated(pageSize, pageNumber) {
    const tvShows = await prisma.tVShow.findMany({
        take: pageSize,
        skip: (pageSize * pageNumber),
        orderBy: {
            id: "asc",
        },

    });
    return tvShows;
}

async function getTotalPages(pageSize) {
    const totalTVShowCount = await prisma.tVShow.count();

    return Math.ceil(totalTVShowCount / pageSize);
}

export default async function handler(req, res) {

    syncEpisodesData();

    res.status(200).json({ message: "Done updating data" });
}