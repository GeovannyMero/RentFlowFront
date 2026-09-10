import { GetContracts } from "@/data/contractData";

export async function GetContract(userId: string) {
    try {
        var data = await GetContracts(userId)
        return data;
    } catch (error) {
        console.error(error);
    }
}