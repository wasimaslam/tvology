import HttpError from "../../libs/errors/httpErrors/base";
import NotFoundError from "../../libs/errors/httpErrors/notFound";
import RateLimitError from "../../libs/errors/httpErrors/rateLimitError";
import prisma from "../../../client/prismaClient";
import tq from "throttled-queue";
const throttleFast = tq(1, 50);

async function fetchAndStoreFirstPage() {
    const pageToFetch = await getPageToFetch();
    const lastTvShowID = await getLastShowID();
    let tvShows = await fetchPage(pageToFetch);
    tvShows = tvShows.filter(s => s.id > lastTvShowID);
    await saveToDB(tvShows);
}

async function syncShowData() {
    const startFetchingFromPage = (await getPageToFetch()) + 1;
    const pagesToFetchInBurst = 30;

    try {
        await fetchAndStoreFirstPage();
    } catch (e) {
        return;
    }
    outerLoop:
    for (let page = startFetchingFromPage; true; page += pagesToFetchInBurst) {
        const allPromises = [];
        for (let index = 0; index < pagesToFetchInBurst; index++) {
            allPromises.push(fetchPage(page + index));
        }

        let results = await Promise.allSettled(allPromises);
        for (let index = 0; index < results.length; index++) {
            if (results[index].status == 'rejected') {
                break outerLoop;
            }
            saveToDB(results[index].value);
        }

    }
}

async function getLastShowID() {
    const lastShow = (await prisma.tVShow.findFirst({
        orderBy: {
            externalID: "desc"
        },
        select: {
            externalID: true,
        },
        take: 1,
    }));

    if (lastShow == null) {
        return 0;
    }

    return lastShow.externalID;
}

async function getPageToFetch() {
    const lastTvShowID = await getLastShowID();
    return Math.floor(lastTvShowID / 250);
}

async function fetchPage(page) {
    return throttleFast(() => {
        return fetch(`https://api.tvmaze.com/shows?page=${page}`,)
            .then((res) => {
                if (res.ok) {
                    console.info(`Page ${page} fetched.`);
                    return res.json();
                }
                else if (res.status == 404) {
                    return Promise.reject(new NotFoundError(`Reached end of show index. Last show ${page}`));
                } else if (res.status == 429) {
                    return Promise.reject(new RateLimitError("Api rate limit triggered"));
                }
                return Promise.reject(new HttpError(`Network error ${res.status} for page ${page}`, res.status));
            });
    }).catch((e) => {
        if (e instanceof HttpError) {
            if (e.code == 404) {
                return Promise.reject(new HttpError("Unhandleable error", e.code));
            }
        }
        return fetchPage(page);
    });
}

function convertShowsToPrismaData(tvShows) {
    return tvShows
        .map(s => {
            return {
                title: s.name,
                externalID: s.id,
                externalIDs: s.externals,
                averageRuntime: s.averageRuntime,
                image: s.image?.original,
                imageLowRes: s.image?.medium,
                averageRating: s.rating?.average,
                schedule: s.schedule
            }
        });
}

async function saveToDB(tvShows) {
    tvShows = convertShowsToPrismaData(tvShows);
    await prisma.tVShow.createMany({ data: tvShows, });
}

export default async function handler(req, res) {

    await syncShowData();

    res.status(200).json({ message: "Done updating data" });
}