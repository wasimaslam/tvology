import { useSession } from "next-auth/react"
export default function Auth({ children }) {
    const { data: session } = useSession();
    return (
        session ? children : <></>
    );
}