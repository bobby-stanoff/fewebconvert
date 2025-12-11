import { UploadResponse, backendURL } from "./types";
export async function uploadFile(f : File) : Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file',f);

    const response = await fetch(backendURL + "/filesjei",{
        method: "POST",
        body: formData
    });
    if(!response.ok){
        throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response.json();

}