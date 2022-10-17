import Head from 'next/head'
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import Auth from "../../components/Auth";


export default function Search({ tvShowsQuery, searchStringQuery }) {

    const [searchString, setSearchString] = useState(searchStringQuery);
    const [tvShows, setTVShows] = useState(tvShowsQuery);
    const router = useRouter();



    async function handleSearch() {
        if (searchString !== "") {
            let shows = await fetchTVShows(searchString);
            setTVShows(shows);
            router.query.search = searchString;
            router.push(router, undefined, { shallow: true });
        }
    }

    return (
        <div>
            <Head>
                <title>Create Next App</title>
                <meta name="description" content="Search tv shows" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Auth>
                <h1>Waseem Aslam</h1>
            </Auth>
            <main className='flex flex-col items-center justify-center h-screen'>
                <div className='flex flex-col items-center justify-center my-2'>
                    <input className='border-2 border-black rounded block mb-2 w-60' onChange={(event) => setSearchString(event.target.value)} onKeyPress={(e) => { e.key == "Enter" ? handleSearch() : "" }} value={searchString} />
                    <button className='bg-red-200 border-2 border-black block w-40' onClick={() => handleSearch()}>Search</button>
                </div>
                <div >
                    <ul className='text-center'>
                        {tvShows.map(show =>
                            <li key={show.id}>
                                <Link href={{ pathname: "show/[id]", query: { id: show.id } }}>
                                    <a className='text-blue-800'>{show.title}</a>
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </main>

        </div>
    )
}

async function fetchTVShows(searchString) {
    // const { results } = await fetch(`https://api.themoviedb.org/3/search/tv?query=${searchString}&api_key=753c37ef2f0908507dca0d4f9299faa0`).then(res => res.json());
    const results = (await fetch(`http://localhost:3000/api/shows?q=${searchString}`).then(r => r.json())).data;
    return results;
}

export async function getServerSideProps({ query }) {
    let searchStringQuery = "";
    let tvShowsQuery = [];
    if (query.search) {
        searchStringQuery = query.search;
        tvShowsQuery = await fetchTVShows(query.search);
    }
    return { props: { tvShowsQuery, searchStringQuery } };
}
