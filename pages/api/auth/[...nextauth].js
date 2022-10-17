import NextAuth from "next-auth"
import CredentialProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";
import prisma from "../../../client/prismaClient";

export const authOptions = {
    // Configure one or more authentication providers
    providers: [
        CredentialProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "abc@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                const user = await prisma.user.findFirst({
                    where: {
                        email: credentials.email,
                    },
                });
                if (user) {
                    const passwordMatched = await bcrypt.compare(credentials.password, user.password);
                    if (passwordMatched) {
                        return user;
                    }
                }
                return null;
            },
        }),
    ],
}
export default NextAuth(authOptions)