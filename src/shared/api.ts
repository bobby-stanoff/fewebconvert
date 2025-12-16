import { UploadResponse, backendURL, CreateJobRequest, JobResponse } from "./types";
export async function uploadFile(f : File) : Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file',f);

    const response = await fetch(backendURL + "/api/upload",{
        method: "POST",
        body: formData
    });
    if(!response.ok){
        throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response.json();

}

export async function createJob(j : CreateJobRequest) : Promise<JobResponse>{
    const response = await fetch(backendURL + "/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(j)
    })
    if(response.status !== 202){
        console.error(response.statusText)
    }
    return response.json()
}