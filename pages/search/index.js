import Head from 'next/head'
import { useState } from "react";
import Link from "next/link";

export default function Search() {

    const [searchString, setSearchString] = useState("");
    const [tvShows, setTVShows] = useState([]);

    async function fetchTVShows(searchString) {
        const { results } = await fetch(`https://api.themoviedb.org/3/search/tv?query=${searchString}&api_key=753c37ef2f0908507dca0d4f9299faa0`).then(res => res.json());
        setTVShows(results);
    }

    function handleEnterOnSearch() {
        if(searchString !== ""){
            fetchTVShows(searchString);
        }
    }

    return (
        <div>
            <Head>
                <title>Create Next App</title>
                <meta name="description" content="Search tv shows" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main>
                <input onChange={(event) => setSearchString(event.target.value)} onKeyPress={(e) => {e.key=="Enter"? handleEnterOnSearch() : ""}}/>
                <button onClick={() => fetchTVShows(searchString)}>Search</button>
                <div>
                    <ul>
                        {tvShows.map(show =>
                            <li key={show.id}>
                                <Link href={{ pathname: "show/[id]", query: { id: show.id } }}>
                                    <a>{show.name}</a>
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </main>

        </div>
    )
}
