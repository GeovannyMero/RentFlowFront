import { GetAparments } from "@/data/apartmentData";

export async function GetAppartment(userId: string) {
    try {
        var data = await GetAparments(userId)
        return data;
    } catch (error) {
        console.error(error);
    }
}