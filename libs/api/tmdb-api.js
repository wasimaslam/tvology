const baseURL = "https://api.themoviedb.org/3";
const apiKey = "753c37ef2f0908507dca0d4f9299faa0"

export default {
    searchTVShowsByName(searchString) {
        return fetch(`${baseURL}/search/tv?query=${searchString}&api_key=${apiKey}`)
            .then(res => res.json());
    },

    getShowByID(showID) {
        return fetch(`${baseURL}/tv/${showID}?&api_key=${apiKey}`).then(res => res.json());
    },

    getSeasonByID(showID, seasonID) {
        return fetch(`${baseURL}/tv/${showID}/season/${seasonID}?&api_key=${apiKey}`).then(res => res.json());
    },

    getEpisodeByID(showID, seasonID, episodeID) {
        return fetch(`${baseURL}/tv/${showID}/season/${seasonID}/episode/${episodeID}?&api_key=${apiKey}`).then(res => res.json());
    },

    //TODO
    getUpcomingEpisodesForSeason(seaosnID) {

    },




}